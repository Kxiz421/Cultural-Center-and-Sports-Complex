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
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
  { value: "year", label: "Yearly" },
];

const GROUP_OPTIONS = [
  { value: "particular", label: "Per Particular" },
  { value: "package", label: "Per Package" },
  { value: "facility", label: "Per Facility" },
];

const GROUP_NOUN = {
  particular: "particular",
  package: "package",
  facility: "facility",
};

const PIE_COLORS = [
  "#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2",
  "#db2777", "#65a30d", "#ea580c", "#4f46e5", "#0d9488", "#a16207",
];

function formatPhp(amount) {
  const value = Number(amount) || 0;
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
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
    return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`;
  }
  const [x1, y1] = polar(cx, cy, r, start);
  const [x2, y2] = polar(cx, cy, r, end);
  const largeArc = end - start > 0.5 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}

/**
 * Revenue Analytics: a time-based revenue graph (weekly / monthly / yearly)
 * plus a breakdown pie of what that revenue is made of - particulars and
 * packages for the Cultural Center, facilities for the Sports Complex. Venue
 * scoping is applied server-side, so a Program Coordinator only ever sees
 * their own venue.
 */
export function RevenueCharts({
  title = "Revenue Analytics",
  description = "Revenue over time and what it is made of.",
}) {
  const today = React.useMemo(() => new Date(), []);
  const [period, setPeriod] = React.useState("month");
  const [year, setYear] = React.useState(String(today.getFullYear()));
  const [group, setGroup] = React.useState("");
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;

    async function load() {
      const params = new URLSearchParams({ period, year });
      if (group) params.set("group", group);
      try {
        const res = await fetch(
          `/api/dashboard/revenue-charts?${params.toString()}`,
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
  }, [period, year, group]);

  const graph = data?.graph || [];
  const pie = data?.pie || [];
  const total = data?.total || 0;
  const allowedGroups = data?.allowedGroups || ["particular"];
  const groupOptions = GROUP_OPTIONS.filter((option) =>
    allowedGroups.includes(option.value),
  );
  const activeGroup = allowedGroups.includes(group) ? group : allowedGroups[0];
  const activeNoun = GROUP_NOUN[activeGroup] || "item";

  const maxGraph = Math.max(1, ...graph.map((bucket) => bucket.amount));

  // Running totals for the pie, built without mutating during render.
  const pieSum = pie.reduce((sum, row) => sum + row.amount, 0) || 1;
  const cumulative = pie.reduce(
    (acc, row) => [...acc, (acc[acc.length - 1] ?? 0) + row.amount],
    [],
  );
  const slices = pie.map((row, index) => ({
    ...row,
    start: (index === 0 ? 0 : cumulative[index - 1]) / pieSum,
    end: cumulative[index] / pieSum,
    color: PIE_COLORS[index % PIE_COLORS.length],
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {data?.scopeLabel ? `${description} ${data.scopeLabel}.` : description}
        </CardDescription>

        <div className="flex flex-wrap items-end gap-3 pt-3">
          <div className="space-y-1">
            <span className="text-muted-foreground text-xs">Show revenue</span>
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

          {period === "month" && (
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
          )}

          <div className="space-y-1">
            <span className="text-muted-foreground text-xs">Break down by</span>
            <Select value={activeGroup} onValueChange={setGroup}>
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
        {/* Revenue graph */}
        <div className="space-y-3">
          <p className="text-sm font-medium">
            Revenue{" "}
            {period === "week"
              ? "per week"
              : period === "year"
                ? "per year"
                : "per month"}
          </p>
          {loading || graph.length === 0 ? (
            <p className="text-muted-foreground py-16 text-center text-sm">
              {loading ? "Loading…" : "No data for this period."}
            </p>
          ) : (
            <div className="relative h-56 w-full">
              {/* gridlines */}
              {[0, 25, 50, 75, 100].map((line) => (
                <div
                  key={line}
                  className="border-border/60 absolute inset-x-0 border-t"
                  style={{ bottom: `${line}%` }}
                />
              ))}
              <div className="relative flex h-56 items-end gap-2">
                {graph.map((bucket, index) => {
                  const pct = (bucket.amount / maxGraph) * 100;
                  return (
                    <div
                      key={index}
                      className="group flex h-full flex-1 flex-col items-center justify-end gap-1"
                    >
                      <div className="relative flex w-full flex-1 items-end justify-center">
                        <span className="bg-popover text-popover-foreground border-border pointer-events-none absolute -top-1 z-10 rounded-md border px-2 py-1 text-[11px] font-medium whitespace-nowrap opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                          {formatPhp(bucket.amount)}
                        </span>
                        <div
                          className="from-primary/30 via-primary/70 to-primary w-full max-w-[42px] rounded-t-lg bg-gradient-to-t shadow-[0_-2px_8px_rgba(37,99,235,0.25)] transition-all duration-300 group-hover:brightness-110"
                          style={{ height: `${bucket.amount > 0 ? Math.max(pct, 3) : 0}%` }}
                        />
                      </div>
                      <span className="text-muted-foreground truncate text-[10px] whitespace-nowrap">
                        {bucket.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Breakdown pie */}
        <div className="space-y-3">
          <p className="text-sm font-medium">
            Revenue &amp; usage per {activeNoun}
          </p>
          {loading || pie.length === 0 ? (
            <p className="text-muted-foreground py-16 text-center text-sm">
              {loading ? "Loading…" : "No revenue in this period."}
            </p>
          ) : (
            <div className="flex flex-col items-center gap-6 sm:flex-row">
              <svg viewBox="0 0 160 160" className="size-48 shrink-0">
                <defs>
                  <filter
                    id="pie-depth"
                    x="-25%"
                    y="-25%"
                    width="150%"
                    height="150%"
                  >
                    <feDropShadow
                      dx="0"
                      dy="3"
                      stdDeviation="4"
                      floodColor="#0f172a"
                      floodOpacity="0.28"
                    />
                  </filter>
                  <radialGradient id="pie-sheen" cx="34%" cy="28%" r="78%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
                    <stop offset="55%" stopColor="#ffffff" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <g filter="url(#pie-depth)">
                  {slices.map((slice, index) => (
                    <path
                      key={index}
                      d={slicePath(80, 80, 74, slice.start, slice.end)}
                      fill={slice.color}
                      stroke="var(--background)"
                      strokeWidth={1.5}
                    >
                      <title>{`${slice.label}: ${formatPhp(slice.amount)} (${slice.percent}%)`}</title>
                    </path>
                  ))}
                </g>
                <circle
                  cx="80"
                  cy="80"
                  r="74"
                  fill="url(#pie-sheen)"
                  pointerEvents="none"
                />
                <circle cx="80" cy="80" r="42" fill="var(--card)" />
                <text
                  x="80"
                  y="74"
                  textAnchor="middle"
                  className="fill-muted-foreground text-[9px]"
                >
                  Total
                </text>
                <text
                  x="80"
                  y="90"
                  textAnchor="middle"
                  className="fill-foreground text-[12px] font-semibold"
                >
                  {formatPhp(total)}
                </text>
              </svg>

              <ul className="w-full space-y-2">
                {slices.map((slice, index) => (
                  <li
                    key={index}
                    className="flex items-start justify-between gap-3 text-sm"
                  >
                    <span className="flex min-w-0 items-start gap-2">
                      <span
                        className="mt-1 size-3 shrink-0 rounded-full shadow-sm"
                        style={{ backgroundColor: slice.color }}
                      />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {slice.label}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {slice.reservations} reservation
                          {slice.reservations === 1 ? "" : "s"}
                          {slice.quantity > 0 ? ` · ${slice.quantity} unit${slice.quantity === 1 ? "" : "s"}` : ""}
                        </span>
                      </span>
                    </span>
                    <span className="shrink-0 text-right tabular-nums">
                      <span className="block font-medium">
                        {formatPhp(slice.amount)}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {slice.percent}%
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
