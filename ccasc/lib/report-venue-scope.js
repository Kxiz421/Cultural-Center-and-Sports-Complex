import { USER_TYPE } from "@/lib/auth-roles";
import {
  CULTURAL_CENTER_VENUE_ID,
  SPORTS_COMPLEX_VENUE_ID,
  VENUE_NAMES,
} from "@/lib/venues";

export {
  CULTURAL_CENTER_VENUE_ID,
  SPORTS_COMPLEX_VENUE_ID,
  VENUE_NAMES,
};

/**
 * Venue scoping for reports.
 *
 * A Program Coordinator is only responsible for one venue, so every report they
 * generate must stay inside that venue:
 *
 *   - "program coordinator cultural" -> Cultural Center only
 *   - "program coordinator sports"   -> Sports Complex only
 *
 * Admin, Accounting Clerk and the Local Treasury Officer are not venue scoped —
 * they may report on both venues or narrow the report themselves.
 *
 * Both the report API routes (server) and the report screens (client, via the
 * `userType` stored at login) use this module, so the rule cannot drift.
 */

/** Report Venue dropdown value ("sports" | "cultural") -> venue ids. */
export function venueIdsFromReportVenue(venue) {
  if (venue === "sports") return [SPORTS_COMPLEX_VENUE_ID];
  if (venue === "cultural") return [CULTURAL_CENTER_VENUE_ID];
  return [];
}

/** True when a session type may only report on its own venue. */
export function isVenueScopedUserType(userType) {
  return reportVenueIdsForUserType(userType).length > 0;
}

/**
 * Venue ids a session is hard-limited to.
 *
 * @returns {number[]} `[]` when the user type is not venue scoped.
 */
export function reportVenueIdsForUserType(userType) {
  if (userType === USER_TYPE.COORDINATOR_CULTURAL) {
    return [CULTURAL_CENTER_VENUE_ID];
  }
  if (userType === USER_TYPE.COORDINATOR_SPORTS) {
    return [SPORTS_COMPLEX_VENUE_ID];
  }
  return [];
}

/** "Cultural Center", "Sports Complex", "Sports Complex & Cultural Center". */
export function venueScopeLabel(venueIds) {
  if (!venueIds || venueIds.length === 0) return "All Venues";
  return venueIds
    .map((id) => VENUE_NAMES[id] || `Venue ${id}`)
    .join(" & ");
}

/** True when a report covers the Sports Complex and nothing else. */
export function isSportsComplexOnly(venueIds) {
  return (
    Array.isArray(venueIds) &&
    venueIds.length === 1 &&
    venueIds[0] === SPORTS_COMPLEX_VENUE_ID
  );
}

/**
 * Revenue groupings a report may offer for a venue scope.
 *
 * The Sports Complex books and bills per facility (a reservation names one or
 * more facilities and each is charged at its own rate), so a Sports Complex
 * report is grouped per facility only - never per package or per particular.
 * Every other scope (Cultural Center, both venues) keeps the particular /
 * venue / package groupings, where the Cultural Center's facility revenue is
 * already reported as its Venue Rental particular.
 *
 * @param {number[]|null} venueIds effective venue scope, `null` = unrestricted
 * @returns {string[]} allowed `groupBy` values, most relevant first
 */
export function revenueGroupsForVenueIds(venueIds) {
  if (isSportsComplexOnly(venueIds)) return ["facility"];
  return ["particular", "venue", "package"];
}

/**
 * Effective venue filter for a report request.
 *
 * The session scope always wins: a Coordinator can neither widen it nor move to
 * the other venue by passing `venueIds` / `venue` in the query string. Requests
 * that ask for a venue outside the scope resolve to an empty list, which matches
 * no rows at all (instead of silently falling back to "everything").
 *
 * @param {string|undefined} userType session user type
 * @param {number[]} [requestedVenueIds] venue ids asked for by the request
 * @returns {number[]|null} `null` when the report is not restricted at all.
 */
export function resolveReportVenueIds(userType, requestedVenueIds = []) {
  const scoped = reportVenueIdsForUserType(userType);
  const requested = (requestedVenueIds || []).filter((id) =>
    Number.isInteger(id)
  );

  if (scoped.length === 0) {
    return requested.length > 0 ? requested : null;
  }

  if (requested.length === 0) return scoped;

  return scoped.filter((id) => requested.includes(id));
}
