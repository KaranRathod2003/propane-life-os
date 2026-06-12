import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { format, subDays } from "date-fns";
import { todayISO } from "@/lib/date";
import * as api from "./api";

/** We pull ~95 days of logs so streaks + the month heatmap have enough history. */
const LOG_WINDOW_DAYS = 95;

const keys = {
  habits: ["habits"] as const,
  logs: ["habit_logs"] as const,
};

export function useHabits() {
  return useQuery({ queryKey: keys.habits, queryFn: api.fetchHabits });
}

export function useHabitLogs() {
  const start = format(subDays(new Date(), LOG_WINDOW_DAYS), "yyyy-MM-dd");
  const end = todayISO();
  return useQuery({
    queryKey: [...keys.logs, start, end],
    queryFn: () => api.fetchHabitLogs(start, end),
  });
}

export function useToggleHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      habitId,
      date,
      completed,
    }: {
      habitId: string;
      date: string;
      completed: boolean;
    }) => api.setHabitLog(habitId, date, completed),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.logs });
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Could not update habit"),
  });
}

export function useCreateHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      name,
      icon,
      target,
    }: {
      name: string;
      icon: string;
      target: number;
    }) => api.createHabit(name, icon, target),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.habits });
      toast.success("Habit added");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Could not add habit"),
  });
}

export function useArchiveHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.archiveHabit(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.habits });
      toast.success("Habit archived");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Could not archive"),
  });
}
