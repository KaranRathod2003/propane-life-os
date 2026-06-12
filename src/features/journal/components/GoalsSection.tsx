import { useEffect, useState } from "react";
import { Plus, Target, Check, Trash2, Loader2, RotateCcw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { parseDate } from "@/lib/date";
import type { Goal } from "@/types";
import {
  useCreateGoal,
  useDeleteGoal,
  useGoals,
  useUpdateGoal,
} from "../hooks";

export function GoalsSection() {
  const goals = useGoals();
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground">Goals</h2>
        <Button variant="ghost" size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>

      {goals.isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : (goals.data ?? []).length === 0 ? (
        <EmptyState
          icon={Target}
          title="No goals yet"
          hint="Add a goal and nudge the slider as you make progress."
        />
      ) : (
        <div className="space-y-3">
          {(goals.data ?? []).map((g) => (
            <GoalCard key={g.id} goal={g} />
          ))}
        </div>
      )}

      <AddGoalSheet open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}

function GoalCard({ goal }: { goal: Goal }) {
  const update = useUpdateGoal();
  const del = useDeleteGoal();
  const [progress, setProgress] = useState(goal.progress);
  const isDone = goal.status === "done";

  // Keep local slider in sync if the server value changes elsewhere.
  useEffect(() => setProgress(goal.progress), [goal.progress]);

  const commit = (val: number) => {
    update.mutate({
      id: goal.id,
      patch: {
        progress: val,
        status: val >= 100 ? "done" : "active",
      },
    });
  };

  return (
    <Card className={cn(isDone && "opacity-70")}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p
                className={cn(
                  "truncate font-medium",
                  isDone && "line-through text-muted-foreground"
                )}
              >
                {goal.title}
              </p>
              {isDone && (
                <Badge variant="success">
                  <Check className="h-3 w-3" /> Done
                </Badge>
              )}
            </div>
            {goal.description && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {goal.description}
              </p>
            )}
            {goal.target_date && (
              <p className="mt-1 text-xs text-muted-foreground">
                Target: {format(parseDate(goal.target_date), "d MMM yyyy")}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {isDone && (
              <button
                onClick={() =>
                  update.mutate({
                    id: goal.id,
                    patch: { status: "active", progress: Math.min(progress, 99) },
                  })
                }
                aria-label="Reopen goal"
                className="text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => del.mutate(goal.id)}
              aria-label="Delete goal"
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Slider
            value={[progress]}
            min={0}
            max={100}
            step={5}
            onValueChange={(v) => setProgress(v[0])}
            onValueCommit={(v) => commit(v[0])}
          />
          <span className="w-10 shrink-0 text-right text-sm font-semibold tabular-nums">
            {progress}%
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function AddGoalSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const create = useCreateGoal();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");

  const submit = () => {
    if (!title.trim()) return;
    create.mutate(
      {
        title: title.trim(),
        description: description.trim(),
        status: "active",
        progress: 0,
        target_date: targetDate || null,
      },
      {
        onSuccess: () => {
          setTitle("");
          setDescription("");
          setTargetDate("");
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>New goal</SheetTitle>
        </SheetHeader>
        <Input
          autoFocus
          placeholder="Goal title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Textarea
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            Target date (optional)
          </p>
          <Input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
          />
        </div>
        <Button
          size="lg"
          className="w-full"
          onClick={submit}
          disabled={create.isPending || !title.trim()}
        >
          {create.isPending && <Loader2 className="animate-spin" />}
          Add goal
        </Button>
      </SheetContent>
    </Sheet>
  );
}
