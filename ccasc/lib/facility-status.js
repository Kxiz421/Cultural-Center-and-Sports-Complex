/**
 * Facility availability statuses and the shared client-facing filter.
 *
 * `AvailabilityStatus` rows are seeded in prisma/seed.mjs:
 *   1 = Available, 2 = Unavailable, 3 = Under Maintenance, 4 = Archived
 *
 * Archiving is how an admin removes a facility from every client-facing list
 * (booking form, walk-in, reschedule scope, public landing page) while keeping
 * the row - and its history - intact. The admin Facility Management screen
 * still lists archived facilities so they can be restored.
 *
 * This module is intentionally dependency-free so it can be imported by both
 * client components ("use client") and API routes.
 */

export const FACILITY_STATUS_ID = {
  AVAILABLE: 1,
  UNAVAILABLE: 2,
  UNDER_MAINTENANCE: 3,
  ARCHIVED: 4,
};

/**
 * True when a facility is archived. Matches on either the numeric status id
 * (`GET /api/facilities`) or the `availability` label
 * (`GET /api/public/facilities`), so a caller can pass either shape.
 */
export function isArchivedFacility(facility) {
  if (!facility) return false;
  if (Number(facility.statusId) === FACILITY_STATUS_ID.ARCHIVED) return true;
  return String(facility.availability || "").trim().toLowerCase() === "archived";
}

/** Drop archived facilities from a client-facing facility list. */
export function excludeArchivedFacilities(facilities) {
  return Array.isArray(facilities)
    ? facilities.filter((facility) => !isArchivedFacility(facility))
    : [];
}
