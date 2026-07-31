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
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  FileBarChart,
  Download,
  DollarSign,
  Building2,
  User,
  Calendar,
} from "lucide-react";

function formatPHP(amount) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount || 0);
}

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

export default function LTOOReportsPage() {
  const [reportMonth, setReportMonth] = React.useState(String(new Date().getMonth()));
  const [reportYear, setReportYear] = React.useState(String(new Date().getFullYear()));
  const [reportData, setReportData] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [generated, setGenerated] = React.useState(false);

  const years = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i));

  const handleGenerateReport = async () => {
    setLoading(true);
    setGenerated(false);
    try {
      const res = await fetch(`/api/ltoo/reports?month=${reportMonth}&year=${reportYear}`);
      if (!res.ok) throw new Error("Failed to generate report");
      const data = await res.json();
      setReportData(data);
      setGenerated(true);
      toast.success("Report generated successfully");
    } catch (err) {
      toast.error(err.message || "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    if (!reportData) return;
    // Create a printable version
    const printWindow = window.open("", "_blank");
    const monthName = MONTHS.find((m) => m.value === reportMonth)?.label || "";
    
    printWindow.document.write(`
      <html>
      <head>
        <title>Revenue Report - ${monthName} ${reportYear}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          h1 { color: #333; font-size: 18px; margin-bottom: 5px; }
          h2 { color: #666; font-size: 14px; font-weight: normal; margin-top: 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #f5f5f5; text-align: left; padding: 8px; border: 1px solid #ddd; }
          td { padding: 8px; border: 1px solid #ddd; }
          .total { font-weight: bold; background: #f9f9f9; }
          .footer { margin-top: 30px; font-size: 12px; color: #999; text-align: center; }
        </style>
      </head>
      <body>
        <h1>Provincial Government of South Cotabato</h1>
        <h2>Gymnasium & Cultural Center / Sports Complex</h2>
        <h2>Monthly Revenue Report - ${monthName} ${reportYear}</h2>
        
        <h3>Client Revenue</h3>
        <table>
          <thead>
            <tr><th>Client</th><th>Activity</th><th>Amount</th><th>Date</th></tr>
          </thead>
          <tbody>
            ${(reportData.clientPayments || []).map(p => `
              <tr>
                <td>${p.clientName}</td>
                <td>${p.activityName || "—"}</td>
                <td>${formatPHP(p.amount)}</td>
                <td>${p.date || "—"}</td>
              </tr>
            `).join("")}
          </tbody>
          <tfoot>
            <tr class="total">
              <td colspan="3">Total Client Revenue</td>
              <td>${formatPHP(reportData.totalClientRevenue)}</td>
            </tr>
          </tfoot>
        </table>

        <h3>Provincial Agency Charges</h3>
        <table>
          <thead>
            <tr><th>Agency</th><th>Activity</th><th>Amount</th><th>Date</th></tr>
          </thead>
          <tbody>
            ${(reportData.provincialPayments || []).map(p => `
              <tr>
                <td>${p.clientName}</td>
                <td>${p.activityName || "—"}</td>
                <td>${formatPHP(p.amount)}</td>
                <td>${p.date || "—"}</td>
              </tr>
            `).join("")}
          </tbody>
          <tfoot>
            <tr class="total">
              <td colspan="3">Total PGO Charges</td>
              <td>${formatPHP(reportData.totalProvincialRevenue)}</td>
            </tr>
          </tfoot>
        </table>

        <h3>Yearly Summary (${reportYear})</h3>
        <table>
          <thead>
            <tr><th>Metric</th><th>Amount</th></tr>
          </thead>
          <tbody>
            <tr><td>Total Client Revenue (Year)</td><td>${formatPHP(reportData.yearlyClientRevenue)}</td></tr>
            <tr><td>Total PGO Charges (Year)</td><td>${formatPHP(reportData.yearlyProvincialRevenue)}</td></tr>
            <tr class="total"><td>Grand Total</td><td>${formatPHP(reportData.yearlyClientRevenue + reportData.yearlyProvincialRevenue)}</td></tr>
          </tbody>
        </table>

        <p class="footer">Generated on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Report Generation</h2>
        <p className="text-muted-foreground text-sm">
          Generate monthly financial reports for client revenue and provincial government charges.
        </p>
      </div>

      {/* Report Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Generate Report</CardTitle>
          <CardDescription>Select month and year to generate a summarized financial report.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="report-month">Month</Label>
              <Select value={reportMonth} onValueChange={setReportMonth}>
                <SelectTrigger id="report-month" className="w-[180px]">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-year">Year</Label>
              <Select value={reportYear} onValueChange={setReportYear}>
                <SelectTrigger id="report-year" className="w-[150px]">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGenerateReport} disabled={loading}>
              <FileBarChart className="mr-2 size-4" />
              {loading ? "Generating..." : "Generate Report"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Results */}
      {generated && reportData && (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Client Revenue</CardTitle>
                <User className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPHP(reportData.totalClientRevenue)}</div>
                <p className="text-xs text-muted-foreground">
                  {MONTHS.find((m) => m.value === reportMonth)?.label} {reportYear}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">PGO Charges</CardTitle>
                <Building2 className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPHP(reportData.totalProvincialRevenue)}</div>
                <p className="text-xs text-muted-foreground">
                  {MONTHS.find((m) => m.value === reportMonth)?.label} {reportYear}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Yearly Total</CardTitle>
                <DollarSign className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatPHP(reportData.yearlyClientRevenue + reportData.yearlyProvincialRevenue)}
                </div>
                <p className="text-xs text-muted-foreground">Year {reportYear}</p>
              </CardContent>
            </Card>
          </div>

          {/* Client Payments Table */}
          <Card>
            <CardHeader>
              <CardTitle>Client Payments</CardTitle>
              <CardDescription>Monthly revenue from private clients and walk-ins.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.clientPayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-muted-foreground py-6 text-center">No client payments this month.</TableCell>
                    </TableRow>
                  ) : (
                    reportData.clientPayments.map((p, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{p.clientName}</TableCell>
                        <TableCell className="text-sm">{p.activityName || "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatPHP(p.amount)}</TableCell>
                        <TableCell className="text-sm">{p.date || "—"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Provincial Payments Table */}
          <Card>
            <CardHeader>
              <CardTitle>Provincial Government Charges</CardTitle>
              <CardDescription>Monthly charges billed to the Provincial Government Office.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agency</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.provincialPayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-muted-foreground py-6 text-center">No provincial charges this month.</TableCell>
                    </TableRow>
                  ) : (
                    reportData.provincialPayments.map((p, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{p.clientName}</TableCell>
                        <TableCell className="text-sm">{p.activityName || "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatPHP(p.amount)}</TableCell>
                        <TableCell className="text-sm">{p.date || "—"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Yearly Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Yearly Summary ({reportYear})</CardTitle>
              <CardDescription>Overall revenue summary for the year.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-sm text-muted-foreground">Total Client Revenue</p>
                  <p className="text-2xl font-bold">{formatPHP(reportData.yearlyClientRevenue)}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-sm text-muted-foreground">Total PGO Charges</p>
                  <p className="text-2xl font-bold">{formatPHP(reportData.yearlyProvincialRevenue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Export Button */}
          <div className="flex justify-end">
            <Button onClick={handleExportPDF} variant="outline" size="lg">
              <Download className="mr-2 size-4" />Export as PDF
            </Button>
          </div>
        </>
      )}

      {!generated && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileBarChart className="size-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-sm">Select a month and year, then click Generate Report to view the financial summary.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}