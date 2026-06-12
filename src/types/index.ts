// Shared domain models. These mirror the Supabase tables in supabase/schema.sql.

export type CategoryType = "fixed" | "planned" | "flexible";

export type TransactionType =
  | "expense"
  | "income"
  | "lent"
  | "borrowed_repayment";

export type GoalStatus = "active" | "done";

export interface MonthlyBudget {
  id: string;
  user_id: string;
  /** First day of the month, ISO date string e.g. "2026-06-01". */
  month: string;
  /** Real bank balance right after salary credit — the ledger's anchor. */
  opening_balance: number;
  saving_target: number;
  created_at: string;
}

export interface BudgetCategory {
  id: string;
  user_id: string;
  name: string;
  planned_amount: number;
  type: CategoryType;
  month: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  category_id: string | null;
  note: string | null;
  type: TransactionType;
  /** ISO date string e.g. "2026-06-11". */
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
  "amount" | "category_id" | "note" | "type" | "date"
>;
export type NewBudgetCategory = Pick<
  BudgetCategory,
  "name" | "planned_amount" | "type" | "month"
>;
export type NewJournalEntry = Pick<
  JournalEntry,
  "title" | "content" | "tags" | "entry_date"
>;
export type NewGoal = Pick<
  Goal,
  "title" | "description" | "status" | "progress" | "target_date"
>;
