"use client";

import * as React from "react";
import { ReportGenerationScreen } from "@/components/report-generation-screen";
import {
  SPORTS_COMPLEX_VENUE_ID,
  reportVenueIdsForUserType,
  venueScopeLabel,
} from "@/lib/report-venue-scope";

/**
 * Program Coordinator reports.
 *
 * A coordinator is responsible for a single venue, and their reports must stay
 * inside it: the Cultural Center coordinator only ever sees Cultural Center
 * figures, the Sports Complex coordinator only Sports Complex figures. The
 * venue is read from the session user type stored at login and is also enforced
 * server-side by `/api/reports/*`, so the scope cannot be widened from the
 * browser.
 */
export default function CoordinatorReportsPage() {
  const [venueIds, setVenueIds] = React.useState([]);

  React.useEffect(() => {
    const userType =
      typeof window === "undefined"
        ? ""
        : localStorage.getItem("userType") || "";
    setVenueIds(reportVenueIdsForUserType(userType));
  }, []);

  const scopeName = venueIds.length
    ? venueScopeLabel(venueIds)
    : "assigned venue";
  const isSportsComplex = venueIds.includes(SPORTS_COMPLEX_VENUE_ID);

  return (
    <ReportGenerationScreen
      description={`Generate a monthly, weekly or yearly report for the ${scopeName}: the LIST OF SCGCC ACTIVITIES document, or the revenue ${isSportsComplex ? "per facility" : "per particular, venue or package"}. Every report can be printed or exported.`}
      scopeNote={
        isSportsComplex
          ? "Report scope: Sports Complex only. Revenue is reported per Sports Complex facility, and reports cannot include the Cultural Center."
          : `Report scope: ${scopeName} only. Reports cannot include the other venue.`
      }
      showVenue={false}
      venueIds={venueIds.length ? venueIds.join(",") : undefined}
    />
  );
}
