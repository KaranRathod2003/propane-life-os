import { supabase } from "@/lib/supabase";

/**
 * Accounts allowed to wipe everything and start fresh, read from
 * VITE_OWNER_EMAILS (comma-separated). Kept out of source so the personal
 * email isn't committed. NOTE: VITE_ vars are inlined into the browser bundle,
 * so this gate is cosmetic — RLS already limits every user to their own rows.
 */
export const OWNER_EMAILS = (import.meta.env.VITE_OWNER_EMAILS ?? "")
  .split(",")
  .map((e: string) => e.trim().toLowerCase())
  .filter(Boolean);

export function isOwner(email: string | null | undefined): boolean {
  return OWNER_EMAILS.includes((email ?? "").toLowerCase());
}

// Mirrors the DB trigger seed so a reset looks like a fresh signup.
const DEFAULT_HABITS = [
  { name: "Wake up early", icon: "sunrise", target_days_per_week: 7, sort_order: 1 },
  { name: "Morning jog / exercise", icon: "activity", target_days_per_week: 6, sort_order: 2 },
  { name: "Eat clean", icon: "salad", target_days_per_week: 7, sort_order: 3 },
  { name: "Read (Atomic Habits)", icon: "book-open", target_days_per_week: 7, sort_order: 4 },
  { name: "No PMO", icon: "shield", target_days_per_week: 7, sort_order: 5 },
  { name: "Talk to someone new", icon: "messages-square", target_days_per_week: 5, sort_order: 6 },
  { name: "Less consuming, more action", icon: "rocket", target_days_per_week: 7, sort_order: 7 },
];

/**
 * Deletes every row this user owns across all modules, then re-seeds the
 * starter habits — leaving the account exactly like a brand-new signup.
 * Guarded to the owner account; RLS also restricts deletes to own rows.
 */
export async function clearAllData(): Promise<void> {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) throw new Error("Not authenticated");
  if (!isOwner(user.email)) throw new Error("This account can't reset data.");

  // Children before parents to respect foreign keys.
  const tables = [
    "habit_logs",
    "habits",
    "transactions",
    "budget_categories",
    "monthly_budgets",
    "journal_entries",
    "goals",
  ];
  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq("user_id", user.id);
    if (error) throw error;
  }

  const { error } = await supabase
    .from("habits")
    .insert(DEFAULT_HABITS.map((h) => ({ ...h, user_id: user.id })));
  if (error) throw error;
}
