import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import * as api from "./api";
import type { NewGoal, NewJournalEntry } from "@/types";

const keys = {
  entries: ["journal_entries"] as const,
  goals: ["goals"] as const,
};

export function useEntries() {
  return useQuery({ queryKey: keys.entries, queryFn: api.fetchEntries });
}

export function useCreateEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: NewJournalEntry) => api.createEntry(p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.entries });
      toast.success("Entry saved");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Could not save entry"),
  });
}

export function useUpdateEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<NewJournalEntry> }) =>
      api.updateEntry(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.entries });
      toast.success("Entry updated");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Could not update entry"),
  });
}

export function useDeleteEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteEntry(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.entries });
      toast.success("Entry deleted");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Could not delete entry"),
  });
}

export function useGoals() {
  return useQuery({ queryKey: keys.goals, queryFn: api.fetchGoals });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: NewGoal) => api.createGoal(p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.goals });
      toast.success("Goal added");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Could not add goal"),
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<NewGoal> }) =>
      api.updateGoal(id, patch),
    // No toast on every slider tick — keep it quiet.
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.goals }),
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Could not update goal"),
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteGoal(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.goals });
      toast.success("Goal removed");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Could not remove goal"),
  });
}
