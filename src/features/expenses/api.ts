import { supabase } from "@/lib/supabase";
import { monthBounds } from "@/lib/date";
import type {
  BudgetCategory,
  MonthlyBudget,
  NewBudgetCategory,
  NewTransaction,
  Transaction,
} from "@/types";

async function uid(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not authenticated");
  return data.user.id;
}

export async function fetchBudget(month: string): Promise<MonthlyBudget | null> {
  const { data, error } = await supabase
    .from("monthly_budgets")
    .select("*")
    .eq("month", month)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertBudget(
  month: string,
  opening_balance: number,
  saving_target: number
): Promise<MonthlyBudget> {
  const user_id = await uid();
  const { data, error } = await supabase
    .from("monthly_budgets")
    .upsert(
      { user_id, month, opening_balance, saving_target },
      { onConflict: "user_id,month" }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchCategories(month: string): Promise<BudgetCategory[]> {
  const { data, error } = await supabase
    .from("budget_categories")
    .select("*")
    .eq("month", month)
    .order("type", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createCategory(
  payload: NewBudgetCategory
): Promise<BudgetCategory> {
  const user_id = await uid();
  const { data, error } = await supabase
    .from("budget_categories")
    .insert({ ...payload, user_id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCategory(
  id: string,
  patch: Partial<NewBudgetCategory>
): Promise<BudgetCategory> {
  const { data, error } = await supabase
    .from("budget_categories")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase
    .from("budget_categories")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function fetchTransactions(month: string): Promise<Transaction[]> {
  const { start, end } = monthBounds(month);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .gte("date", fmt(start))
    .lte("date", fmt(end))
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createTransaction(
  payload: NewTransaction
): Promise<Transaction> {
  const user_id = await uid();
  const { data, error } = await supabase
    .from("transactions")
    .insert({ ...payload, user_id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw error;
}

/** Seed a sample setup (opening balance + plan buckets) for an empty month. */
export async function seedDefaultBudget(month: string): Promise<void> {
  const user_id = await uid();
  await supabase.from("monthly_budgets").upsert(
    { user_id, month, opening_balance: 35000, saving_target: 5000 },
    { onConflict: "user_id,month" }
  );
  const defaults: NewBudgetCategory[] = [
    { name: "Food", planned_amount: 6000, type: "flexible", month },
    { name: "Rickshaw / commute", planned_amount: 1500, type: "flexible", month },
    { name: "Rail pass", planned_amount: 530, type: "flexible", month },
    { name: "Medical", planned_amount: 1000, type: "flexible", month },
    { name: "Treats / outings", planned_amount: 2000, type: "flexible", month },
    { name: "Misc", planned_amount: 2000, type: "flexible", month },
  ];
  await supabase
    .from("budget_categories")
    .insert(defaults.map((c) => ({ ...c, user_id })));
}
