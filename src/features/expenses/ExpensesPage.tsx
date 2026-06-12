import { useState } from "react";
import {
  Settings2,
  Wallet,
  PiggyBank,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorState } from "@/components/common/ErrorState";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/format";
import { useUIStore } from "@/stores/ui";
import { useMonthExpenses, useSeedBudget } from "./hooks";
import { copy } from "./copy";
import { MonthSelector } from "./components/MonthSelector";
import { BudgetSetupSheet } from "./components/BudgetSetupSheet";
import { TransactionList } from "./components/TransactionList";
import { CategoryBudgets } from "./components/CategoryBudgets";
import { CategoryDonut, DailySpendChart } from "./components/SpendCharts";

export default function ExpensesPage() {
  const month = useUIStore((s) => s.selectedMonth);
  const [setupOpen, setSetupOpen] = useState(false);
  const {
    budget,
    categories,
    transactions,
    summary,
    isLoading,
    isError,
    refetch,
  } = useMonthExpenses(month);
  const seed = useSeedBudget(month);

  const hasBudget = !!budget.data;
  const negative = summary.currentBalance < 0;

  return (
    <div>
      <PageHeader
        title="Expenses"
        action={
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSetupOpen(true)}
            aria-label="Money setup"
          >
            <Settings2 className="h-5 w-5" />
          </Button>
        }
      />

      <div className="mb-4">
        <MonthSelector />
      </div>

      {isError ? (
        <ErrorState onRetry={refetch} />
      ) : isLoading ? (
        <LoadingState />
      ) : !hasBudget ? (
        <EmptyState
          icon={Wallet}
          title={copy.empty.title}
          hint={copy.empty.hint}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => seed.mutate()} disabled={seed.isPending}>
                {copy.empty.seed}
              </Button>
              <Button variant="outline" onClick={() => setSetupOpen(true)}>
                {copy.empty.manual}
              </Button>
            </div>
          }
        />
      ) : (
        <div className="space-y-3">
          {/* HERO — What's Left (live bank balance) */}
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
                {formatINR(summary.currentBalance)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {negative ? copy.hero.negativeSub : copy.hero.sub}
              </p>
              <p className="mt-2 text-[11px] text-muted-foreground/80">
                from {formatINR(summary.openingBalance)} · spent{" "}
                {formatINR(summary.totalExpense)}
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
                    summary.freeToSpend <= 0
                      ? "text-destructive"
                      : "text-success"
                  )}
                >
                  {summary.freeToSpend > 0
                    ? formatINR(summary.freeToSpend)
                    : copy.free.none}
                </p>
                <p className="text-xs text-muted-foreground">
                  {copy.free.hint}
                </p>
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
                month={month}
                transactions={transactions.data ?? []}
                categories={categories.data ?? []}
                summary={summary}
              />
            </TabsContent>

            <TabsContent value="plans">
              <CategoryBudgets
                data={summary.perBucket}
                transactions={transactions.data ?? []}
              />
            </TabsContent>

            <TabsContent value="charts" className="space-y-4">
              <CategoryDonut data={summary.perBucket} />
              <DailySpendChart data={summary.dailySpend} />
            </TabsContent>
          </Tabs>
        </div>
      )}

      <BudgetSetupSheet
        open={setupOpen}
        onOpenChange={setSetupOpen}
        month={month}
        budget={budget.data ?? null}
        categories={categories.data ?? []}
      />
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-32 w-full" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
