import { useMemo, useState } from "react";
import {
  Settings2,
  PiggyBank,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorState } from "@/components/common/ErrorState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/format";
import { useExpenses } from "./hooks";
import { copy } from "./copy";
import { AccountsStrip } from "./components/AccountsStrip";
import { SalaryButton } from "./components/SalarySheet";
import { BudgetSetupSheet } from "./components/BudgetSetupSheet";
import { TransactionList } from "./components/TransactionList";
import { CategoryBudgets } from "./components/CategoryBudgets";
import { CategoryDonut, DailySpendChart } from "./components/SpendCharts";
import { Breakdown } from "./components/Breakdown";

export default function ExpensesPage() {
  const [setupOpen, setSetupOpen] = useState(false);
  const {
    accounts,
    categories,
    transactions,
    currentCycle,
    balances,
    summary,
    isLoading,
    isError,
    refetch,
  } = useExpenses();

  const allTxns = transactions.data ?? [];
  const allCats = categories.data ?? [];
  const mainAccount = (accounts.data ?? []).find((a) => a.kind === "main") ?? null;

  const cycleTxns = useMemo(
    () => (currentCycle ? allTxns.filter((t) => t.cycle_id === currentCycle.id) : []),
    [allTxns, currentCycle]
  );
  const cycleCats = useMemo(
    () => (currentCycle ? allCats.filter((c) => c.cycle_id === currentCycle.id) : []),
    [allCats, currentCycle]
  );

  const negative = summary.mainBalance < 0;

  return (
    <div>
      <PageHeader
        title="Money"
        action={
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSetupOpen(true)}
            aria-label="Plan setup"
          >
            <Settings2 className="h-5 w-5" />
          </Button>
        }
      />

      {isError ? (
        <ErrorState onRetry={refetch} />
      ) : isLoading ? (
        <LoadingState />
      ) : (
        <div className="space-y-3">
          {/* Accounts + transfer */}
          <AccountsStrip balances={balances} />

          {/* Salary → new cycle */}
          <SalaryButton
            currentCycle={currentCycle}
            mainAccount={mainAccount}
            hasBuckets={cycleCats.length > 0}
          />

          {/* HERO — What's Left (live Main balance, carries over) */}
          <Card
            className={cn(
              "overflow-hidden border-0 bg-gradient-to-br",
              negative
                ? "from-destructive/25 to-destructive/5"
                : "from-primary/25 via-violet-500/10 to-transparent"
            )}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{copy.hero.title}</p>
                {summary.savingsAtRisk ? (
                  <Badge variant="destructive">
                    <AlertTriangle className="h-3 w-3" /> {copy.hero.riskBadge}
                  </Badge>
                ) : (
                  <Badge variant="success">
                    <ShieldCheck className="h-3 w-3" /> {copy.hero.okBadge}
                  </Badge>
                )}
              </div>
              <p
                className={cn(
                  "mt-1 text-5xl font-bold tracking-tight tabular-nums",
                  negative && "text-destructive"
                )}
              >
                {formatINR(summary.mainBalance)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {negative ? copy.hero.negativeSub : copy.hero.sub}
              </p>
              <p className="mt-2 text-[11px] text-muted-foreground/80">
                spent {formatINR(summary.cycleSpend)} this cycle
                {summary.plannedRemaining > 0 &&
                  ` · ${formatINR(summary.plannedRemaining)} still planned`}
              </p>
            </CardContent>
          </Card>

          {/* Yours to waste + Future You's Money */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5" /> {copy.free.label}
                </div>
                <p
                  className={cn(
                    "mt-1 text-2xl font-bold tabular-nums",
                    summary.freeToSpend <= 0 ? "text-destructive" : "text-success"
                  )}
                >
                  {summary.freeToSpend > 0
                    ? formatINR(summary.freeToSpend)
                    : copy.free.none}
                </p>
                <p className="text-xs text-muted-foreground">{copy.free.hint}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <PiggyBank className="h-3.5 w-3.5" /> {copy.savings.label}
                </div>
                <p
                  className={cn(
                    "mt-1 text-2xl font-bold tabular-nums",
                    summary.savingsAtRisk ? "text-destructive" : "text-success"
                  )}
                >
                  {formatINR(summary.projectedSavings)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {summary.savingsAtRisk
                    ? `${copy.savings.atRiskPrefix} ${formatINR(summary.riskAmount)}`
                    : `floor ${formatINR(summary.savingTarget)}`}
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="receipts" className="pt-1">
            <TabsList className="w-full">
              <TabsTrigger value="receipts" className="flex-1">
                {copy.tabs.receipts}
              </TabsTrigger>
              <TabsTrigger value="plans" className="flex-1">
                {copy.tabs.plans}
              </TabsTrigger>
              <TabsTrigger value="charts" className="flex-1">
                {copy.tabs.charts}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="receipts">
              <TransactionList
                transactions={cycleTxns}
                categories={allCats}
                summary={summary}
              />
            </TabsContent>

            <TabsContent value="plans" className="space-y-4">
              <CategoryBudgets data={summary.perBucket} transactions={cycleTxns} />
              <CategoryDonut data={summary.perBucket} />
              <DailySpendChart data={summary.dailySpend} />
            </TabsContent>

            <TabsContent value="charts">
              <Breakdown transactions={allTxns} categories={allCats} />
            </TabsContent>
          </Tabs>
        </div>
      )}

      <BudgetSetupSheet
        open={setupOpen}
        onOpenChange={setSetupOpen}
        cycle={currentCycle}
        categories={cycleCats}
      />
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
      <Skeleton className="h-32 w-full" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
