import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";
import * as api from "./api";
import { computeSummary } from "./computations";
import type {
  NewBudgetCategory,
  NewTransaction,
} from "@/types";

const keys = {
  budget: (m: string) => ["budget", m] as const,
  categories: (m: string) => ["categories", m] as const,
  transactions: (m: string) => ["transactions", m] as const,
};

export function useBudget(month: string) {
  return useQuery({
    queryKey: keys.budget(month),
    queryFn: () => api.fetchBudget(month),
  });
}

export function useCategories(month: string) {
  return useQuery({
    queryKey: keys.categories(month),
    queryFn: () => api.fetchCategories(month),
  });
}

export function useTransactions(month: string) {
  return useQuery({
    queryKey: keys.transactions(month),
    queryFn: () => api.fetchTransactions(month),
  });
}

/** Combined month data + derived summary. */
export function useMonthExpenses(month: string) {
  const budget = useBudget(month);
  const categories = useCategories(month);
  const transactions = useTransactions(month);

  const summary = useMemo(
    () =>
      computeSummary(
        month,
        budget.data ?? null,
        categories.data ?? [],
        transactions.data ?? []
      ),
    [month, budget.data, categories.data, transactions.data]
  );

  return {
    budget,
    categories,
    transactions,
    summary,
    isLoading:
      budget.isLoading || categories.isLoading || transactions.isLoading,
    isError: budget.isError || categories.isError || transactions.isError,
    refetch: () => {
      budget.refetch();
      categories.refetch();
      transactions.refetch();
    },
  };
}

export function useCreateTransaction(month: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: NewTransaction) => api.createTransaction(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.transactions(month) });
      toast.success("Logged");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Could not save"),
  });
}

export function useDeleteTransaction(month: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteTransaction(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.transactions(month) });
      toast.success("Deleted");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Could not delete"),
  });
}

export function useUpsertBudget(month: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      opening_balance,
      saving_target,
    }: {
      opening_balance: number;
      saving_target: number;
    }) => api.upsertBudget(month, opening_balance, saving_target),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.budget(month) });
      toast.success("Saved");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Could not save budget"),
  });
}

export function useCreateCategory(month: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: NewBudgetCategory) => api.createCategory(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.categories(month) });
      toast.success("Category added");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Could not add category"),
  });
}

export function useUpdateCategory(month: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<NewBudgetCategory>;
    }) => api.updateCategory(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.categories(month) }),
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Could not update"),
  });
}

export function useDeleteCategory(month: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.categories(month) });
      toast.success("Category removed");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Could not remove"),
  });
}

export function useSeedBudget(month: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.seedDefaultBudget(month),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.budget(month) });
      qc.invalidateQueries({ queryKey: keys.categories(month) });
      toast.success("Starter budget created");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Could not create budget"),
  });
}
