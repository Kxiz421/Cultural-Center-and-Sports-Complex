"use client";

import * as React from "react";
import { PANEL_NOTIFICATIONS_UPDATED } from "@/lib/panel-notifications";

export function useCoordinatorPendingCounts() {
  const [pendingBookings, setPendingBookings] = React.useState(0);
  const [pendingReschedules, setPendingReschedules] = React.useState(0);

  const fetchCounts = React.useCallback(async () => {
    try {
      const res = await fetch("/api/coordinator/pending-counts");
      const data = await res.json();
      if (res.ok) {
        setPendingBookings(data.pendingBookings ?? 0);
        setPendingReschedules(data.pendingReschedules ?? 0);
      }
    } catch (err) {
      console.error("Failed to fetch coordinator pending counts:", err);
    }
  }, []);

  React.useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 30000);
    const onUpdated = () => fetchCounts();
    window.addEventListener(PANEL_NOTIFICATIONS_UPDATED, onUpdated);
    return () => {
      clearInterval(interval);
      window.removeEventListener(PANEL_NOTIFICATIONS_UPDATED, onUpdated);
    };
  }, [fetchCounts]);

  return {
    pendingBookings,
    pendingReschedules,
    refreshPendingCounts: fetchCounts,
  };
}
