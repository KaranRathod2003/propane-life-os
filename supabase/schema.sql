-- ============================================================================
-- LifeOS — Supabase schema
-- Paste this whole file into the Supabase SQL Editor and run it.
-- Safe to re-run: uses "if not exists" / "drop policy if exists" guards and
-- idempotent migration blocks that preserve existing data.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- EXPENSES v2 — accounts (persistent balances) + salary cycles + ledger
-- ---------------------------------------------------------------------------

-- Bank accounts. Each holds a PERSISTENT running balance that never auto-resets
-- (current balance = opening_balance + all inflows - all outflows, all-time).
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  kind text not null default 'main' check (kind in ('main', 'savings')),
  -- anchor so the running balance lands on the user's real bank number
  opening_balance numeric(12, 2) not null default 0,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Salary cycles: a resettable planning period. A new one starts when the user
-- credits salary (date isn't fixed). Buckets + saving target are per-cycle;
-- the account balance carries over across cycles.
create table if not exists public.cycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null default '',
  started_on date not null default current_date,
  salary_amount numeric(12, 2) not null default 0,
  saving_target numeric(12, 2) not null default 0,
  is_current boolean not null default true,
  created_at timestamptz not null default now()
);

-- Legacy table from v1 (kept so the migration below can read it). New code
-- uses `cycles` instead. Safe to leave in place.
create table if not exists public.monthly_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  month date not null,
  opening_balance numeric(12, 2) not null default 0,
  saving_target numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, month)
);

-- v1 → v1.1: some databases still have the older "income" column name.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'monthly_budgets'
      and column_name = 'income'
  ) then
    alter table public.monthly_budgets rename column income to opening_balance;
  end if;
end $$;

-- Plan buckets. Now scoped to a cycle (cycle_id); `month` kept for the migration.
create table if not exists public.budget_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  planned_amount numeric(12, 2) not null default 0,
  type text not null default 'flexible' check (type in ('fixed', 'planned', 'flexible')),
  month date,
  cycle_id uuid references public.cycles (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.budget_categories
  add column if not exists cycle_id uuid references public.cycles (id) on delete cascade;
alter table public.budget_categories alter column month drop not null;

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount numeric(12, 2) not null,
  account_id uuid references public.accounts (id) on delete cascade,
  cycle_id uuid references public.cycles (id) on delete set null,
  category_id uuid references public.budget_categories (id) on delete set null,
  -- free-text label for analytics (expense: where; income: source, e.g. Salary)
  tag text,
  -- pairs the two legs of a transfer (transfer_out + transfer_in)
  transfer_id uuid,
  note text,
  type text not null default 'expense',
  date date not null default current_date,
  created_at timestamptz not null default now()
);
alter table public.transactions add column if not exists account_id uuid references public.accounts (id) on delete cascade;
alter table public.transactions add column if not exists cycle_id uuid references public.cycles (id) on delete set null;
alter table public.transactions add column if not exists tag text;
alter table public.transactions add column if not exists transfer_id uuid;

-- Widen the type check to allow transfer legs.
alter table public.transactions drop constraint if exists transactions_type_check;
alter table public.transactions add constraint transactions_type_check
  check (type in ('expense', 'income', 'lent', 'borrowed_repayment', 'transfer_out', 'transfer_in'));

-- ---------------------------------------------------------------------------
-- HABITS
-- ---------------------------------------------------------------------------

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  icon text not null default 'sparkles',
  target_days_per_week int not null default 7 check (target_days_per_week between 1 and 7),
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  habit_id uuid not null references public.habits (id) on delete cascade,
  date date not null,
  completed boolean not null default true,
  created_at timestamptz not null default now(),
  unique (habit_id, date)
);

-- ---------------------------------------------------------------------------
-- JOURNAL
-- ---------------------------------------------------------------------------

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  content text not null default '',
  tags text[] not null default '{}',
  entry_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text not null default '',
  status text not null default 'active' check (status in ('active', 'done')),
  progress int not null default 0 check (progress between 0 and 100),
  target_date date,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- MIGRATION: move v1 (month-based) data into v2 (accounts + cycles)
-- Idempotent — only fills gaps, never overwrites or deletes.
-- ---------------------------------------------------------------------------

do $$
declare
  u uuid;
  main_id uuid;
  sav_id uuid;
  latest_ob numeric;
  cyc record;
begin
  for u in (
    select user_id from public.monthly_budgets
    union
    select user_id from public.transactions
    union
    select user_id from public.budget_categories
  ) loop
    -- Ensure a Main account. Anchor it to the latest month's opening balance so
    -- the running balance matches the real bank number after migration.
    select id into main_id from public.accounts where user_id = u and kind = 'main' limit 1;
    if main_id is null then
      select opening_balance into latest_ob
        from public.monthly_budgets where user_id = u order by month desc limit 1;
      insert into public.accounts (user_id, name, kind, opening_balance, sort_order)
        values (u, 'Main', 'main', coalesce(latest_ob, 0), 1)
        returning id into main_id;
    end if;

    -- Ensure a Savings account.
    select id into sav_id from public.accounts where user_id = u and kind = 'savings' limit 1;
    if sav_id is null then
      insert into public.accounts (user_id, name, kind, opening_balance, sort_order)
        values (u, 'Savings', 'savings', 0, 2)
        returning id into sav_id;
    end if;

    -- One cycle per historical month (if not already created).
    for cyc in (select * from public.monthly_budgets where user_id = u order by month) loop
      if not exists (
        select 1 from public.cycles where user_id = u and started_on = cyc.month
      ) then
        insert into public.cycles (user_id, label, started_on, salary_amount, saving_target, is_current)
          values (u, to_char(cyc.month, 'Mon YYYY'), cyc.month, 0, cyc.saving_target, false);
      end if;
    end loop;

    -- If the user had no monthly_budgets at all, make sure at least one current cycle exists.
    if not exists (select 1 from public.cycles where user_id = u) then
      insert into public.cycles (user_id, label, started_on, is_current)
        values (u, to_char(current_date, 'Mon YYYY'), current_date, true);
    end if;

    -- Exactly one cycle is current: the most recent.
    update public.cycles set is_current = false where user_id = u;
    update public.cycles set is_current = true
      where id = (select id from public.cycles where user_id = u order by started_on desc limit 1);

    -- Link buckets to their month's cycle.
    update public.budget_categories bc set cycle_id = c.id
      from public.cycles c
      where bc.user_id = u and bc.cycle_id is null
        and c.user_id = u and c.started_on = bc.month;

    -- Attach loose transactions to the Main account + their month's cycle.
    update public.transactions t set account_id = main_id
      where t.user_id = u and t.account_id is null;
    update public.transactions t set cycle_id = c.id
      from public.cycles c
      where t.user_id = u and t.cycle_id is null
        and c.user_id = u and date_trunc('month', t.date)::date = c.started_on;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------------------------

create index if not exists idx_accounts_user on public.accounts (user_id);
create index if not exists idx_cycles_user_current on public.cycles (user_id, is_current);
create index if not exists idx_budget_categories_cycle on public.budget_categories (user_id, cycle_id);
create index if not exists idx_transactions_user_date on public.transactions (user_id, date);
create index if not exists idx_transactions_cycle on public.transactions (cycle_id);
create index if not exists idx_transactions_account on public.transactions (account_id);
create index if not exists idx_transactions_category on public.transactions (category_id);
create index if not exists idx_habit_logs_user_date on public.habit_logs (user_id, date);
create index if not exists idx_habit_logs_habit on public.habit_logs (habit_id);
create index if not exists idx_journal_entries_user_date on public.journal_entries (user_id, entry_date);
create index if not exists idx_goals_user on public.goals (user_id);

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY — every table: RLS on + a single "owner can do all" policy
-- ---------------------------------------------------------------------------

alter table public.accounts          enable row level security;
alter table public.cycles            enable row level security;
alter table public.monthly_budgets   enable row level security;
alter table public.budget_categories enable row level security;
alter table public.transactions      enable row level security;
alter table public.habits            enable row level security;
alter table public.habit_logs        enable row level security;
alter table public.journal_entries   enable row level security;
alter table public.goals             enable row level security;

do $$
declare
  t text;
  tables text[] := array[
    'accounts', 'cycles', 'monthly_budgets', 'budget_categories', 'transactions',
    'habits', 'habit_logs', 'journal_entries', 'goals'
  ];
begin
  foreach t in array tables loop
    execute format('drop policy if exists "owner_all" on public.%I;', t);
    execute format(
      'create policy "owner_all" on public.%I
         for all
         using (auth.uid() = user_id)
         with check (auth.uid() = user_id);',
      t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- SEED: on first sign-in — default habits + Main/Savings accounts + a cycle
-- ---------------------------------------------------------------------------

create or replace function public.seed_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.habits (user_id, name, icon, target_days_per_week, sort_order)
  values
    (new.id, 'Wake up early', 'sunrise', 7, 1),
    (new.id, 'Morning jog / exercise', 'activity', 6, 2),
    (new.id, 'Eat clean', 'salad', 7, 3),
    (new.id, 'Read (Atomic Habits)', 'book-open', 7, 4),
    (new.id, 'No PMO', 'shield', 7, 5),
    (new.id, 'Talk to someone new', 'messages-square', 5, 6),
    (new.id, 'Less consuming, more action', 'rocket', 7, 7);

  insert into public.accounts (user_id, name, kind, opening_balance, sort_order)
  values
    (new.id, 'Main', 'main', 0, 1),
    (new.id, 'Savings', 'savings', 0, 2);

  insert into public.cycles (user_id, label, started_on, is_current)
  values (new.id, to_char(current_date, 'Mon YYYY'), current_date, true);

  return new;
end $$;

-- Replace the old trigger/function name if present.
drop trigger if exists on_auth_user_created_seed_habits on auth.users;
drop trigger if exists on_auth_user_created_seed on auth.users;
drop function if exists public.seed_default_habits();
create trigger on_auth_user_created_seed
  after insert on auth.users
  for each row execute function public.seed_new_user();
