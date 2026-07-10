import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import {
  Flame,
  ShieldCheck,
  AlertTriangle,
  PiggyBank,
  ArrowRight,
  NotebookPen,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ProgressRing } from "@/components/common/ProgressRing";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { cn } from "@/lib/utils";
import { formatINR, formatINRCompact, formatPercent } from "@/lib/format";
import { monthLabel, nowIST } from "@/lib/date";
import { format } from "date-fns";
import { useUIStore } from "@/stores/ui";
import { useAuth } from "@/features/auth/AuthProvider";
import { AccountSwitcher } from "@/features/auth/AccountSwitcher";
import { useExpenses } from "@/features/expenses/hooks";
import { copy } from "@/features/expenses/copy";
import { useHabitLogs, useHabits } from "@/features/habits/hooks";
import {
  habitStats,
  overallWeekConsistency,
  todayCompletion,
} from "@/features/habits/computations";
import { useEntries, useGoals } from "@/features/journal/hooks";
import { DangerZone } from "@/features/settings/DangerZone";

export default function DashboardPage() {
  const month = useUIStore((s) => s.selectedMonth);
  const { user } = useAuth();

  const expenses = useExpenses();
  const habits = useHabits();
  const logs = useHabitLogs();
  const goals = useGoals();
  const entries = useEntries();

  const greeting = getGreeting();
  const firstName = user?.email?.split("@")[0] ?? "there";

  const summary = expenses.summary;
  const habitList = habits.data ?? [];
  const logList = logs.data ?? [];
  const today = todayCompletion(habitList, logList);
  const weekConsistency = overallWeekConsistency(habitList, logList);
  const bestStreak = habitList.reduce(
    (best, h) => Math.max(best, habitStats(h, logList).streak),
    0
  );

  const activeGoals = (goals.data ?? []).filter((g) => g.status === "active");
  const topGoal = activeGoals[0];
  const latestEntry = entries.data?.[0];

  const savingsPct =
    summary.savingTarget > 0
      ? (summary.projectedSavings / summary.savingTarget) * 100
      : summary.projectedSavings > 0
        ? 100
        : 0;

  // Planned (estimate) vs actually spent, for the mini chart.
  const plannedTotal = summary.perBucket.reduce((s, b) => s + b.estimate, 0);
  const spendChart = [
    { name: "Planned", value: plannedTotal },
    { name: "Spent", value: summary.cycleSpend },
  ];

  return (
    <div>
      <header className="flex items-center justify-between pt-3 pb-4">
        <div>
          <p className="text-sm text-muted-foreground">{greeting},</p>
          <h1 className="text-2xl font-bold capitalize tracking-tight">
            {firstName}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <AccountSwitcher />
        </div>
      </header>

      {expenses.isLoading ? (
        <BentoSkeleton />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {/* HERO — What's Left (live bank balance) */}
          <Link to="/expenses" className="col-span-2">
            <Card
              className={cn(
                "overflow-hidden border-0 bg-gradient-to-br transition-transform active:scale-[0.99]",
                summary.mainBalance < 0
                  ? "from-destructive/25 to-destructive/5"
                  : "from-primary/25 via-violet-500/10 to-transparent"
              )}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">
                    {copy.hero.title} · {expenses.currentCycle?.label ?? monthLabel(month)}
                  </p>
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
                    "mt-2 text-5xl font-bold tracking-tight tabular-nums",
                    summary.mainBalance < 0 && "text-destructive"
                  )}
                >
                  {formatINR(summary.mainBalance)}
                </p>
                <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  {summary.freeToSpend > 0
                    ? `${formatINR(summary.freeToSpend)} ${copy.free.label.toLowerCase()}`
                    : copy.hero.sub}
                  <ArrowRight className="h-3 w-3" />
                </p>
              </CardContent>
            </Card>
          </Link>

          {/* Savings goal ring */}
          <Card>
            <CardContent className="flex flex-col items-center gap-2 p-4">
              <ProgressRing
                value={savingsPct}
                size={84}
                className={cn(
                  summary.savingsAtRisk ? "stroke-destructive" : "stroke-success"
                )}
              >
                <PiggyBank className="h-6 w-6 text-muted-foreground" />
              </ProgressRing>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Projected savings</p>
                <p className="text-lg font-bold tabular-nums">
                  {formatINRCompact(summary.projectedSavings)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  target {formatINRCompact(summary.savingTarget)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Today's habits ring */}
          <Link to="/habits">
            <Card className="h-full transition-transform active:scale-[0.99]">
              <CardContent className="flex h-full flex-col items-center gap-2 p-4">
                <ProgressRing
                  value={today.total ? (today.done / today.total) * 100 : 0}
                  size={84}
                >
                  <span className="text-base font-bold tabular-nums">
                    {today.done}/{today.total}
                  </span>
                </ProgressRing>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Habits today</p>
                  <p className="text-sm font-medium">
                    {today.total && today.done === today.total
                      ? "Complete 🎉"
                      : "Keep going"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Streak tile */}
          <Card>
            <CardContent className="flex h-full flex-col justify-between p-4">
              <div className="flex items-center gap-1.5 text-orange-400">
                <Flame className="h-5 w-5" />
                <span className="text-2xl font-bold tabular-nums">
                  {bestStreak}
                </span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Best streak</p>
                <p className="text-sm font-medium">
                  {formatPercent(weekConsistency)} consistent this week
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Planned vs spent mini chart */}
          <Card>
            <CardContent className="flex h-full flex-col p-4">
              <p className="text-xs text-muted-foreground">Planned vs spent</p>
              <div className="my-1 h-16 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={spendChart} margin={{ top: 4, bottom: 0 }}>
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--muted))" }}
                      formatter={(v: number) => formatINR(v)}
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "0.75rem",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      <Cell fill="hsl(var(--muted-foreground))" />
                      <Cell
                        fill={
                          summary.cycleSpend > plannedTotal
                            ? "#f43f5e"
                            : "hsl(var(--primary))"
                        }
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-sm font-semibold tabular-nums">
                {formatINR(summary.cycleSpend)}
                <span className="text-xs font-normal text-muted-foreground">
                  {" "}
                  / {formatINR(plannedTotal)}
                </span>
              </p>
            </CardContent>
          </Card>

          {/* Quick journal tile */}
          <Link to="/journal" className="col-span-2 block">
            <Card className="transition-transform active:scale-[0.99]">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
                  <NotebookPen className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">
                    {topGoal
                      ? `Goal · ${topGoal.title} (${topGoal.progress}%)`
                      : "Journal"}
                  </p>
                  <p className="truncate text-sm font-medium">
                    {latestEntry
                      ? latestEntry.title || latestEntry.content
                      : "Capture a thought for today"}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        </div>
      )}

      <DangerZone />
    </div>
  );
}

function getGreeting(): string {
  const hour = Number(format(nowIST(), "H"));
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function BentoSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Skeleton className="col-span-2 h-36" />
      <Skeleton className="h-40" />
      <Skeleton className="h-40" />
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
      <Skeleton className="col-span-2 h-20" />
    </div>
  );
}
