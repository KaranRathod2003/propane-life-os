-- ============================================================================
-- LifeOS — Supabase schema
-- Paste this whole file into the Supabase SQL Editor and run it.
-- Safe to re-run: uses "if not exists" / "drop policy if exists" guards.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- EXPENSES
-- ---------------------------------------------------------------------------

create table if not exists public.monthly_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- always stored as the first day of the month (e.g. 2026-06-01)
  month date not null,
  -- real bank balance right after salary credit — the ledger's anchor
  opening_balance numeric(12, 2) not null default 0,
  saving_target numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, month)
);

-- Migration: earlier versions called this column "income". Rename in place so
-- re-running this file upgrades an existing database without losing data.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'monthly_budgets'
      and column_name = 'income'
  ) then
    alter table public.monthly_budgets rename column income to opening_balance;
  end if;
end $$;

create table if not exists public.budget_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  planned_amount numeric(12, 2) not null default 0,
  -- 'fixed'   -> unavoidable commitments (EMI, rail pass)
  -- 'planned' -> expected but variable (petrol, rickshaw)
  -- 'flexible'-> discretionary (food, misc)
  type text not null check (type in ('fixed', 'planned', 'flexible')),
  month date not null,
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount numeric(12, 2) not null,
  category_id uuid references public.budget_categories (id) on delete set null,
  note text,
  type text not null default 'expense'
    check (type in ('expense', 'income', 'lent', 'borrowed_repayment')),
  date date not null default current_date,
  created_at timestamptz not null default now()
);

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
-- INDEXES
-- ---------------------------------------------------------------------------

create index if not exists idx_budget_categories_user_month on public.budget_categories (user_id, month);
create index if not exists idx_transactions_user_date on public.transactions (user_id, date);
create index if not exists idx_transactions_category on public.transactions (category_id);
create index if not exists idx_habit_logs_user_date on public.habit_logs (user_id, date);
create index if not exists idx_habit_logs_habit on public.habit_logs (habit_id);
create index if not exists idx_journal_entries_user_date on public.journal_entries (user_id, entry_date);
create index if not exists idx_goals_user on public.goals (user_id);

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- Every table: enable RLS + a single "owner can do everything" policy.
-- ---------------------------------------------------------------------------

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
    'monthly_budgets', 'budget_categories', 'transactions',
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
-- SEED: default habits on first sign-in (runs once per new user)
-- ---------------------------------------------------------------------------

create or replace function public.seed_default_habits()
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
  return new;
end $$;

drop trigger if exists on_auth_user_created_seed_habits on auth.users;
create trigger on_auth_user_created_seed_habits
  after insert on auth.users
  for each row execute function public.seed_default_habits();
