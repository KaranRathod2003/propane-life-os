import { supabase } from "@/lib/supabase";
import type { Habit, HabitLog } from "@/types";

async function uid(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not authenticated");
  return data.user.id;
}

export async function fetchHabits(): Promise<Habit[]> {
  const { data, error } = await supabase
    .from("habits")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchHabitLogs(
  start: string,
  end: string
): Promise<HabitLog[]> {
  const { data, error } = await supabase
    .from("habit_logs")
    .select("*")
    .gte("date", start)
    .lte("date", end);
  if (error) throw error;
  return data ?? [];
}

export async function setHabitLog(
  habit_id: string,
  date: string,
  completed: boolean
): Promise<HabitLog> {
  const user_id = await uid();
  const { data, error } = await supabase
    .from("habit_logs")
    .upsert(
      { user_id, habit_id, date, completed },
      { onConflict: "habit_id,date" }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createHabit(
  name: string,
  icon: string,
  target_days_per_week: number
): Promise<Habit> {
  const user_id = await uid();
  const { data, error } = await supabase
    .from("habits")
    .insert({ user_id, name, icon, target_days_per_week })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function archiveHabit(id: string): Promise<void> {
  const { error } = await supabase
    .from("habits")
    .update({ active: false })
    .eq("id", id);
  if (error) throw error;
}
