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

function formatPhp(amount) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount);
}

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/dashboard/admin");
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
            Operational overview
          </h2>
          <p className="text-muted-foreground text-sm">
            Loading live data from database...
          </p>
        </div>
      </div>
    );
  }

  const revenue = data?.revenue || { daily: 0, weekly: 0, yearly: 0 };
  const bookingStatus = data?.bookingStatus || { pending: 0, confirmed: 0 };
  const totalPipeline = bookingStatus.pending + bookingStatus.confirmed;
  const confirmedPct = totalPipeline === 0 ? 0 : Math.round((bookingStatus.confirmed / totalPipeline) * 100);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Operational overview
        </h2>
        <p className="text-muted-foreground text-sm">
          Live aggregates from payments and reservations.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Daily revenue</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {formatPhp(revenue.daily)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-xs">
            Rolling total for today's recorded receipts.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total revenue (all-time)</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {formatPhp(revenue.yearly)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-xs">
            Includes Cultural Center & Sports Complex bookings.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active reservations</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {totalPipeline}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-xs">
            Total pending and confirmed reservations.
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Booking status</CardTitle>
            <CardDescription>
              Pending requests versus confirmed events across both venues.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Pending</span>
                <Badge variant="secondary">{bookingStatus.pending}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Confirmed</span>
                <Badge>{bookingStatus.confirmed}</Badge>
              </div>
              <Separator />
              <p className="text-muted-foreground text-xs">
                Confirmed share of active pipeline:{" "}
                <strong>{confirmedPct}%</strong>
              </p>
              <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full rounded-full transition-all"
                  style={{ width: `${confirmedPct}%` }}
                />
              </div>
            </div>
            <div className="border-muted rounded-lg border p-4 text-sm">
              <p className="font-medium">Live data from database</p>
              <p className="text-muted-foreground mt-2">
                All values are fetched in real-time from the Railway database
                (payments and reservations tables).
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}