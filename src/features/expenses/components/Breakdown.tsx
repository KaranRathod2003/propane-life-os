import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/format";
import { useUIStore } from "@/stores/ui";
import type { BudgetCategory, Transaction } from "@/types";
import { computeMonthAnalytics } from "../computations";
import { copy } from "../copy";
import { MonthSelector } from "./MonthSelector";
import { SlicePie } from "./SpendCharts";

export function Breakdown({
  transactions,
  categories,
}: {
  transactions: Transaction[];
  categories: BudgetCategory[];
}) {
  const selectedMonth = useUIStore((s) => s.selectedMonth); // "YYYY-MM-DD"
  const month = selectedMonth.slice(0, 7); // "YYYY-MM"

  const a = useMemo(
    () => computeMonthAnalytics(month, transactions, categories),
    [month, transactions, categories]
  );

  const net = a.totalIncome - a.totalExpense;

  return (
    <div className="space-y-4">
      <MonthSelector />

      <div className="grid grid-cols-3 gap-2">
        <Stat label={copy.breakdown.totalGot} value={a.totalIncome} tone="in" />
        <Stat label={copy.breakdown.totalSpent} value={a.totalExpense} tone="out" />
        <Stat label={copy.breakdown.net} value={net} tone={net >= 0 ? "in" : "out"} />
      </div>

      <SlicePie
        title={copy.breakdown.spentTitle}
        slices={a.expenseByTag}
        emptyText={copy.breakdown.spentEmpty}
      />
      <SlicePie
        title={copy.breakdown.gotTitle}
        slices={a.incomeByTag}
        emptyText={copy.breakdown.gotEmpty}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "in" | "out";
}) {
  return (
    <Card>
      <CardContent className="p-3">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p
          className={cn(
            "mt-0.5 text-base font-bold tabular-nums",
            tone === "in" ? "text-success" : "text-foreground"
          )}
        >
          {formatINR(value)}
        </p>
      </CardContent>
    </Card>
  );
}
