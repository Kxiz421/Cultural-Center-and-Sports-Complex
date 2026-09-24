"use client";

import * as React from "react";

import { FACILITY_VENUES } from "@/lib/landing-content";

/**
 * Facility records for the public landing page.
 *
 * The list is read from `app/api/public/facilities`, which serves the same
 * rows the admin Facility Management screen lists, so the landing page always
 * shows what the coordinators maintain. Nothing is hard-coded here: while the
 * request is in flight the section claims nothing, and when it fails the
 * section says so instead of showing a stale price list.
 *
 * One promise is shared between every section that needs the list, so the
 * hero, the venues and the facilities section trigger a single request.
 */
let facilitiesRequest = null;

function requestFacilities() {
  if (!facilitiesRequest) {
    facilitiesRequest = fetch("/api/public/facilities", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data) => (Array.isArray(data) ? data : []))
      .catch((error) => {
        console.error("Failed to load the public facility list:", error);
        return [];
      });
  }

  return facilitiesRequest;
}

/** Facilities per venue, ordered the way the admin panel lists the venues. */
export function groupFacilitiesByVenue(facilities) {
  const groups = new Map();

  for (const facility of facilities) {
    const venueId = Number(facility.venueId);

    if (!groups.has(venueId)) {
      groups.set(venueId, {
        venueId,
        label:
          FACILITY_VENUES.find((venue) => venue.venueId === venueId)?.label ||
          facility.venue ||
          "Venue",
        facilities: [],
      });
    }

    groups.get(venueId).facilities.push(facility);
  }

  return [...groups.values()].sort((a, b) => a.venueId - b.venueId);
}

/** @returns {{facilities: object[], byVenue: object[], loading: boolean}} */
export function useLandingFacilities() {
  const [state, setState] = React.useState({ facilities: [], loading: true });

  React.useEffect(() => {
    let active = true;

    requestFacilities().then((facilities) => {
      if (active) setState({ facilities, loading: false });
    });

    return () => {
      active = false;
    };
  }, []);

  const byVenue = React.useMemo(
    () => groupFacilitiesByVenue(state.facilities),
    [state.facilities],
  );

  return { facilities: state.facilities, byVenue, loading: state.loading };
}
