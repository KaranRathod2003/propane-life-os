import { useState } from "react";
import { AlertTriangle, Trash2, Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/EmptyState";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/format";
import { dayLabel } from "@/lib/date";
import type { BudgetCategory, Transaction } from "@/types";
import { type ExpenseSummary, transactionRisk } from "../computations";
import { copy } from "../copy";
import { useDeleteTransaction } from "../hooks";

const TYPE_LABEL: Record<Transaction["type"], string> = {
  expense: "",
  income: "Got money",
  lent: "Lent out",
  borrowed_repayment: "Got it back",
};

const INFLOW_TYPES: Transaction["type"][] = ["income", "borrowed_repayment"];

export function TransactionList({
  month,
  transactions,
  categories,
  summary,
}: {
  month: string;
  transactions: Transaction[];
  categories: BudgetCategory[];
  summary: ExpenseSummary;
}) {
  const del = useDeleteTransaction(month);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const catName = (id: string | null) =>
    categories.find((c) => c.id === id)?.name;

  if (transactions.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title={copy.receipts.empty}
        hint={copy.receipts.emptyHint}
      />
    );
  }

  // Group by date for readable scanning.
  const groups = transactions.reduce<Record<string, Transaction[]>>((acc, t) => {
    (acc[t.date] ??= []).push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(groups).map(([date, items]) => (
        <div key={date} className="space-y-1.5">
          <p className="px-1 text-xs font-medium text-muted-foreground">
            {dayLabel(date)}
          </p>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {items.map((t, idx) => {
              const risk = transactionRisk(t, summary);
              const isInflow = INFLOW_TYPES.includes(t.type);
              return (
                <div
                  key={t.id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3",
                    idx > 0 && "border-t border-border",
                    risk.atRisk && "bg-destructive/5"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">
                        {catName(t.category_id) ||
                          TYPE_LABEL[t.type] ||
                          "Uncategorised"}
                      </span>
                      {risk.atRisk && (
                        <Badge variant="destructive" className="shrink-0">
                          <AlertTriangle className="h-3 w-3" />
                          {copy.receipts.hurtsBadge}
                        </Badge>
                      )}
                    </div>
                    {(t.note || risk.atRisk) && (
                      <p className="truncate text-xs text-muted-foreground">
                        {risk.atRisk ? risk.reason : t.note}
                      </p>
                    )}
                  </div>

                  <span
                    className={cn(
                      "shrink-0 text-sm font-semibold tabular-nums",
                      isInflow
                        ? "text-success"
                        : risk.atRisk
                          ? "text-destructive"
                          : "text-foreground"
                    )}
                  >
                    {isInflow ? "+" : "-"}
                    {formatINR(Number(t.amount))}
                  </span>

                  {confirmId === t.id ? (
                    <button
                      onClick={() => del.mutate(t.id, { onSettled: () => setConfirmId(null) })}
                      className="shrink-0 rounded-lg bg-destructive px-2 py-1 text-xs font-medium text-destructive-foreground"
                    >
                      Sure?
                    </button>
                  ) : (
                    <button
                      onClick={() => setConfirmId(t.id)}
                      onBlur={() => setConfirmId(null)}
                      aria-label="Delete transaction"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
