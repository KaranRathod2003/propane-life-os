// Shared domain models. These mirror the Supabase tables in supabase/schema.sql.

export type CategoryType = "fixed" | "planned" | "flexible";

export type TransactionType =
  | "expense"
  | "income"
  | "lent"
  | "borrowed_repayment"
  | "transfer_out"
  | "transfer_in";

export type AccountKind = "main" | "savings";

export type GoalStatus = "active" | "done";

/** A bank account with a persistent running balance (never auto-resets). */
export interface Account {
  id: string;
  user_id: string;
  name: string;
  kind: AccountKind;
  /** Anchor so the running balance matches the real bank number. */
  opening_balance: number;
  sort_order: number;
  created_at: string;
}

/** A salary cycle — a resettable planning period. Started when salary lands. */
export interface Cycle {
  id: string;
  user_id: string;
  label: string;
  /** ISO date the cycle began, e.g. "2026-07-05". */
  started_on: string;
  salary_amount: number;
  saving_target: number;
  is_current: boolean;
  created_at: string;
}

export interface BudgetCategory {
  id: string;
  user_id: string;
  name: string;
  planned_amount: number;
  type: CategoryType;
  /** Legacy v1 field; new rows use cycle_id. */
  month: string | null;
  cycle_id: string | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  account_id: string | null;
  cycle_id: string | null;
  category_id: string | null;
  /** Free-text label for analytics (expense: where; income: source). */
  tag: string | null;
  /** Pairs the two legs of a transfer. */
  transfer_id: string | null;
  note: string | null;
  type: TransactionType;
  /** ISO date string e.g. "2026-07-05". */
  date: string;
  created_at: string;
}

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  target_days_per_week: number;
  active: boolean;
  sort_order: number;
  created_at: string;
}

export interface HabitLog {
  id: string;
  user_id: string;
  habit_id: string;
  date: string;
  completed: boolean;
  created_at: string;
}

export interface JournalEntry {
  id: string;
  user_id: string;
  title: string;
  content: string;
  tags: string[];
  entry_date: string;
  created_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string;
  status: GoalStatus;
  progress: number;
  target_date: string | null;
  created_at: string;
}

// Insert payloads (server fills id/created_at; we add user_id in the API layer).
export type NewTransaction = Pick<
  Transaction,
  "amount" | "account_id" | "category_id" | "note" | "type" | "date"
> & {
  cycle_id?: string | null;
  tag?: string | null;
};
export type NewBudgetCategory = Pick<
  BudgetCategory,
  "name" | "planned_amount" | "type"
> & {
  cycle_id: string | null;
};
export type NewJournalEntry = Pick<
  JournalEntry,
  "title" | "content" | "tags" | "entry_date"
>;
export type NewGoal = Pick<
  Goal,
  "title" | "description" | "status" | "progress" | "target_date"
>;
