"use client";

import * as React from "react";
import { toast } from "sonner";

/**
 * Shared state + fetch logic behind every "Report Generation" screen.
 *
 * Keeping this in one hook is what makes the Admin, Accounting Clerk, Local
 * Treasury Officer and Program Coordinator report pages behave identically —
 * same Monthly / Weekly / Yearly selection, same request, same payload.
 *
 * @param {{ venueIds?: string }} options  `venueIds` scopes a panel to specific
 *   venues (e.g. the Program Coordinator only reports on the Cultural Center).
 */
export function useActivitiesReport({ venueIds } = {}) {
  const [period, setPeriod] = React.useState("m");
  const [month, setMonth] = React.useState(String(new Date().getMonth()));
  const [week, setWeek] = React.useState("1");
  const [year, setYear] = React.useState(String(new Date().getFullYear()));
  const [venue, setVenue] = React.useState("all");
  const [report, setReport] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  const generate = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ period, month, week, year, venue });
      if (venueIds) params.set("venueIds", venueIds);

      const res = await fetch(`/api/reports/activities?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to generate report");

      setReport(await res.json());
      toast.success("Report generated successfully");
    } catch (err) {
      toast.error(err.message || "Failed to generate report");
    } finally {
      setLoading(false);
    }
  }, [period, month, week, year, venue, venueIds]);

  const printReport = React.useCallback(() => {
    if (typeof window !== "undefined") window.print();
  }, []);

  return {
    period,
    setPeriod,
    month,
    setMonth,
    week,
    setWeek,
    year,
    setYear,
    venue,
    setVenue,
    report,
    loading,
    generate,
    printReport,
  };
}
