import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { todayISO } from "@/lib/date";
import type { Habit, HabitLog } from "@/types";

/** Set of "completed" dates for a habit, for O(1) lookups. */
export function completedSet(logs: HabitLog[], habitId: string): Set<string> {
  const set = new Set<string>();
  for (const l of logs) {
    if (l.habit_id === habitId && l.completed) set.add(l.date);
  }
  return set;
}

/** Current consecutive-day streak ending today (or yesterday if today not done). */
export function currentStreak(done: Set<string>): number {
  const today = parseISO(todayISO());
  let cursor = today;
  // Allow the streak to still count if today simply hasn't been logged yet.
  if (!done.has(format(cursor, "yyyy-MM-dd"))) {
    cursor = addDays(cursor, -1);
  }
  let streak = 0;
  while (done.has(format(cursor, "yyyy-MM-dd"))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Completed days within the last 7 calendar days (inclusive of today). */
export function weekCompleted(done: Set<string>): number {
  const today = parseISO(todayISO());
  let count = 0;
  for (let i = 0; i < 7; i++) {
    if (done.has(format(addDays(today, -i), "yyyy-MM-dd"))) count += 1;
  }
  return count;
}

export interface HabitStats {
  streak: number;
  weekCompleted: number;
  /** 0–100, completed vs target for the last 7 days. */
  weekConsistency: number;
  doneToday: boolean;
}

export function habitStats(habit: Habit, logs: HabitLog[]): HabitStats {
  const done = completedSet(logs, habit.id);
  const wc = weekCompleted(done);
  return {
    streak: currentStreak(done),
    weekCompleted: wc,
    weekConsistency: Math.min(
      100,
      Math.round((wc / Math.max(1, habit.target_days_per_week)) * 100)
    ),
    doneToday: done.has(todayISO()),
  };
}

/** Overall weekly consistency across all habits (0–100). */
export function overallWeekConsistency(
  habits: Habit[],
  logs: HabitLog[]
): number {
  if (habits.length === 0) return 0;
  const totalTarget = habits.reduce(
    (s, h) => s + h.target_days_per_week,
    0
  );
  if (totalTarget === 0) return 0;
  const totalDone = habits.reduce(
    (s, h) => s + weekCompleted(completedSet(logs, h.id)),
    0
  );
  return Math.min(100, Math.round((totalDone / totalTarget) * 100));
}

/** How many habits are done today, for the dashboard tile. */
export function todayCompletion(
  habits: Habit[],
  logs: HabitLog[]
): { done: number; total: number } {
  const today = todayISO();
  const doneIds = new Set(
    logs.filter((l) => l.date === today && l.completed).map((l) => l.habit_id)
  );
  return { done: habits.filter((h) => doneIds.has(h.id)).length, total: habits.length };
}

/** Number of days of overlap between two ISO dates (used by heatmap bounds). */
export function daysBetween(startIso: string, endIso: string): number {
  return differenceInCalendarDays(parseISO(endIso), parseISO(startIso));
}
