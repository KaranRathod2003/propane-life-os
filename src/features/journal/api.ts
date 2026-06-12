import { supabase } from "@/lib/supabase";
import type {
  Goal,
  JournalEntry,
  NewGoal,
  NewJournalEntry,
} from "@/types";

async function uid(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not authenticated");
  return data.user.id;
}

// --- Journal entries ---

export async function fetchEntries(): Promise<JournalEntry[]> {
  const { data, error } = await supabase
    .from("journal_entries")
    .select("*")
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createEntry(
  payload: NewJournalEntry
): Promise<JournalEntry> {
  const user_id = await uid();
  const { data, error } = await supabase
    .from("journal_entries")
    .insert({ ...payload, user_id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateEntry(
  id: string,
  patch: Partial<NewJournalEntry>
): Promise<JournalEntry> {
  const { data, error } = await supabase
    .from("journal_entries")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteEntry(id: string): Promise<void> {
  const { error } = await supabase
    .from("journal_entries")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// --- Goals ---

export async function fetchGoals(): Promise<Goal[]> {
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .order("status", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createGoal(payload: NewGoal): Promise<Goal> {
  const user_id = await uid();
  const { data, error } = await supabase
    .from("goals")
    .insert({ ...payload, user_id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateGoal(
  id: string,
  patch: Partial<NewGoal>
): Promise<Goal> {
  const { data, error } = await supabase
    .from("goals")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteGoal(id: string): Promise<void> {
  const { error } = await supabase.from("goals").delete().eq("id", id);
  if (error) throw error;
}
