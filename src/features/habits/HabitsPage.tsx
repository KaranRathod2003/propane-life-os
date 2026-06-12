import { useState } from "react";
import { Check, Flame, Plus, CheckCircle2, Loader2, Archive } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { ProgressRing } from "@/components/common/ProgressRing";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { todayISO, monthKey, monthLabel } from "@/lib/date";
import type { Habit } from "@/types";
import {
  useArchiveHabit,
  useCreateHabit,
  useHabitLogs,
  useHabits,
  useToggleHabit,
} from "./hooks";
import {
  habitStats,
  overallWeekConsistency,
  todayCompletion,
} from "./computations";
import { HabitIcon } from "./icons";
import { HabitHeatmap } from "./components/HabitHeatmap";

export default function HabitsPage() {
  const habits = useHabits();
  const logs = useHabitLogs();
  const [addOpen, setAddOpen] = useState(false);

  const isLoading = habits.isLoading || logs.isLoading;
  const isError = habits.isError || logs.isError;

  const habitList = habits.data ?? [];
  const logList = logs.data ?? [];
  const today = todayCompletion(habitList, logList);
  const overall = overallWeekConsistency(habitList, logList);
  const month = monthKey();

  return (
    <div>
      <PageHeader
        title="Habits"
        action={
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setAddOpen(true)}
            aria-label="Add habit"
          >
            <Plus className="h-5 w-5" />
          </Button>
        }
      />

      {isError ? (
        <ErrorState onRetry={() => (habits.refetch(), logs.refetch())} />
      ) : isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : habitList.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="No habits yet"
          hint="Add a habit to start building streaks."
          action={<Button onClick={() => setAddOpen(true)}>Add habit</Button>}
        />
      ) : (
        <>
          {/* Today summary */}
          <Card className="mb-4">
            <CardContent className="flex items-center gap-4 p-5">
              <ProgressRing
                value={today.total ? (today.done / today.total) * 100 : 0}
                size={76}
              >
                <span className="text-sm font-bold tabular-nums">
                  {today.done}/{today.total}
                </span>
              </ProgressRing>
              <div>
                <p className="font-semibold">Today</p>
                <p className="text-sm text-muted-foreground">
                  {today.done === today.total
                    ? "All done — nice work."
                    : `${today.total - today.done} habit${
                        today.total - today.done === 1 ? "" : "s"
                      } left`}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Week consistency:{" "}
                  <span className="font-medium text-foreground">{overall}%</span>
                </p>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="today">
            <TabsList className="w-full">
              <TabsTrigger value="today" className="flex-1">
                Today
              </TabsTrigger>
              <TabsTrigger value="streaks" className="flex-1">
                Streaks &amp; heatmap
              </TabsTrigger>
            </TabsList>

            <TabsContent value="today" className="space-y-2">
              {habitList.map((h) => (
                <HabitChecklistRow key={h.id} habit={h} logs={logList} />
              ))}
            </TabsContent>

            <TabsContent value="streaks" className="space-y-3">
              <p className="px-1 text-xs text-muted-foreground">
                {monthLabel(month)}
              </p>
              {habitList.map((h) => (
                <HabitStatsCard
                  key={h.id}
                  habit={h}
                  logs={logList}
                  month={month}
                />
              ))}
            </TabsContent>
          </Tabs>
        </>
      )}

      <AddHabitSheet open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}

function HabitChecklistRow({ habit, logs }: { habit: Habit; logs: any[] }) {
  const toggle = useToggleHabit();
  const stats = habitStats(habit, logs);
  const today = todayISO();

  return (
    <button
      onClick={() =>
        toggle.mutate({
          habitId: habit.id,
          date: today,
          completed: !stats.doneToday,
        })
      }
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors",
        stats.doneToday
          ? "border-primary/40 bg-primary/10"
          : "border-border bg-card hover:bg-secondary/40"
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
          stats.doneToday
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-muted-foreground"
        )}
      >
        {stats.doneToday ? (
          <Check className="h-5 w-5" strokeWidth={3} />
        ) : (
          <HabitIcon name={habit.icon} className="h-5 w-5" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{habit.name}</p>
        <p className="text-xs text-muted-foreground">
          {habit.target_days_per_week}×/week
        </p>
      </div>
      {stats.streak > 0 && (
        <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-orange-400">
          <Flame className="h-4 w-4" />
          {stats.streak}
        </span>
      )}
    </button>
  );
}

function HabitStatsCard({
  habit,
  logs,
  month,
}: {
  habit: Habit;
  logs: any[];
  month: string;
}) {
  const archive = useArchiveHabit();
  const stats = habitStats(habit, logs);
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
            <HabitIcon name={habit.icon} className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{habit.name}</p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1 text-orange-400">
                <Flame className="h-3.5 w-3.5" /> {stats.streak} day streak
              </span>
              <span>{stats.weekConsistency}% this week</span>
            </div>
          </div>
          <button
            onClick={() => archive.mutate(habit.id)}
            aria-label="Archive habit"
            className="text-muted-foreground/60 hover:text-destructive"
          >
            <Archive className="h-4 w-4" />
          </button>
        </div>
        <HabitHeatmap month={month} habitId={habit.id} logs={logs} />
      </CardContent>
    </Card>
  );
}

const NEW_HABIT_ICONS = [
  "sparkles",
  "activity",
  "book-open",
  "salad",
  "shield",
  "rocket",
  "sunrise",
  "messages-square",
];

function AddHabitSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const create = useCreateHabit();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("sparkles");
  const [target, setTarget] = useState(7);

  const submit = () => {
    if (!name.trim()) return;
    create.mutate(
      { name: name.trim(), icon, target },
      {
        onSuccess: () => {
          setName("");
          setIcon("sparkles");
          setTarget(7);
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>New habit</SheetTitle>
        </SheetHeader>
        <Input
          autoFocus
          placeholder="Habit name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Icon</p>
          <div className="flex flex-wrap gap-2">
            {NEW_HABIT_ICONS.map((ic) => (
              <button
                key={ic}
                onClick={() => setIcon(ic)}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl border",
                  icon === ic
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border text-muted-foreground"
                )}
              >
                <HabitIcon name={ic} className="h-5 w-5" />
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Target days per week: {target}
          </p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <button
                key={n}
                onClick={() => setTarget(n)}
                className={cn(
                  "flex-1 rounded-lg py-2 text-sm font-medium",
                  target === n
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <Button
          size="lg"
          className="w-full"
          onClick={submit}
          disabled={create.isPending || !name.trim()}
        >
          {create.isPending && <Loader2 className="animate-spin" />}
          Add habit
        </Button>
      </SheetContent>
    </Sheet>
  );
}
