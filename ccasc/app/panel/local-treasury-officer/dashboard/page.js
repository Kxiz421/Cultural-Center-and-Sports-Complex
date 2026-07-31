"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Wallet, BellRing, FileText, DollarSign } from "lucide-react";

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
        <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground text-sm">
          Overview of payments, notifications, documents, and revenue.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
            <Wallet className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : stats?.totalPayments ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">Recorded payments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Notifications</CardTitle>
            <BellRing className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : stats?.pendingNotifications ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting notify</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <FileText className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : stats?.totalDocuments ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">Submitted documents</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : `₱${(stats?.monthlyRevenue ?? 0).toLocaleString()}`}
            </div>
            <p className="text-xs text-muted-foreground">Current month</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}