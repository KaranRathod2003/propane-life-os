import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { monthLabel, shiftMonth, monthKey } from "@/lib/date";
import { useUIStore } from "@/stores/ui";

export function MonthSelector() {
  const month = useUIStore((s) => s.selectedMonth);
  const setMonth = useUIStore((s) => s.setSelectedMonth);
  const isCurrent = month === monthKey();

  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-card px-2 py-1.5">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => setMonth(shiftMonth(month, -1))}
        aria-label="Previous month"
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>
      <button
        onClick={() => setMonth(monthKey())}
        className="text-sm font-semibold"
        title="Jump to current month"
      >
        {monthLabel(month)}
      </button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => setMonth(shiftMonth(month, 1))}
        disabled={isCurrent}
        aria-label="Next month"
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  );
}
