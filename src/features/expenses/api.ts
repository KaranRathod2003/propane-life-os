import { supabase } from "@/lib/supabase";
import { todayISO } from "@/lib/date";
import type {
  Account,
  BudgetCategory,
  Cycle,
  NewBudgetCategory,
  NewTransaction,
  Transaction,
} from "@/types";

async function uid(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not authenticated");
  return data.user.id;
}

// ---------------------------------------------------------------------------
// ACCOUNTS
// ---------------------------------------------------------------------------

export async function fetchAccounts(): Promise<Account[]> {
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** Set opening_balance directly (caller computes it so the running balance lands right). */
export async function updateAccountOpening(
  id: string,
  opening_balance: number
): Promise<void> {
  const { error } = await supabase
    .from("accounts")
    .update({ opening_balance })
    .eq("id", id);
  if (error) throw error;
}

/** Make sure the user has a Main + Savings account (self-heal for older data). */
export async function ensureAccounts(): Promise<Account[]> {
  const existing = await fetchAccounts();
  const user_id = await uid();
  const toAdd: { user_id: string; name: string; kind: string; sort_order: number }[] = [];
  if (!existing.some((a) => a.kind === "main"))
    toAdd.push({ user_id, name: "Main", kind: "main", sort_order: 1 });
  if (!existing.some((a) => a.kind === "savings"))
    toAdd.push({ user_id, name: "Savings", kind: "savings", sort_order: 2 });
  if (toAdd.length) {
    await supabase.from("accounts").insert(toAdd);
    return fetchAccounts();
  }
  return existing;
}

// ---------------------------------------------------------------------------
// CYCLES
// ---------------------------------------------------------------------------

export async function fetchCycles(): Promise<Cycle[]> {
  const { data, error } = await supabase
    .from("cycles")
    .select("*")
    .order("started_on", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Guarantee a current cycle exists; returns the current one. */
export async function ensureCurrentCycle(): Promise<Cycle> {
  const cycles = await fetchCycles();
  const current = cycles.find((c) => c.is_current);
  if (current) return current;
  const user_id = await uid();
  const started_on = todayISO();
  const { data, error } = await supabase
    .from("cycles")
    .insert({ user_id, label: cycleLabel(started_on), started_on, is_current: true })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCycle(
  id: string,
  patch: Partial<Pick<Cycle, "salary_amount" | "saving_target" | "label">>
): Promise<void> {
  const { error } = await supabase.from("cycles").update(patch).eq("id", id);
  if (error) throw error;
}

/**
 * Start a fresh salary cycle: demote the old current cycle, create a new one,
 * credit the salary to the Main account, and carry the plan buckets over
 * (estimates copied, spending resets because it's a new cycle).
 */
export async function startSalaryCycle(params: {
  mainAccountId: string;
  salaryAmount: number;
  savingTarget: number;
  carryBucketsFromCycleId: string | null;
}): Promise<Cycle> {
  const user_id = await uid();
  const started_on = todayISO();

  await supabase
    .from("cycles")
    .update({ is_current: false })
    .eq("user_id", user_id)
    .eq("is_current", true);

  const { data: cycle, error } = await supabase
    .from("cycles")
    .insert({
      user_id,
      label: cycleLabel(started_on),
      started_on,
      salary_amount: params.salaryAmount,
      saving_target: params.savingTarget,
      is_current: true,
    })
    .select()
    .single();
  if (error) throw error;

  if (params.salaryAmount > 0) {
    await supabase.from("transactions").insert({
      user_id,
      amount: params.salaryAmount,
      account_id: params.mainAccountId,
      cycle_id: cycle.id,
      type: "income",
      tag: "Salary",
      date: started_on,
    });
  }

  if (params.carryBucketsFromCycleId) {
    const { data: prev } = await supabase
      .from("budget_categories")
      .select("*")
      .eq("cycle_id", params.carryBucketsFromCycleId);
    if (prev && prev.length) {
      await supabase.from("budget_categories").insert(
        prev.map((c) => ({
          user_id,
          name: c.name,
          planned_amount: c.planned_amount,
          type: c.type,
          cycle_id: cycle.id,
        }))
      );
    }
  }

  return cycle;
}

function cycleLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleString("en-IN", { month: "short", year: "numeric" });
}

// ---------------------------------------------------------------------------
// PLAN BUCKETS (categories)
// ---------------------------------------------------------------------------

export async function fetchCategories(): Promise<BudgetCategory[]> {
  const { data, error } = await supabase
    .from("budget_categories")
    .select("*")
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
  patch: Partial<Pick<BudgetCategory, "name" | "planned_amount">>
): Promise<void> {
  const { error } = await supabase
    .from("budget_categories")
    .update(patch)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from("budget_categories").delete().eq("id", id);
  if (error) throw error;
}

/** Seed sample buckets into a cycle (quick start for an empty setup). */
export async function seedStarterBuckets(cycleId: string): Promise<void> {
  const user_id = await uid();
  const defaults = [
    { name: "Food", planned_amount: 6000 },
    { name: "Rickshaw / commute", planned_amount: 1500 },
    { name: "Rail pass", planned_amount: 530 },
    { name: "Medical", planned_amount: 1000 },
    { name: "Treats / outings", planned_amount: 2000 },
    { name: "Misc", planned_amount: 2000 },
  ];
  await supabase.from("budget_categories").insert(
    defaults.map((d) => ({
      ...d,
      type: "flexible",
      cycle_id: cycleId,
      user_id,
    }))
  );
}

// ---------------------------------------------------------------------------
// TRANSACTIONS
// ---------------------------------------------------------------------------

/** All of the user's transactions, all-time (powers balances, cycle view, analytics). */
export async function fetchTransactions(): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
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
  // If this is one leg of a transfer, remove both legs together.
  const { data } = await supabase
    .from("transactions")
    .select("transfer_id")
    .eq("id", id)
    .maybeSingle();
  if (data?.transfer_id) {
    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("transfer_id", data.transfer_id);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw error;
}

/** Move money between two accounts as a paired transfer. */
export async function createTransfer(params: {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: string;
  note: string | null;
}): Promise<void> {
  const user_id = await uid();
  const transfer_id = crypto.randomUUID();
  const base = {
    user_id,
    amount: params.amount,
    transfer_id,
    date: params.date,
    note: params.note,
  };
  const { error } = await supabase.from("transactions").insert([
    { ...base, account_id: params.fromAccountId, type: "transfer_out" },
    { ...base, account_id: params.toAccountId, type: "transfer_in" },
  ]);
  if (error) throw error;
}
