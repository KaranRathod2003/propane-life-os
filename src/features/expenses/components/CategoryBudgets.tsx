import { useState } from "react";
import { AlertTriangle, Layers, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/EmptyState";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/format";
import { dayLabel } from "@/lib/date";
import type { Transaction } from "@/types";
import { copy } from "../copy";
import type { BucketSpend } from "../computations";

export function CategoryBudgets({
  data,
  transactions,
}: {
  data: BucketSpend[];
  transactions: Transaction[];
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (data.length === 0) {
    return (
      <EmptyState
        icon={Layers}
        title={copy.plans.empty}
        hint={copy.plans.emptyHint}
      />
    );
  }

  // Only real expenses count as chunks against a bucket.
  const chunksFor = (categoryId: string) =>
    transactions
      .filter((t) => t.type === "expense" && t.category_id === categoryId)
      .sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{copy.plans.title}</CardTitle>
        <p className="text-xs text-muted-foreground">{copy.plans.hint}</p>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {data.map((row) => {
          const pct =
            row.estimate > 0
              ? Math.min(100, (row.spent / row.estimate) * 100)
              : row.spent > 0
                ? 100
                : 0;
          const over = row.overBy > 0;
          const open = openId === row.category.id;
          const chunks = open ? chunksFor(row.category.id) : [];
          return (
            <div
              key={row.category.id}
              className="rounded-xl border border-border/60"
            >
              <button
                onClick={() =>
                  setOpenId((prev) =>
                    prev === row.category.id ? null : row.category.id
                  )
                }
                className="w-full space-y-1.5 px-3 py-2.5 text-left"
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 font-medium">
                    {row.category.name}
                    {over && (
                      <Badge variant="destructive">
                        <AlertTriangle className="h-3 w-3" />
                        ₹{Math.round(row.overBy)} {copy.plans.overSuffix}
                      </Badge>
                    )}
                  </span>
                  <span className="flex items-center gap-1.5 tabular-nums text-muted-foreground">
                    <span>
                      {formatINR(row.spent)}
                      {row.estimate > 0 && (
                        <span className="text-muted-foreground/60">
                          {" "}
                          / {formatINR(row.estimate)}
                        </span>
                      )}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 transition-transform",
                        open && "rotate-180"
                      )}
                    />
                  </span>
                </div>
                <Progress
                  value={pct}
                  indicatorClassName={cn(over ? "bg-destructive" : "bg-primary")}
                />
              </button>

              {open && (
                <div className="border-t border-border/60 px-3 py-2">
                  {chunks.length === 0 ? (
                    <p className="py-1 text-xs text-muted-foreground">
                      {copy.plans.noChunks}
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {chunks.map((c) => (
                        <li
                          key={c.id}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="min-w-0 flex-1 truncate text-muted-foreground">
                            <span className="text-foreground">
                              {dayLabel(c.date)}
                            </span>
                            {c.note ? ` · ${c.note}` : ""}
                          </span>
                          <span className="shrink-0 font-medium tabular-nums">
                            {formatINR(Number(c.amount))}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {row.estimate > 0 && (
                    <p className="mt-2 border-t border-border/40 pt-2 text-[11px] text-muted-foreground">
                      {row.remaining >= 0
                        ? `₹${Math.round(row.remaining)} ${copy.plans.leftSuffix}`
                        : `₹${Math.round(-row.remaining)} ${copy.plans.overSuffix}`}{" "}
                      · cap {formatINR(row.estimate)}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
