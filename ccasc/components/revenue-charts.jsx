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
  { value: "particular", label: "Particulars" },
  { value: "package", label: "Packages" },
  { value: "facility", label: "Facilities" },
];

const GROUP_NOUN = {
  particular: "particular",
  package: "package",
  facility: "facility",
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

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

export function RevenueCharts({
  title = "Revenue Analytics",
  description = "Revenue over time and what it is made of.",
}) {
  const today = React.useMemo(() => new Date(), []);
  const [period, setPeriod] = React.useState("month");
  const [year, setYear] = React.useState(String(today.getFullYear()));
  const [month, setMonth] = React.useState("all");
  const [group, setGroup] = React.useState("");
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [activeSlice, setActiveSlice] = React.useState(null);
  const [selectedItem, setSelectedItem] = React.useState("all");
  const [legendPage, setLegendPage] = React.useState(1);

  React.useEffect(() => {
    let active = true;

    async function load() {
      const params = new URLSearchParams({ period, year });
      if (group) params.set("group", group);
      if (group === "particular" && selectedItem !== "all") {
        params.set("particularId", selectedItem);
      }
      if (group === "package" && selectedItem !== "all") {
        params.set("packageId", selectedItem);
      }
      if (period === "month" && month !== "all") params.set("month", month);
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
  }, [period, year, group, month, selectedItem]);

  const graph = data?.graph || [];
  const pie = data?.pie || [];
  const series = data?.series || [];
  const total = data?.total || 0;
  const allowedGroups = data?.allowedGroups || ["particular"];
  const groupOptions = GROUP_OPTIONS.filter((option) =>
    allowedGroups.includes(option.value),
  );
  const activeGroup = allowedGroups.includes(group) ? group : allowedGroups[0];
  const activeNoun = GROUP_NOUN[activeGroup] || "item";
  const itemOptions =
    activeGroup === "particular"
      ? data?.particularOptions || []
      : activeGroup === "package"
        ? data?.packageOptions || []
        : [];

  React.useEffect(() => {
    setSelectedItem("all");
  }, [group]);

  React.useEffect(() => {
    setLegendPage(1);
  }, [period, year, group, month, selectedItem, data]);

  React.useEffect(() => {
    if (data?.group && !group) setGroup(data.group);
  }, [data, group]);

  const maxGraph = Math.max(1, ...graph.map((bucket) => bucket.amount));

  const selectedBar =
    period === "month" && month !== "all" ? Number(month) - 1 : null;

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

  const LEGEND_PAGE_SIZE = 8;
  const legendTotalPages = Math.max(
    1,
    Math.ceil(slices.length / LEGEND_PAGE_SIZE),
  );
  const safeLegendPage = Math.min(legendPage, legendTotalPages);
  const legendStart = (safeLegendPage - 1) * LEGEND_PAGE_SIZE;
  const legendSlices = slices.slice(
    legendStart,
    legendStart + LEGEND_PAGE_SIZE,
  );
  const colorByKey = {};
  slices.forEach((slice) => {
    colorByKey[slice.key] = slice.color;
  });

  const selectMonth = (index) => {
    if (period !== "month") return;
    const value = String(index + 1);
    setMonth((current) => (current === value ? "all" : value));
  };

  const periodLabel =
    period === "week"
      ? "per week"
      : period === "year"
        ? "per year"
        : "per month";

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
              <SelectContent position="popper" className="max-h-60">
                {PERIODS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {period === "month" && (
            <>
              <div className="space-y-1">
                <span className="text-muted-foreground text-xs">Year</span>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger className="w-[110px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" className="max-h-60">
                    {recentYears().map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <span className="text-muted-foreground text-xs">Month</span>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" className="max-h-60">
                    <SelectItem value="all">All months</SelectItem>
                    {MONTH_NAMES.map((name, index) => (
                      <SelectItem key={name} value={String(index + 1)}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div className="space-y-1">
            <span className="text-muted-foreground text-xs">Break down by</span>
            <Select value={activeGroup} onValueChange={setGroup}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-60">
                {groupOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(activeGroup === "particular" || activeGroup === "package") &&
            itemOptions.length > 0 && (
              <div className="space-y-1">
                <span className="text-muted-foreground text-xs">
                  Which {activeGroup === "particular" ? "particular" : "package"}
                </span>
                <Select value={selectedItem} onValueChange={setSelectedItem}>
                  <SelectTrigger className="w-[190px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" className="max-h-60 overflow-y-auto">
                    <SelectItem value="all">
                      All{" "}
                      {activeGroup === "particular" ? "particulars" : "packages"}
                    </SelectItem>
                    {itemOptions.map((option) => (
                      <SelectItem key={option.id} value={String(option.id)}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

          <div className="ml-auto text-right">
            <span className="text-muted-foreground text-xs">Total</span>
            <p className="text-lg font-semibold tabular-nums">
              {loading ? "…" : formatPhp(total)}
            </p>
            <span className="text-muted-foreground text-xs">
              {data?.month
                ? `${MONTH_NAMES[data.month - 1]} ${data.year}`
                : data?.label || ""}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-8">
        <div className="space-y-3">
          <p className="text-sm font-medium">
            Revenue &amp; usage per {activeNoun}
          </p>
          {loading || pie.length === 0 ? (
            <p className="text-muted-foreground py-16 text-center text-sm">
              {loading
                ? "Loading…"
                : data?.month
                  ? "No revenue in this month."
                  : "No revenue in this period."}
            </p>
          ) : (
            <>
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
                  {slices.map((slice, index) => {
                    const isActive = activeSlice === index;
                    const isDimmed = activeSlice !== null && !isActive;
                    return (
                      <path
                        key={index}
                        d={slicePath(80, 80, 74, slice.start, slice.end)}
                        fill={slice.color}
                        stroke="var(--background)"
                        strokeWidth={1.5}
                        opacity={isDimmed ? 0.35 : 1}
                        tabIndex={0}
                        role="img"
                        aria-label={`${slice.label}: ${formatPhp(slice.amount)} (${slice.percent}%)`}
                        onMouseEnter={() => setActiveSlice(index)}
                        onMouseLeave={() => setActiveSlice(null)}
                        onFocus={() => setActiveSlice(index)}
                        onBlur={() => setActiveSlice(null)}
                        style={{
                          cursor: "pointer",
                          transformOrigin: "80px 80px",
                          transform: isActive ? "scale(1.04)" : "scale(1)",
                          transition:
                            "opacity 150ms ease, transform 150ms ease, filter 150ms ease",
                          filter: isActive
                            ? `brightness(1.15) drop-shadow(0 0 9px ${slice.color})`
                            : undefined,
                        }}
                      >
                        <title>{`${slice.label}: ${formatPhp(slice.amount)} (${slice.percent}%)`}</title>
                      </path>
                    );
                  })}
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

              <ul className="w-full space-y-1">
                {legendSlices.map((slice, offset) => {
                  const index = legendStart + offset;
                  const isActive = activeSlice === index;
                  return (
                    <li
                      key={index}
                      onMouseEnter={() => setActiveSlice(index)}
                      onMouseLeave={() => setActiveSlice(null)}
                      className={`flex items-start justify-between gap-3 rounded-md px-2 py-1 text-sm transition-colors ${
                        isActive ? "bg-muted" : ""
                      }`}
                    >
                      <span className="flex min-w-0 items-start gap-2">
                        <span
                          className="mt-1 size-3 shrink-0 rounded-full shadow-sm transition-shadow"
                          style={{
                            backgroundColor: slice.color,
                            boxShadow: isActive
                              ? `0 0 10px ${slice.color}`
                              : undefined,
                          }}
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
                  );
                })}
              </ul>
            </div>
            {slices.length > LEGEND_PAGE_SIZE && (
              <div className="flex items-center justify-between gap-2 pt-2 text-xs">
                <span className="text-muted-foreground">
                  {legendStart + 1}–
                  {Math.min(legendStart + LEGEND_PAGE_SIZE, slices.length)} of{" "}
                  {slices.length}
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="rounded-md border px-2 py-1 disabled:opacity-40"
                    disabled={safeLegendPage <= 1}
                    onClick={() => setLegendPage((p) => Math.max(1, p - 1))}
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    className="rounded-md border px-2 py-1 disabled:opacity-40"
                    disabled={safeLegendPage >= legendTotalPages}
                    onClick={() =>
                      setLegendPage((p) => Math.min(legendTotalPages, p + 1))
                    }
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
            </>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">
              Revenue {periodLabel}
            </p>
          </div>
          {loading || graph.length === 0 ? (
            <p className="text-muted-foreground py-16 text-center text-sm">
              {loading ? "Loading…" : "No data for this period."}
            </p>
          ) : (
            <svg
              viewBox="0 0 640 220"
              className="h-56 w-full"
              role="img"
              aria-label={`Revenue ${periodLabel}`}
            >
              {[0, 25, 50, 75, 100].map((line) => {
                const y = 190 - (line / 100) * 160;
                return (
                  <g key={line}>
                    <line
                      x1="44"
                      x2="624"
                      y1={y}
                      y2={y}
                      stroke="var(--border)"
                      strokeWidth="1"
                    />
                    <text
                      x="38"
                      y={y + 3}
                      textAnchor="end"
                      className="fill-muted-foreground text-[8px]"
                    >
                      {Math.round((maxGraph * line) / 100).toLocaleString()}
                    </text>
                  </g>
                );
              })}
              {(() => {
                const step = graph.length > 1 ? 580 / (graph.length - 1) : 0;
                const yFor = (amount) =>
                  190 - ((Number(amount) || 0) / maxGraph) * 160;
                const lines =
                  series.length > 0
                    ? series.map((s, index) => ({
                        key: s.key,
                        color:
                          colorByKey[s.key] ||
                          PIE_COLORS[index % PIE_COLORS.length],
                        points: s.points.map((point) => point.amount),
                      }))
                    : [
                        {
                          key: "__total__",
                          color: "var(--primary)",
                          points: graph.map((bucket) => bucket.amount),
                        },
                      ];
                return (
                  <>
                    {lines.map((line) => (
                      <path
                        key={line.key}
                        d={line.points
                          .map(
                            (amount, index) =>
                              `${index === 0 ? "M" : "L"} ${44 + step * index} ${yFor(amount)}`,
                          )
                          .join(" ")}
                        fill="none"
                        stroke={line.color}
                        strokeWidth="2"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                    ))}
                    {graph.map((bucket, index) => (
                      <text
                        key={index}
                        x={44 + step * index}
                        y={210}
                        textAnchor="middle"
                        className="fill-muted-foreground text-[8px]"
                      >
                        {bucket.label}
                      </text>
                    ))}
                  </>
                );
              })()}
            </svg>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default RevenueCharts;
