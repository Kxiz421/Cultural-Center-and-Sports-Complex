"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PERIODS = [
  { value: "day", label: "Day" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

const GROUP_OPTIONS = [
  { value: "particular", label: "Per Particular" },
  { value: "facility", label: "Per Facility" },
];

const MONTHS = [
  { value: "0", label: "January" },
  { value: "1", label: "February" },
  { value: "2", label: "March" },
  { value: "3", label: "April" },
  { value: "4", label: "May" },
  { value: "5", label: "June" },
  { value: "6", label: "July" },
  { value: "7", label: "August" },
  { value: "8", label: "September" },
  { value: "9", label: "October" },
  { value: "10", label: "November" },
  { value: "11", label: "December" },
];

const PIE_COLORS = [
  "#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed",
  "#0891b2", "#db2777", "#65a30d", "#ea580c", "#4f46e5",
  "#0d9488", "#a16207",
];

function formatPhp(amount) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(Number(amount) || 0);
}

function recentYears(count = 6) {
  const current = new Date().getFullYear();
  return Array.from({ length: count }, (_, i) => String(current - i));
}

/** Point on a circle at `fraction` of a full turn, starting at 12 o'clock. */
function polar(cx, cy, r, fraction) {
  const angle = fraction * 2 * Math.PI - Math.PI / 2;
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
}

function slicePath(cx, cy, r, start, end) {
  if (end - start >= 0.9999) {
    // A lone slice is a full circle; an arc cannot close on itself.
    return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`;
  }
  const [x1, y1] = polar(cx, cy, r, start);
  const [x2, y2] = polar(cx, cy, r, end);
  const largeArc = end - start > 0.5 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}

/**
 * Revenue Analytics: a trend bar chart plus a facility / particular pie chart,
 * filterable by period (day, month, year) and grouping. Venue scoping is applied
 * server-side, so a Program Coordinator only ever sees their own venue.
 */
export function RevenueCharts({
  title = "Revenue Analytics",
  description = "Collected revenue over time and per facility or particular.",
}) {
  const today = React.useMemo(() => new Date(), []);
  const [period, setPeriod] = React.useState("month");
  const [group, setGroup] = React.useState("particular");
  const [year, setYear] = React.useState(String(today.getFullYear()));
  const [month, setMonth] = React.useState(String(today.getMonth()));
  const [day, setDay] = React.useState(String(today.getDate()));
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;

    async function load() {
      const query = new URLSearchParams({ period, year, month, day, group });
      try {
        const res = await fetch(
          `/api/dashboard/revenue-charts?${query.toString()}`,
        );
        const json = await res.json();
        if (active) setData(res.ok ? json : null);
      } catch {
        if (active) setData(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [period, year, month, day, group]);

  const trend = data?.trend || [];
  const breakdown = data?.breakdown || [];
  const total = data?.total || 0;
  const allowedGroups = data?.allowedGroups || ["particular", "facility"];
  const groupOptions = GROUP_OPTIONS.filter((option) =>
    allowedGroups.includes(option.value),
  );
  const selectedGroup = allowedGroups.includes(group) ? group : allowedGroups[0];

  const maxTrend = Math.max(1, ...trend.map((bucket) => bucket.amount));
  const pieTotal = breakdown.reduce((sum, row) => sum + row.amount, 0) || 1;

  // Running totals, built without mutating anything during render.
  const cumulative = breakdown.reduce(
    (acc, row) => [...acc, (acc[acc.length - 1] ?? 0) + row.amount],
    [],
  );
  const slices = breakdown.map((row, index) => ({
    ...row,
    start: (index === 0 ? 0 : cumulative[index - 1]) / pieTotal,
    end: cumulative[index] / pieTotal,
    color: PIE_COLORS[index % PIE_COLORS.length],
    percent: (row.amount / pieTotal) * 100,
  }));

  const daysInMonth = new Date(Number(year), Number(month) + 1, 0).getDate();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {data?.scopeLabel ? `${description} ${data.scopeLabel}.` : description}
        </CardDescription>
        <div className="flex flex-wrap items-end gap-3 pt-3">
          <div className="space-y-1">
            <span className="text-muted-foreground text-xs">Period</span>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIODS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <span className="text-muted-foreground text-xs">Year</span>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-[110px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {recentYears().map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(period === "month" || period === "day") && (
            <div className="space-y-1">
              <span className="text-muted-foreground text-xs">Month</span>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {period === "day" && (
            <div className="space-y-1">
              <span className="text-muted-foreground text-xs">Day</span>
              <Select value={day} onValueChange={setDay}>
                <SelectTrigger className="w-[90px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {Array.from({ length: daysInMonth }, (_, i) => String(i + 1)).map(
                    (option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1">
            <span className="text-muted-foreground text-xs">Group by</span>
            <Select value={selectedGroup} onValueChange={setGroup}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {groupOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="ml-auto text-right">
            <span className="text-muted-foreground text-xs">Total</span>
            <p className="text-lg font-semibold tabular-nums">
              {loading ? "…" : formatPhp(total)}
            </p>
            {data?.label && (
              <span className="text-muted-foreground text-xs">{data.label}</span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="grid gap-8 lg:grid-cols-2">
        {/* Trend bar chart */}
        <div className="space-y-2">
          <p className="text-sm font-medium">
            Revenue per {period === "year" ? "month" : period === "day" ? "hour" : "day"}
          </p>
          {trend.length === 0 || loading ? (
            <p className="text-muted-foreground py-12 text-center text-sm">
              {loading ? "Loading…" : "No data for this period."}
            </p>
          ) : (
            <div className="flex h-52 items-end gap-1 overflow-x-auto pb-2">
              {trend.map((bucket, index) => {
                const pct = (bucket.amount / maxTrend) * 100;
                return (
                  <div
                    key={index}
                    className="flex min-w-[14px] flex-1 flex-col items-center gap-1"
                    title={`${bucket.label}: ${formatPhp(bucket.amount)}`}
                  >
                    <div className="flex w-full flex-1 items-end">
                      <div
                        className="bg-primary/80 hover:bg-primary w-full rounded-t transition-all"
                        style={{ height: `${bucket.amount > 0 ? Math.max(pct, 2) : 0}%` }}
                      />
                    </div>
                    <span className="text-muted-foreground text-[10px] whitespace-nowrap">
                      {bucket.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Breakdown pie chart */}
        <div className="space-y-2">
          <p className="text-sm font-medium">
            Share per {selectedGroup === "facility" ? "facility" : "particular"}
          </p>
          {breakdown.length === 0 || loading ? (
            <p className="text-muted-foreground py-12 text-center text-sm">
              {loading ? "Loading…" : "No revenue in this period."}
            </p>
          ) : (
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <svg viewBox="0 0 140 140" className="size-44 shrink-0">
                {slices.map((slice, index) => (
                  <path
                    key={index}
                    d={slicePath(70, 70, 66, slice.start, slice.end)}
                    fill={slice.color}
                    stroke="var(--background)"
                    strokeWidth={1}
                  >
                    <title>{`${slice.label}: ${formatPhp(slice.amount)} (${slice.percent.toFixed(1)}%)`}</title>
                  </path>
                ))}
              </svg>
              <ul className="w-full space-y-1.5">
                {slices.map((slice, index) => (
                  <li
                    key={index}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="size-3 shrink-0 rounded-sm"
                        style={{ backgroundColor: slice.color }}
                      />
                      <span className="truncate">{slice.label}</span>
                    </span>
                    <span className="shrink-0 tabular-nums">
                      {formatPhp(slice.amount)}
                      <span className="text-muted-foreground ml-2 text-xs">
                        {slice.percent.toFixed(1)}%
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default RevenueCharts;
