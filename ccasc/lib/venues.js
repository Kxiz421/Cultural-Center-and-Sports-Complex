/**
 * Venue identifiers shared by every module.
 *
 * The database seeds exactly two venues (see prisma/seed.mjs):
 *   1 = South Cotabato Gymnasium and Cultural Center
 *   2 = South Cotabato Sports Complex
 *
 * This module is intentionally dependency-free so both client components and
 * API routes (Node and Edge) can import it.
 */

export const CULTURAL_CENTER_VENUE_ID = 1;
export const SPORTS_COMPLEX_VENUE_ID = 2;

export const VENUE_NAMES = {
  [CULTURAL_CENTER_VENUE_ID]: "Cultural Center",
  [SPORTS_COMPLEX_VENUE_ID]: "Sports Complex",
};

/** "Cultural Center" / "Sports Complex" / "Venue 7". */
export function venueName(venueId) {
  return VENUE_NAMES[Number(venueId)] || `Venue ${venueId}`;
}

export function isSportsComplex(venueId) {
  return Number(venueId) === SPORTS_COMPLEX_VENUE_ID;
}

export function isCulturalCenter(venueId) {
  return Number(venueId) === CULTURAL_CENTER_VENUE_ID;
}
