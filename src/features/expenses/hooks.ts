import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";
import * as api from "./api";
import {
  computeBalances,
  computeCycleSummary,
  mainBalanceOf,
} from "./computations";
import type { Cycle, NewBudgetCategory, NewTransaction } from "@/types";

const KEYS = {
  accounts: ["accounts"] as const,
  cycles: ["cycles"] as const,
  categories: ["categories"] as const,
  transactions: ["transactions"] as const,
};

// ---------------------------------------------------------------------------
// Combined read model
// ---------------------------------------------------------------------------

export function useExpenses() {
  const accounts = useQuery({ queryKey: KEYS.accounts, queryFn: api.fetchAccounts });
  const cycles = useQuery({ queryKey: KEYS.cycles, queryFn: api.fetchCycles });
  const categories = useQuery({ queryKey: KEYS.categories, queryFn: api.fetchCategories });
  const transactions = useQuery({ queryKey: KEYS.transactions, queryFn: api.fetchTransactions });

  const currentCycle = useMemo(
    () => (cycles.data ?? []).find((c) => c.is_current) ?? null,
    [cycles.data]
  );

  const balances = useMemo(
    () => computeBalances(accounts.data ?? [], transactions.data ?? []),
    [accounts.data, transactions.data]
  );
  const mainBalance = mainBalanceOf(balances);

  const summary = useMemo(
    () =>
      computeCycleSummary(
        currentCycle,
        mainBalance,
        categories.data ?? [],
        transactions.data ?? []
      ),
    [currentCycle, mainBalance, categories.data, transactions.data]
  );

  return {
    accounts,
    cycles,
    categories,
    transactions,
    currentCycle,
    balances,
    mainBalance,
    summary,
    isLoading:
      accounts.isLoading ||
      cycles.isLoading ||
      categories.isLoading ||
      transactions.isLoading,
    isError:
      accounts.isError ||
      cycles.isError ||
      categories.isError ||
      transactions.isError,
    refetch: () => {
      accounts.refetch();
      cycles.refetch();
      categories.refetch();
      transactions.refetch();
    },
  };
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

function useInvalidate() {
  const qc = useQueryClient();
  return (keys: readonly (readonly string[])[]) =>
    keys.forEach((key) => qc.invalidateQueries({ queryKey: key }));
}

export function useCreateTransaction() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (payload: NewTransaction) => api.createTransaction(payload),
    onSuccess: () => {
      invalidate([KEYS.transactions]);
      toast.success("Logged");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });
}

export function useDeleteTransaction() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => api.deleteTransaction(id),
    onSuccess: () => {
      invalidate([KEYS.transactions]);
      toast.success("Deleted");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Could not delete"),
  });
}

export function useCreateTransfer() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (params: {
      fromAccountId: string;
      toAccountId: string;
      amount: number;
      date: string;
      note: string | null;
    }) => api.createTransfer(params),
    onSuccess: () => {
      invalidate([KEYS.transactions]);
      toast.success("Transferred");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Transfer failed"),
  });
}

export function useStartSalaryCycle() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (params: {
      mainAccountId: string;
      salaryAmount: number;
      savingTarget: number;
      carryBucketsFromCycleId: string | null;
    }) => api.startSalaryCycle(params),
    onSuccess: () => {
      invalidate([KEYS.cycles, KEYS.transactions, KEYS.categories]);
      toast.success("New cycle started 🎉");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Could not start cycle"),
  });
}

export function useUpdateCycle() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<Pick<Cycle, "salary_amount" | "saving_target" | "label">>;
    }) => api.updateCycle(id, patch),
    onSuccess: () => {
      invalidate([KEYS.cycles]);
      toast.success("Saved");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });
}

export function useUpdateAccountOpening() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, opening_balance }: { id: string; opening_balance: number }) =>
      api.updateAccountOpening(id, opening_balance),
    onSuccess: () => {
      invalidate([KEYS.accounts]);
      toast.success("Balance updated");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Could not update balance"),
  });
}

export function useCreateCategory() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (payload: NewBudgetCategory) => api.createCategory(payload),
    onSuccess: () => {
      invalidate([KEYS.categories]);
      toast.success("Bucket added");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Could not add bucket"),
  });
}

export function useUpdateCategory() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<Pick<NewBudgetCategory, "name" | "planned_amount">>;
    }) => api.updateCategory(id, patch),
    onSuccess: () => invalidate([KEYS.categories]),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update"),
  });
}

export function useDeleteCategory() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => api.deleteCategory(id),
    onSuccess: () => {
      invalidate([KEYS.categories]);
      toast.success("Bucket removed");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Could not remove"),
  });
}

export function useSeedBuckets() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (cycleId: string) => api.seedStarterBuckets(cycleId),
    onSuccess: () => {
      invalidate([KEYS.categories]);
      toast.success("Starter buckets added");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Could not seed buckets"),
  });
}
