import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  Cell as BarCell,
} from "recharts";
import { PieChart as PieIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/common/EmptyState";
import { formatINR } from "@/lib/format";
import { copy } from "../copy";
import type { BucketSpend, DailyPoint } from "../computations";

const DONUT_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#06b6d4",
  "#f43f5e",
  "#a3e635",
];

export function CategoryDonut({ data }: { data: BucketSpend[] }) {
  const slices = data
    .filter((c) => c.spent > 0)
    .map((c) => ({ name: c.category.name, value: c.spent }))
    .sort((a, b) => b.value - a.value);

  const total = slices.reduce((s, x) => s + x.value, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{copy.charts.donut}</CardTitle>
      </CardHeader>
      <CardContent>
        {slices.length === 0 ? (
          <EmptyState icon={PieIcon} title={copy.charts.donutEmpty} />
        ) : (
          <div className="flex items-center gap-4">
            <div className="relative h-40 w-40 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={slices}
                    dataKey="value"
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {slices.map((_, i) => (
                      <Cell
                        key={i}
                        fill={DONUT_COLORS[i % DONUT_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => formatINR(v)}
                    contentStyle={tooltipStyle}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[11px] text-muted-foreground">Total</span>
                <span className="text-sm font-bold tabular-nums">
                  {formatINR(total)}
                </span>
              </div>
            </div>
            <ul className="flex-1 space-y-1.5 text-sm">
              {slices.slice(0, 6).map((s, i) => (
                <li key={s.name} className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length],
                    }}
                  />
                  <span className="flex-1 truncate text-muted-foreground">
                    {s.name}
                  </span>
                  <span className="tabular-nums">{formatINR(s.value)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function DailySpendChart({ data }: { data: DailyPoint[] }) {
  const hasData = data.some((d) => d.amount > 0);
  const max = Math.max(...data.map((d) => d.amount), 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{copy.charts.daily}</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {copy.charts.dailyEmpty}
          </p>
        ) : (
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  interval={4}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))" }}
                  formatter={(v: number) => formatINR(v)}
                  labelFormatter={(l) => `Day ${l}`}
                  contentStyle={tooltipStyle}
                />
                <Bar dataKey="amount" radius={[3, 3, 0, 0]}>
                  {data.map((d) => (
                    <BarCell
                      key={d.date}
                      fill={
                        d.amount >= max && max > 0
                          ? "#f43f5e"
                          : "hsl(var(--primary))"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const tooltipStyle = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "0.75rem",
  fontSize: "12px",
  color: "hsl(var(--popover-foreground))",
} as const;
