"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Download, Search } from "lucide-react";

function formatPhp(amount) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount);
}

export default function CoordinatorReportsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [eventType, setEventType] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/coordinator/reports");
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load reports:", err);
          toast.error("Failed to load reports");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  async function fetchReports() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (eventType) params.append("eventType", eventType);

      const res = await fetch(`/api/coordinator/reports?${params.toString()}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Failed to load reports:", err);
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  }

  function handleExportCSV() {
    if (!data?.reservations?.length) {
      toast.error("No data to export");
      return;
    }

    const headers = [
      "Reservation ID",
      "Client Name",
      "Client Type",
      "Venue",
      "Event Type",
      "Event Date",
      "Time Slot",
      "Status",
      "Event Status",
      "Payment",
      "Amount Paid",
      "Package",
    ];

    const rows = data.reservations.map((r) => [
      r.id,
      r.clientName,
      r.clientType,
      r.venue,
      r.eventType,
      r.eventDate,
      r.timeSlot,
      r.status,
      r.eventStatus || "Upcoming",
      r.payment,
      r.amountPaid,
      r.packageName,
    ]);

    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join(
      "\n"
    );
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cultural-center-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report exported successfully");
  }

  const summary = data?.summary || {
    totalReservations: 0,
    totalRevenue: 0,
    confirmedCount: 0,
    pendingCount: 0,
  };
  const reservations = data?.reservations || [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Report Generation</h2>
        <p className="text-muted-foreground text-sm">
          Generate and export reports for the Cultural Center.
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Filter reports by date range and event type.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Event Type</Label>
              <Input
                placeholder="e.g., Wedding, Seminar"
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
              />
            </div>
            <div className="space-y-2 flex items-end">
              <Button onClick={fetchReports} className="w-full" disabled={loading}>
                <Search className="mr-2 size-4" />
                {loading ? "Loading..." : "Generate Report"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Reservations</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {summary.totalReservations}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Revenue</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {formatPhp(summary.totalRevenue)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Confirmed</CardDescription>
            <CardTitle className="text-2xl tabular-nums text-green-600">
              {summary.confirmedCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending</CardDescription>
            <CardTitle className="text-2xl tabular-nums text-yellow-600">
              {summary.pendingCount}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Export Button */}
      <div className="flex justify-end">
        <Button variant="outline" onClick={handleExportCSV}>
          <Download className="mr-2 size-4" />
          Export CSV
        </Button>
      </div>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>Report Results</CardTitle>
          <CardDescription>
            {reservations.length} record(s) found.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reservations.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">
              No records found. Adjust filters and generate again.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">Client</th>
                    <th className="pb-2 font-medium">Event</th>
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Venue</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">
                        <div className="font-medium">{r.clientName}</div>
                        <div className="text-muted-foreground text-xs">
                          {r.clientType}
                        </div>
                      </td>
                      <td className="py-2 pr-4">
                        <div>{r.eventType}</div>
                        <div className="text-muted-foreground text-xs">
                          {r.timeSlot}
                        </div>
                      </td>
                      <td className="py-2 pr-4">{r.eventDate}</td>
                      <td className="py-2 pr-4">{r.venue}</td>
                      <td className="py-2 pr-4">
                        <Badge
                          variant={
                            r.status === "Confirmed" ? "default" : "secondary"
                          }
                        >
                          {r.status}
                        </Badge>
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {formatPhp(r.amountPaid)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}