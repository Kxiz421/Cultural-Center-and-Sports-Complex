"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  MOCK_BOOKING_STATUS,
  MOCK_REVENUE,
  formatPhp,
} from "@/lib/data/admin-mock";

export default function AdminDashboardPage() {
  const confirmedPct =
    MOCK_BOOKING_STATUS.pending + MOCK_BOOKING_STATUS.confirmed === 0
      ? 0
      : Math.round(
          (MOCK_BOOKING_STATUS.confirmed /
            (MOCK_BOOKING_STATUS.pending + MOCK_BOOKING_STATUS.confirmed)) *
            100
        );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Operational overview
        </h2>
        <p className="text-muted-foreground text-sm">
          Example KPI cards — replace with live aggregates from payments and
          bookings services.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Daily revenue</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {formatPhp(MOCK_REVENUE.daily)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-xs">
            Rolling total for today&apos;s recorded receipts (demo).
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Weekly revenue</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {formatPhp(MOCK_REVENUE.weekly)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-xs">
            Includes Cultural Center & Sports Complex bookings (demo).
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Yearly revenue</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {formatPhp(MOCK_REVENUE.yearly)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-xs">
            Fiscal summary placeholder for provincial reporting (demo).
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Booking status</CardTitle>
            <CardDescription>
              Pending requests versus confirmed events across both venues (demo
              counts).
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Pending</span>
                <Badge variant="secondary">{MOCK_BOOKING_STATUS.pending}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Confirmed</span>
                <Badge>{MOCK_BOOKING_STATUS.confirmed}</Badge>
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
            <div className="border-muted rounded-lg border border-dashed p-4 text-sm">
              <p className="font-medium">Visualization placeholder</p>
              <p className="text-muted-foreground mt-2">
                Wire this card to your analytics endpoint (e.g. daily stacked
                bars for pending vs confirmed). Example data only here.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
