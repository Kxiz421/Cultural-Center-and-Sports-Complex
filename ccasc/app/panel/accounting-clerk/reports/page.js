"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Download, FileText } from "lucide-react";
import {
  MOCK_MONTHLY_REVENUE,
  MOCK_RESERVATIONS,
  formatPhp,
} from "@/lib/data/accounting-mock";

export default function ReportGenerationPage() {
  const [reportType, setReportType] = React.useState("monthly");
  const [selectedMonth, setSelectedMonth] = React.useState("");
  const [selectedYear, setSelectedYear] = React.useState("2026");

  const totalYearlyClientRevenue = MOCK_MONTHLY_REVENUE.reduce(
    (sum, m) => sum + m.clientRevenue,
    0
  );
  const totalYearlyPGOCharges = MOCK_MONTHLY_REVENUE.reduce(
    (sum, m) => sum + m.pgoCharges,
    0
  );
  const totalYearlyRevenue = totalYearlyClientRevenue + totalYearlyPGOCharges;

  const selectedMonthData = selectedMonth
    ? MOCK_MONTHLY_REVENUE.find(
        (m) =>
          m.month.toLowerCase() === selectedMonth.toLowerCase()
      )
    : null;

  const handleGenerate = () => {
    if (reportType === "monthly" && !selectedMonth) {
      toast.error("Please select a month.");
      return;
    }
    toast.success(
      `${
        reportType === "monthly" ? "Monthly" : "Yearly"
      } report generated successfully. You can now download or view it.`
    );
  };

  const handleExportPDF = () => {
    toast.success("Report exported as PDF and ready for printing.");
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Report Generation
        </h2>
        <p className="text-muted-foreground text-sm">
          Generate summarized financial reports — monthly revenue, PGO charges,
          and yearly summaries. Export as PDF for filing and presentation.
        </p>
      </div>

      {/* Report Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Report Configuration</CardTitle>
          <CardDescription>
            Select report type and parameters, then generate.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Report Type</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly Report</SelectItem>
                  <SelectItem value="yearly">Yearly Summary</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {reportType === "monthly" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Month</label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {MOCK_MONTHLY_REVENUE.map((m) => (
                      <SelectItem key={m.month} value={m.month}>
                        {m.month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Year</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2026">2026</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleGenerate} className="gap-2">
              <FileText className="size-4" />
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Report Preview */}
      {reportType === "monthly" && selectedMonthData && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>
                Monthly Revenue Report — {selectedMonth} {selectedYear}
              </CardTitle>
              <CardDescription>
                Detailed revenue breakdown for the selected period.
              </CardDescription>
            </div>
            <Button variant="outline" className="gap-2" onClick={handleExportPDF}>
              <Download className="size-4" />
              Export PDF
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-muted-foreground text-xs font-medium">
                    CLIENT REVENUE
                  </p>
                  <p className="text-2xl font-bold tabular-nums text-primary">
                    {formatPhp(selectedMonthData.clientRevenue)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-medium">
                    PGO CHARGES BILLED
                  </p>
                  <p className="text-2xl font-bold tabular-nums text-primary">
                    {formatPhp(selectedMonthData.pgoCharges)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-medium">
                    TOTAL
                  </p>
                  <p className="text-2xl font-bold tabular-nums">
                    {formatPhp(
                      selectedMonthData.clientRevenue +
                        selectedMonthData.pgoCharges
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <p className="text-muted-foreground mb-3 text-xs font-medium">
                RESERVATIONS IN PERIOD
              </p>
              <div className="space-y-2">
                {MOCK_RESERVATIONS.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{r.id}</span>
                      <span className="font-medium">{r.clientName}</span>
                      <span className="text-muted-foreground">
                        — {r.venue}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          r.payment === "Fully paid" ? "default" : "secondary"
                        }
                      >
                        {r.payment}
                      </Badge>
                      <span className="tabular-nums">
                        {formatPhp(r.amountPaid)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Yearly Report Preview */}
      {reportType === "yearly" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Yearly Revenue Summary — {selectedYear}</CardTitle>
              <CardDescription>
                Complete annual financial overview including client revenue and
                PGO charges.
              </CardDescription>
            </div>
            <Button variant="outline" className="gap-2" onClick={handleExportPDF}>
              <Download className="size-4" />
              Export PDF
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Annual Summary */}
            <div className="rounded-lg border p-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-muted-foreground text-xs font-medium">
                    TOTAL CLIENT REVENUE
                  </p>
                  <p className="text-2xl font-bold tabular-nums text-primary">
                    {formatPhp(totalYearlyClientRevenue)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-medium">
                    TOTAL PGO CHARGES
                  </p>
                  <p className="text-2xl font-bold tabular-nums text-primary">
                    {formatPhp(totalYearlyPGOCharges)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-medium">
                    GRAND TOTAL
                  </p>
                  <p className="text-2xl font-bold tabular-nums">
                    {formatPhp(totalYearlyRevenue)}
                  </p>
                </div>
              </div>
            </div>

            {/* Monthly Breakdown */}
            <div>
              <p className="text-muted-foreground mb-3 text-xs font-medium">
                MONTHLY BREAKDOWN
              </p>
              <div className="space-y-1">
                <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-xs font-semibold">
                  <span className="w-20">Month</span>
                  <span className="w-28 text-right">Client Revenue</span>
                  <span className="w-28 text-right">PGO Charges</span>
                  <span className="w-28 text-right">Total</span>
                </div>
                {MOCK_MONTHLY_REVENUE.map((m) => (
                  <div
                    key={m.month}
                    className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                  >
                    <span className="w-20 font-medium">{m.month}</span>
                    <span className="w-28 text-right tabular-nums">
                      {formatPhp(m.clientRevenue)}
                    </span>
                    <span className="w-28 text-right tabular-nums">
                      {formatPhp(m.pgoCharges)}
                    </span>
                    <span className="w-28 text-right tabular-nums font-medium">
                      {formatPhp(m.clientRevenue + m.pgoCharges)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold">Total Yearly Revenue</span>
              <span className="text-xl font-bold tabular-nums text-primary">
                {formatPhp(totalYearlyRevenue)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}