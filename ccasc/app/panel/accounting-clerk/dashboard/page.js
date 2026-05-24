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
import { CalendarDays, ClipboardList, DollarSign, TrendingUp } from "lucide-react";
import {
  MOCK_RESERVATION_SUMMARY,
  MOCK_RESERVATIONS,
  MOCK_MONTHLY_REVENUE,
  formatPhp,
} from "@/lib/data/accounting-mock";

export default function AccountingDashboardPage() {
  const pendingReservations = MOCK_RESERVATIONS.filter(
    (r) => r.status === "Pending"
  ).length;

  const totalRevenue = MOCK_MONTHLY_REVENUE.reduce(
    (sum, m) => sum + m.clientRevenue,
    0
  );
  const totalPGOCharges = MOCK_MONTHLY_REVENUE.reduce(
    (sum, m) => sum + m.pgoCharges,
    0
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Accounting Dashboard
        </h2>
        <p className="text-muted-foreground text-sm">
          Daily administrative tasks and reservation overview.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Total Reservations</CardDescription>
            <ClipboardList className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <CardTitle className="text-3xl tabular-nums">
              {MOCK_RESERVATION_SUMMARY.total}
            </CardTitle>
            <p className="text-muted-foreground text-xs">All time reservations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Partially Paid</CardDescription>
            <DollarSign className="text-yellow-500 size-4" />
          </CardHeader>
          <CardContent>
            <CardTitle className="text-3xl tabular-nums text-yellow-600">
              {MOCK_RESERVATION_SUMMARY.partiallyPaid}
            </CardTitle>
            <p className="text-muted-foreground text-xs">Awaiting full payment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Fully Paid</CardDescription>
            <TrendingUp className="text-green-500 size-4" />
          </CardHeader>
          <CardContent>
            <CardTitle className="text-3xl tabular-nums text-green-600">
              {MOCK_RESERVATION_SUMMARY.fullyPaid}
            </CardTitle>
            <p className="text-muted-foreground text-xs">Completed payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Pending Action</CardDescription>
            <CalendarDays className="text-orange-500 size-4" />
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
            {MOCK_RESERVATIONS.filter(
              (r) => r.payment === "Partially paid" || r.status === "Pending"
            ).map((res) => (
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
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Revenue Summary */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Yearly Revenue Overview</CardTitle>
            <CardDescription>
              Total revenue from client bookings and PGO charges.
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
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">
                PGO Charges Billed
              </span>
              <span className="text-xl font-bold tabular-nums">
                {formatPhp(totalPGOCharges)}
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="font-medium">Total Combined</span>
              <span className="text-xl font-bold tabular-nums text-primary">
                {formatPhp(totalRevenue + totalPGOCharges)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue (Current Year)</CardTitle>
            <CardDescription>
              Client payments and PGO charges per month.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {MOCK_MONTHLY_REVENUE.slice(0, 6).map((m) => (
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