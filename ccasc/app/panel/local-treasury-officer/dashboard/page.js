"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RevenueSummaryCards } from "@/components/revenue-summary-cards";
import { RevenueCharts } from "@/components/revenue-charts";

export default function LTOODashboardPage() {
  const [stats, setStats] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadDashboard() {
      try {
        const res = await fetch("/api/ltoo/dashboard");
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error("Failed to load dashboard:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Treasury Dashboard
        </h2>
        <p className="text-muted-foreground text-sm">
          Payments, notifications and recorded revenue.
        </p>
      </div>

      <RevenueSummaryCards
        revenue={stats?.revenue}
        note="Payments recorded in this window."
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Payments</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {loading ? "..." : stats?.totalPayments ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-xs">
            Recorded payments.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Notifications</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {loading ? "..." : stats?.pendingNotifications ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-xs">
            Awaiting a notify action.
          </CardContent>
        </Card>
      </div>

      <RevenueCharts description="Payments recorded across both venues." />
    </div>
  );
}
