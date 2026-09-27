"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  revenueGroupsForVenueIds,
  venueIdsFromReportVenue,
} from "@/lib/report-venue-scope";

/** "1,2" -> [1, 2]; anything unusable -> []. */
function parseVenueIds(value) {
  return String(value || "")
    .split(",")
    .map((id) => parseInt(id, 10))
    .filter((id) => Number.isInteger(id));
}

/** Which request parameter carries the "specific entity" of each grouping. */
const SPECIFIC_PARAM = {
  particular: "particularId",
  package: "packageId",
  facility: "facilityId",
};

/**
 * Shared state + fetch logic behind every "Report Generation" screen.
 *
 * Keeping this in one hook is what makes the Admin, Accounting Clerk, Local
 * Treasury Officer and Program Coordinator report pages behave identically —
 * same Monthly / Weekly / Yearly selection, same Report Type toggle (List of
 * Activities / Revenue), same request, same payload.
 *
 * @param {{ venueIds?: string }} options  `venueIds` narrows the report to
 *   specific venues (e.g. the Program Coordinator only reports on their venue).
 *   The report APIs additionally enforce a coordinator's own venue server-side,
 *   so a wrong value here can never widen what a panel sees.
 */
export function useReports({ venueIds } = {}) {
  const [reportType, setReportType] = React.useState("activities");
  const [period, setPeriod] = React.useState("m");
  const [month, setMonth] = React.useState(String(new Date().getMonth()));
  const [week, setWeek] = React.useState("1");
  const [year, setYear] = React.useState(String(new Date().getFullYear()));
  const [venue, setVenue] = React.useState("all");
  const [revenueGroup, setRevenueGroup] = React.useState("particular");
  const [specific, setSpecific] = React.useState("all");
  const [specificOptions, setSpecificOptions] = React.useState([]);
  const [optionsLoading, setOptionsLoading] = React.useState(false);
  const [report, setReport] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  /**
   * Venue scope the revenue report will actually run against: the panel scope
   * when the panel is venue scoped, otherwise the Venue dropdown.
   */
  const panelVenueIds = React.useMemo(() => parseVenueIds(venueIds), [venueIds]);
  const effectiveVenueIds = React.useMemo(() => {
    if (panelVenueIds.length > 0) return panelVenueIds;
    return venueIdsFromReportVenue(venue);
  }, [panelVenueIds, venue]);

  /**
   * Groupings offered for that scope. A Sports Complex report is per facility
   * only - it never offers the package or particular groupings.
   */
  const revenueGroups = React.useMemo(
    () =>
      revenueGroupsForVenueIds(
        effectiveVenueIds.length > 0 ? effectiveVenueIds : null
      ),
    [effectiveVenueIds]
  );

  /** Switching the report type must not leave the other document on screen. */
  const changeReportType = React.useCallback((value) => {
    setReportType(value);
    setReport(null);
    setSpecific("all");
  }, []);

  /** Changing the grouping invalidates the entity picked in the old grouping. */
  const changeRevenueGroup = React.useCallback((value) => {
    setRevenueGroup(value);
    setSpecific("all");
  }, []);

  // Keep the grouping valid for the current scope (e.g. switching the Venue
  // dropdown to Sports Complex turns a per-package report into a per-facility
  // one, because Sports Complex revenue is only booked per facility).
  React.useEffect(() => {
    if (reportType !== "revenue") return;
    if (!revenueGroups.includes(revenueGroup)) {
      setRevenueGroup(revenueGroups[0]);
      setSpecific("all");
    }
  }, [reportType, revenueGroups, revenueGroup]);

  // Entity list for the "check the revenue for a specific ..." selector:
  // particulars, packages, or the facilities of the venue(s) in scope.
  React.useEffect(() => {
    if (reportType !== "revenue" || revenueGroup === "venue") {
      setSpecificOptions([]);
      return undefined;
    }

    let cancelled = false;
    const isParticular = revenueGroup === "particular";
    const isFacility = revenueGroup === "facility";
    const endpoint = isFacility
      ? "/api/facilities"
      : isParticular
        ? "/api/particulars"
        : "/api/packages";
    setOptionsLoading(true);

    fetch(endpoint)
      .then((res) => (res.ok ? res.json() : []))
      .then((list) => {
        if (cancelled) return;
        const items = Array.isArray(list) ? list : [];

        if (isFacility) {
          // Only the facilities of the venue(s) this report covers.
          const scoped =
            effectiveVenueIds.length > 0
              ? items.filter((item) =>
                  effectiveVenueIds.includes(Number(item.venueId))
                )
              : items;
          const showSite = effectiveVenueIds.length === 0;
          setSpecificOptions(
            scoped.map((item) => ({
              value: String(item.facilityId),
              label:
                showSite && item.site
                  ? `${item.name} (${item.site})`
                  : item.name || `Facility ${item.facilityId}`,
            }))
          );
          return;
        }

        setSpecificOptions(
          items.map((item) =>
            isParticular
              ? {
                  value: String(item.particularId),
                  label:
                    item.particularName || `Particular ${item.particularId}`,
                }
              : {
                  value: String(item.packageId),
                  label: item.packageName || `Package ${item.packageId}`,
                }
          )
        );
      })
      .catch(() => {
        if (!cancelled) setSpecificOptions([]);
      })
      .finally(() => {
        if (!cancelled) setOptionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reportType, revenueGroup, effectiveVenueIds]);

  const generate = React.useCallback(async () => {
    setLoading(true);
    try {
      const isRevenue = reportType === "revenue";
      const params = new URLSearchParams({ period, month, week, year });

      if (venue && venue !== "all") params.set("venue", venue);
      if (venueIds) params.set("venueIds", venueIds);

      if (isRevenue) {
        params.set("groupBy", revenueGroup);
        // "Per Venue" uses the Venue dropdown itself as its entity picker.
        const specificParam = SPECIFIC_PARAM[revenueGroup];
        if (specificParam && specific !== "all") {
          params.set(specificParam, specific);
        }
      }

      const endpoint = isRevenue
        ? "/api/reports/revenue"
        : "/api/reports/activities";
      const res = await fetch(`${endpoint}?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to generate report");

      setReport(await res.json());
      toast.success("Report generated successfully");
    } catch (err) {
      toast.error(err.message || "Failed to generate report");
    } finally {
      setLoading(false);
    }
  }, [period, month, week, year, venue, venueIds, reportType, revenueGroup, specific]);

  const printReport = React.useCallback(() => {
    if (typeof window !== "undefined") window.print();
  }, []);

  return {
    reportType,
    setReportType: changeReportType,
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
    revenueGroup,
    setRevenueGroup: changeRevenueGroup,
    revenueGroups,
    specific,
    setSpecific,
    specificOptions,
    optionsLoading,
    report,
    loading,
    generate,
    printReport,
  };
}
