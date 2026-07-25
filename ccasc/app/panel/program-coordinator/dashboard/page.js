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
import { CalendarDays, DollarSign, TrendingUp, Clock, CheckCircle2 } from "lucide-react";

function formatPhp(amount) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount);
}

export default function CoordinatorDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/dashboard/coordinator");
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
            Program Coordinator Dashboard
          </h2>
          <p className="text-muted-foreground text-sm">
            Loading live data from database...
          </p>
        </div>
      </div>
    );
  }

  const revenue = data?.revenue || { daily: 0, weekly: 0, yearly: 0 };
  const bookingStatus = data?.bookingStatus || { pending: 0, confirmed: 0, ongoing: 0, completed: 0 };
  const recentReservations = data?.recentReservations || [];
  const monthlyRevenue = data?.monthlyRevenue || [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Program Coordinator Dashboard
        </h2>
        <p className="text-muted-foreground text-sm">
          Cultural Center — live data from database.
        </p>
      </div>

      {/* Revenue Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Daily Revenue</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {formatPhp(revenue.daily)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-xs">
            Today's recorded receipts for Cultural Center.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Revenue (All-Time)</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {formatPhp(revenue.yearly)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-xs">
            Includes all Cultural Center bookings.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Reservations</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {bookingStatus.pending + bookingStatus.confirmed}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-xs">
            Total pending and confirmed reservations.
          </CardContent>
        </Card>
      </div>

      {/* Booking Status Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Pending</CardDescription>
            <Clock className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <CardTitle className="text-3xl tabular-nums text-yellow-600">
              {bookingStatus.pending}
            </CardTitle>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Confirmed</CardDescription>
            <CheckCircle2 className="size-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <CardTitle className="text-3xl tabular-nums text-green-600">
              {bookingStatus.confirmed}
            </CardTitle>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Ongoing</CardDescription>
            <TrendingUp className="size-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <CardTitle className="text-3xl tabular-nums text-blue-600">
              {bookingStatus.ongoing}
            </CardTitle>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Completed</CardDescription>
            <CalendarDays className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <CardTitle className="text-3xl tabular-nums">
              {bookingStatus.completed}
            </CardTitle>
          </CardContent>
        </Card>
      </div>

      {/* Recent Reservations */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Reservations</CardTitle>
          <CardDescription>
            Latest reservation activity in the Cultural Center.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentReservations.length === 0 ? (
              <p className="text-muted-foreground text-sm">No reservations found.</p>
            ) : (
              recentReservations.map((res) => (
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
                    <p className="text-muted-foreground text-xs">
                      {res.timeSlot}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        res.status === "Confirmed" ? "default" : "secondary"
                      }
                    >
                      {res.status}
                    </Badge>
                    {res.eventStatus && (
                      <Badge variant="outline" className="text-xs">
                        {res.eventStatus}
                      </Badge>
                    )}
                    <div className="text-right text-sm">
                      <div className="font-medium tabular-nums">
                        {formatPhp(res.amountPaid)} paid
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Monthly Revenue */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Revenue (Current Year)</CardTitle>
          <CardDescription>
            Cultural Center revenue per month.
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
                        width: `${(m.revenue / 500000) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="w-24 text-right tabular-nums text-muted-foreground">
                    {formatPhp(m.revenue)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}