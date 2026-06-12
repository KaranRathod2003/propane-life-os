import { format } from "date-fns";
import { daysInMonth } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { HabitLog } from "@/types";
import { completedSet } from "../computations";

/** GitHub-style month heatmap for a single habit. */
export function HabitHeatmap({
  month,
  habitId,
  logs,
}: {
  month: string;
  habitId: string;
  logs: HabitLog[];
}) {
  const done = completedSet(logs, habitId);
  const days = daysInMonth(month);
  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <div className="flex flex-wrap gap-1">
      {days.map((d) => {
        const key = format(d, "yyyy-MM-dd");
        const isDone = done.has(key);
        const isFuture = key > today;
        return (
          <div
            key={key}
            title={`${format(d, "d MMM")}${isDone ? " · done" : ""}`}
            className={cn(
              "h-4 w-4 rounded-[4px]",
              isFuture
                ? "bg-muted/40"
                : isDone
                  ? "bg-primary"
                  : "bg-muted"
            )}
          />
        );
      })}
    </div>
  );
}
