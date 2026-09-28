"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, FileBarChart } from "lucide-react";
import {
  ReportActions,
  ReportEmptyState,
  ReportPageHeader,
} from "@/components/report-generator";
import ReportParticularsDocument from "@/components/report-particulars-document";
import { downloadParticularsCsv } from "@/lib/report-particulars-export";
import {
  MOVEMENT_FILTERS,
  PARTICULARS_REPORT_PERIODS,
  resolveParticularsReportRange,
  todayDateInput,
} from "@/lib/report-particulars";
import { REPORT_MONTHS, REPORT_WEEKS, reportYears } from "@/lib/report-period";

/**
 * "Particulars Report" screen.
 *
 * Sibling of the shared `ReportGenerationScreen`: same card chrome, same
 * Generate / Export CSV / Export PDF actions, but the subject is a particular
 * instead of a booking. It answers "what was restocked, what was damaged, when,
 * and by whom" for one particular or all of them over a Monthly, Weekly,
 * Yearly or single-day period.
 *
 * Served by `/api/particulars/reports`, which returns the per-particular
 * summary plus the chronological movement log.
 *
 * @param {object} props
 * @param {string} [props.backHref] panel page the report was opened from
 * @param {string} [props.description] header copy under the page title
 */
export function ParticularsReportScreen({
  backHref = "/panel/admin/particulars",
  description,
}) {
  const [particulars, setParticulars] = React.useState([]);
  const [particularId, setParticularId] = React.useState("all");
  const [period, setPeriod] = React.useState("m");
  const [movement, setMovement] = React.useState("all");
  const [month, setMonth] = React.useState(String(new Date().getMonth()));
  const [week, setWeek] = React.useState("1");
  const [year, setYear] = React.useState(String(new Date().getFullYear()));
  const [date, setDate] = React.useState(todayDateInput());
  const [report, setReport] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  // Particular list for the entity selector. Read-only, so a failed fetch just
  // leaves the selector with "All Particulars".
  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/particulars")
      .then((res) => (res.ok ? res.json() : []))
      .then((list) => {
        if (cancelled) return;
        setParticulars(
          (Array.isArray(list) ? list : []).map((item) => ({
            value: String(item.particularId),
            label: item.particularName || `Particular ${item.particularId}`,
          }))
        );
      })
      .catch(() => {
        if (!cancelled) setParticulars([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const showMonth = period === "m" || period === "w";
  const showWeek = period === "w";
  const showYear = period !== "d";
  const preview = resolveParticularsReportRange({
    period,
    year,
    month,
    week,
    date,
  });

  /** Switching particulars invalidates the document already on screen. */
  const changeParticular = (value) => {
    setParticularId(value);
    setReport(null);
  };

  /** Same for the movement type: a stale document would misstate the filter. */
  const changeMovement = (value) => {
    setMovement(value);
    setReport(null);
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ period, month, week, year, date });
      if (particularId !== "all") params.set("particularId", particularId);
      params.set("movement", movement);

      const res = await fetch(`/api/particulars/reports?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to generate report");

      setReport(await res.json());
      toast.success("Report generated successfully");
    } catch (err) {
      toast.error(err.message || "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = () => {
    if (downloadParticularsCsv(report)) {
      toast.success("Report exported as CSV");
    } else {
      toast.error("No data to export");
    }
  };

  const handleExportPdf = () => {
    if (typeof window !== "undefined") window.print();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="no-print flex flex-col gap-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit gap-2">
          <Link href={backHref}>
            <ArrowLeft className="size-4" />
            Back to Particulars
          </Link>
        </Button>
        <ReportPageHeader
          title="Particulars Report Generation"
          description={
            description ||
            "Generate a monthly, weekly, yearly or single-day report of every restocking and damage record of a particular — or of all particulars — with the date and the staff member behind each entry."
          }
        />
      </div>

      <div className="no-print">
        <Card>
          <CardHeader>
            <CardTitle>Report Configuration</CardTitle>
            <CardDescription>
              Pick a particular and a period, then generate.{" "}
              <span className="text-foreground font-medium">
                {preview.rangeLabel}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Particular" className="w-[260px]">
                <Select value={particularId} onValueChange={changeParticular}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Particulars" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Particulars</SelectItem>
                    {particulars.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Period" className="w-[180px]">
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Monthly" />
                  </SelectTrigger>
                  <SelectContent>
                    {PARTICULARS_REPORT_PERIODS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Movement" className="w-[200px]">
                <Select value={movement} onValueChange={changeMovement}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Restocked & Damaged" />
                  </SelectTrigger>
                  <SelectContent>
                    {MOVEMENT_FILTERS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {showMonth && (
                <Field label="Month" className="w-[180px]">
                  <Select value={month} onValueChange={setMonth}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                      {REPORT_MONTHS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}

              {showWeek && (
                <Field label="Week" className="w-[180px]">
                  <Select value={week} onValueChange={setWeek}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Week" />
                    </SelectTrigger>
                    <SelectContent>
                      {REPORT_WEEKS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}

              {showYear && (
                <Field label="Year" className="w-[130px]">
                  <Select value={year} onValueChange={setYear}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {reportYears().map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}

              {period === "d" && (
                <Field label="Specific Date" className="w-[200px]">
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </Field>
              )}

              <Button
                onClick={handleGenerate}
                disabled={loading}
                className="gap-2"
              >
                <FileBarChart className="size-4" />
                {loading ? "Generating..." : "Generate Report"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {report ? (
        <>
          <div className="no-print">
            <ReportActions
              onExportPdf={handleExportPdf}
              onExportCsv={handleExportCsv}
            />
          </div>
          <ReportParticularsDocument report={report} />
        </>
      ) : (
        <div className="no-print">
          <ReportEmptyState
            title="No report generated yet"
            description="Choose a particular and a period above, then click Generate Report. The report lists every restocking and damage record of the period, with the date and the staff member behind each entry."
          />
        </div>
      )}
    </div>
  );
}

/** Same labelled-field wrapper the shared report controls use. */
function Field({ label, children, className = "" }) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
