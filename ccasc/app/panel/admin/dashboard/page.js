"use client";

import { useState, useEffect } from "react";
import { RevenueSummaryCards } from "@/components/revenue-summary-cards";
import { RevenueCharts } from "@/components/revenue-charts";

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

  const revenue = data?.revenue || { daily: 0, weekly: 0, monthly: 0, yearly: 0 };

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

      <RevenueSummaryCards
        revenue={revenue}
        note="Both venues combined."
      />

      <RevenueCharts description="Both venues combined." />
    </div>
  );
}
