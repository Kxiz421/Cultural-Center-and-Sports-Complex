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
import { Separator } from "@/components/ui/separator";
import { CalendarDays, ClipboardList, DollarSign, TrendingUp } from "lucide-react";

function formatPhp(amount) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount);
}

export default function AccountingDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/dashboard/accounting");
        const json = await res.json();
        setData(json);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Accounting Dashboard
          </h2>
          <p className="text-muted-foreground text-sm">
            Loading live data from database...
          </p>
        </div>
      </div>
    );
  }

  const summary = data?.summary || { total: 0, partiallyPaid: 0, fullyPaid: 0 };
  const pendingReservations = data?.pendingCount || 0;
  const totalRevenue = data?.totalClientRevenue || 0;
  const reservations = data?.reservations || [];
  const monthlyRevenue = data?.monthlyRevenue || [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Accounting Dashboard
        </h2>
        <p className="text-muted-foreground text-sm">
          Live data from database — reservations and payments overview.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Total Reservations</CardDescription>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-3xl tabular-nums">
              {summary.total}
            </CardTitle>
            <p className="text-muted-foreground text-xs">All time reservations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Partially Paid</CardDescription>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-3xl tabular-nums text-yellow-600">
              {summary.partiallyPaid}
            </CardTitle>
            <p className="text-muted-foreground text-xs">Awaiting full payment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Fully Paid</CardDescription>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-3xl tabular-nums text-green-600">
              {summary.fullyPaid}
            </CardTitle>
            <p className="text-muted-foreground text-xs">Completed payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Pending Action</CardDescription>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-3xl tabular-nums text-orange-600">
              {pendingReservations}
            </CardTitle>
            <p className="text-muted-foreground text-xs">Needs attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Reservation List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Reservations</CardTitle>
          <CardDescription>
            Clients who need immediate assistance — partially paid and pending
            reservations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {reservations.length === 0 ? (
              <p className="text-muted-foreground text-sm">No pending or partially paid reservations.</p>
            ) : (
              reservations.map((res) => (
                <div
                  key={res.id}
                  className="flex flex-col gap-2 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{res.clientName}</span>
                      <Badge variant="outline" className="text-xs">
                        {res.clientType}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {res.venue} · {res.eventDate} · {res.eventType}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        res.payment === "Fully paid" ? "default" : "secondary"
                      }
                    >
                      {res.payment}
                    </Badge>
                    <div className="text-right text-sm">
                      <div className="font-medium tabular-nums">
                        {formatPhp(res.amountPaid)} paid
                      </div>
                      <div className="text-muted-foreground tabular-nums">
                        of {formatPhp(res.amountTotal)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Revenue Summary */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Yearly Revenue Overview</CardTitle>
            <CardDescription>
              Total revenue from client bookings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">
                Client Revenue
              </span>
              <span className="text-xl font-bold tabular-nums">
                {formatPhp(totalRevenue)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue (Current Year)</CardTitle>
            <CardDescription>
              Client payments per month.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {monthlyRevenue.slice(0, 6).map((m) => (
                <div
                  key={m.month}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="w-20 font-medium">{m.month}</span>
                  <div className="flex flex-1 items-center gap-2">
                    <div className="bg-primary/20 h-2 flex-1 rounded-full">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{
                          width: `${(m.clientRevenue / 500000) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="w-24 text-right tabular-nums text-muted-foreground">
                      {formatPhp(m.clientRevenue)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}