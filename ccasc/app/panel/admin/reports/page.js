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
  TrendingUp,
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
export default function AdminReportsPage() {
  const [period, setPeriod] = React.useState("y");
  const [selectedMonth, setSelectedMonth] = React.useState(String(new Date().getMonth()));
  const [selectedYear, setSelectedYear] = React.useState(String(new Date().getFullYear()));
  const [selectedVenue, setSelectedVenue] = React.useState("all");
  const [selectedUserId, setSelectedUserId] = React.useState("");
  const [reportData, setReportData] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [generated, setGenerated] = React.useState(false);
  const [users, setUsers] = React.useState([]);

  const years = Array.from({ length: 10 }, (_, i) => String(new Date().getFullYear() - i));

  const handleGenerateReport = async () => {
    setLoading(true);
    setGenerated(false);
    try {
      const params = new URLSearchParams();
      params.append("period", period);
      params.append("venue", selectedVenue);
      params.append("year", selectedYear);
      if (period === "m") params.append("month", selectedMonth);
      if (selectedUserId) params.append("userId", selectedUserId);

      const res = await fetch(`/api/admin/reports?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to generate report");
      const data = await res.json();
      setReportData(data);
      setUsers(data.users || []);
      setGenerated(true);
      toast.success("Report generated successfully");
    } catch (err) {
      toast.error(err.message || "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!reportData?.salesData?.length) {
      toast.error("No data to export");
      return;
    }
    const headers = ["Period","Total Amount (PHP)","Transaction Count","Unique Clients"];
    const rows = reportData.salesData.map((d) => [d.label, d.totalAmount, d.transactionCount, d.uniqueClients]);
    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `admin-sales-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report exported as CSV");
  };

  const handleExportPDF = () => {
    if (!reportData?.salesData?.length) {
      toast.error("No data to export");
      return;
    }
    const periodLabel = period === "y" ? "Yearly" : period === "m" ? "Monthly" : "Weekly";
    const venueLabel = selectedVenue === "all" ? "All Venues" : selectedVenue === "sports" ? "Sports Complex" : "Cultural Center";
    const monthName = MONTHS.find((m) => m.value === selectedMonth)?.label || "";
    const titleAppendix = period === "m" ? ` - ${monthName} ${selectedYear}` : ` - ${selectedYear}`;

    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
      <head><title>Sales Report${titleAppendix}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; }
        h1 { color: #333; font-size: 20px; margin-bottom: 5px; }
        .subtitle { color: #666; font-size: 13px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th { background: #f0f0f0; text-align: left; padding: 10px 8px; border: 1px solid #ddd; font-size: 12px; text-transform: uppercase; }
        td { padding: 8px; border: 1px solid #ddd; font-size: 13px; }
        .grand-total { font-weight: bold; background: #f9f9f9; }
        .footer { margin-top: 30px; font-size: 11px; color: #999; text-align: center; border-top: 1px solid #ddd; padding-top: 15px; }
        .summary-row { display: flex; gap: 20px; margin-bottom: 15px; }
        .summary-box { background: #f5f5f5; padding: 12px 16px; border-radius: 6px; flex: 1; }
        .summary-box .label { font-size: 11px; color: #666; text-transform: uppercase; }
        .summary-box .value { font-size: 18px; font-weight: bold; margin-top: 4px; }
      </style>
      </head>
      <body>
        <h1>Sales Report — South Cotabato Gymnasium</h1>
        <div class="subtitle">Cultural Center & Sports Complex · ${periodLabel} Report${titleAppendix} · ${venueLabel}</div>
        <div class="summary-row">
          <div class="summary-box"><div class="label">Grand Total Revenue</div><div class="value">${formatPHP(reportData.grandTotal)}</div></div>
          <div class="summary-box"><div class="label">Total Transactions</div><div class="value">${reportData.totalTransactions}</div></div>
        </div>
        <table>
          <thead><tr><th>Period</th><th>Total Amount</th><th>Transactions</th><th>Unique Clients</th></tr></thead>
          <tbody>
            ${reportData.salesData.map((d) => `<tr><td>${d.label}</td><td>${formatPHP(d.totalAmount)}</td><td>${d.transactionCount}</td><td>${d.uniqueClients}</td></tr>`).join("")}
            <tr class="grand-total"><td>GRAND TOTAL</td><td>${formatPHP(reportData.grandTotal)}</td><td>${reportData.totalTransactions}</td><td></td></tr>
          </tbody>
        </table>
        <div class="footer">Generated on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} · South Cotabato Gymnasium Management System</div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
    toast.success("Report opened for printing / PDF export");
  };

  const venueLabel = selectedVenue === "all" ? "All Venues" : selectedVenue === "sports" ? "Sports Complex" : "Cultural Center";
return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Sales Report Generation
        </h2>
        <p className="text-muted-foreground text-sm">
          Generate sales reports by year, month, or week across Sports Complex
          and Cultural Center. Filter by user to narrow down results.
        </p>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Report Configuration</CardTitle>
          <CardDescription>
            Select period, venue, and optional user filter, then generate.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>Report Period</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="y">Yearly</SelectItem>
                  <SelectItem value="m">Monthly</SelectItem>
                  <SelectItem value="w">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Year</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {period === "m" && (
              <div className="space-y-2">
                <Label>Month</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Venue</Label>
              <Select value={selectedVenue} onValueChange={setSelectedVenue}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select venue" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Venues</SelectItem>
                  <SelectItem value="sports">Sports Complex</SelectItem>
                  <SelectItem value="cultural">Cultural Center</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGenerateReport} disabled={loading} className="gap-2">
              {loading ? "Generating..." : <><FileBarChart className="size-4" /> Generate Report</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {generated && reportData && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardDescription>Grand Total Revenue</CardDescription>
                <DollarSign className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <CardTitle className="text-3xl tabular-nums text-primary">
                  {formatPHP(reportData.grandTotal)}
                </CardTitle>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardDescription>Total Transactions</CardDescription>
                <TrendingUp className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <CardTitle className="text-3xl tabular-nums">
                  {reportData.totalTransactions}
                </CardTitle>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardDescription>Filtered By</CardDescription>
                <Building2 className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{period === "y" ? "Yearly" : period === "m" ? "Monthly" : "Weekly"}</Badge>
                  <Badge variant="outline">{venueLabel}</Badge>
                  {selectedUserId && <Badge variant="secondary"><User className="mr-1 size-3" /> User #{selectedUserId}</Badge>}
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleExportCSV} className="gap-2">
              <Download className="size-4" /> Export CSV
            </Button>
            <Button variant="outline" onClick={handleExportPDF} className="gap-2">
              <Download className="size-4" /> Export PDF
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Sales Breakdown</CardTitle>
              <CardDescription>{reportData.salesData.length} period(s) found.</CardDescription>
            </CardHeader>
            <CardContent>
              {reportData.salesData.length === 0 ? (
                <p className="text-muted-foreground text-sm py-8 text-center">
                  No sales records found for the selected criteria.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Total Amount</TableHead>
                      <TableHead className="text-right">Transactions</TableHead>
                      <TableHead className="text-right">Unique Clients</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.salesData.map((d, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{d.label}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatPHP(d.totalAmount)}</TableCell>
                        <TableCell className="text-right tabular-nums">{d.transactionCount}</TableCell>
                        <TableCell className="text-right tabular-nums">{d.uniqueClients}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted/50">
                      <TableCell>GRAND TOTAL</TableCell>
                      <TableCell className="text-right tabular-nums text-primary">{formatPHP(reportData.grandTotal)}</TableCell>
                      <TableCell className="text-right tabular-nums">{reportData.totalTransactions}</TableCell>
                      <TableCell className="text-right tabular-nums">—</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!generated && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileBarChart className="size-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-sm text-center max-w-md">
              Select a period, venue, and optional user filter above, then click
              <strong> Generate Report</strong> to view sales data.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}