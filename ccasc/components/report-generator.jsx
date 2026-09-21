"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileBarChart, Download, FileSpreadsheet } from "lucide-react";
import {
  REPORT_MONTHS,
  REPORT_PERIODS,
  REPORT_VENUES,
  REPORT_WEEKS,
  reportYears,
  resolvePeriodRange,
} from "@/lib/report-period";

/**
 * Identical chrome for every "Report Generation" screen.
 *
 * Admin, Accounting Clerk, Local Treasury Officer and Program Coordinator all
 * render `ReportPageHeader` + `ReportControls`, so the generation UI is the
 * same everywhere and Monthly / Weekly / Yearly always lives in the same
 * dropdown in the same place.
 */

function Field({ label, children, className = "" }) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function ReportPageHeader({ title = "Report Generation", description }) {
  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="text-muted-foreground text-sm">
        {description ||
          "Generate a monthly, weekly or yearly list of activities. Every report uses the same format and can be printed or exported."}
      </p>
    </div>
  );
}

export function ReportControls({
  period,
  onPeriodChange,
  month,
  onMonthChange,
  year,
  onYearChange,
  week,
  onWeekChange,
  venue,
  onVenueChange,
  onGenerate,
  loading = false,
  years,
  extra,
}) {
  const yearOptions = years || reportYears(5);
  const showMonth = period === "m" || period === "w";
  const preview = resolvePeriodRange({ period, year, month, week });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Report Configuration</CardTitle>
        <CardDescription>
          Pick a report period, then generate.{" "}
          <span className="text-foreground font-medium">
            {preview.rangeLabel}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-end gap-4">
          <Field label="Report Period" className="w-[180px]">
            <Select value={period} onValueChange={onPeriodChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_PERIODS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {showMonth && (
            <Field label="Month" className="w-[170px]">
              <Select value={String(month)} onValueChange={onMonthChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_MONTHS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          {period === "w" && (
            <Field label="Week" className="w-[170px]">
              <Select value={String(week)} onValueChange={onWeekChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select week" />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_WEEKS.map((w) => (
                    <SelectItem key={w.value} value={w.value}>
                      {w.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          <Field label="Year" className="w-[120px]">
            <Select value={String(year)} onValueChange={onYearChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {onVenueChange && (
            <Field label="Venue" className="w-[180px]">
              <Select value={venue} onValueChange={onVenueChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Venues" />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_VENUES.map((v) => (
                    <SelectItem key={v.value} value={v.value}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          {extra}

          <Button onClick={onGenerate} disabled={loading} className="gap-2">
            <FileBarChart className="size-4" />
            {loading ? "Generating..." : "Generate Report"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function ReportEmptyState({
  title = "No report generated yet",
  description = "Choose a report period above, then click Generate Report.",
  icon: Icon = FileBarChart,
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16">
        <Icon className="text-muted-foreground mb-4 size-16" />
        <p className="text-center text-sm font-medium">{title}</p>
        <p className="text-muted-foreground mt-1 max-w-md text-center text-sm">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}

export function ReportActions({ onExportPdf, onExportCsv, disabled = false }) {
  return (
    <div className="flex flex-wrap justify-end gap-3">
      {onExportCsv && (
        <Button
          variant="outline"
          className="gap-2"
          onClick={onExportCsv}
          disabled={disabled}
        >
          <FileSpreadsheet className="size-4" />
          Export CSV
        </Button>
      )}
      <Button
        variant="outline"
        className="gap-2"
        onClick={onExportPdf}
        disabled={disabled}
      >
        <Download className="size-4" />
        Export PDF
      </Button>
    </div>
  );
}

