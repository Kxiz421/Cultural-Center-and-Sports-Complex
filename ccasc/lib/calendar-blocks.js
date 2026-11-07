export const HOLIDAY_BLOCK_TYPE = "Holiday";
export const MAINTENANCE_BLOCK_TYPE = "Maintenance";
export const BOOKABLE_HOLIDAY_BLOCK_TYPE = "Holiday (Bookable)";

/** Only a real closure blocks a date; a bookable holiday is informational. */
export function isBlockingBlockType(type) {
  return type !== BOOKABLE_HOLIDAY_BLOCK_TYPE;
}

/**
 * A Sports Complex maintenance can target individual facilities. The selection
 * is stored as a `[[facilities:1,2]]` marker at the front of the block notes,
 * so no extra column is needed; the rest of the notes is the admin's own text.
 */
const FACILITY_SCOPE_RE = /^\[\[facilities:([\d,]*)\]\]\s?/;

/** Facility ids a block applies to, or null when it blocks the whole venue. */
export function parseFacilityScope(notes) {
  const match = FACILITY_SCOPE_RE.exec(String(notes || ""));
  if (!match) return null;
  const ids = match[1]
    .split(",")
    .map((n) => parseInt(n, 10))
    .filter((n) => Number.isInteger(n));
  return ids.length > 0 ? ids : null;
}

/** The admin's own note text, with the facility marker removed. */
export function stripFacilityScope(notes) {
  return String(notes || "").replace(FACILITY_SCOPE_RE, "").trim();
}

/** Build the stored value: marker + the admin's notes. */
export function encodeFacilityScope(notes, facilityIds) {
  const clean = stripFacilityScope(notes);
  const ids = (facilityIds || [])
    .map((n) => parseInt(n, 10))
    .filter((n) => Number.isInteger(n));
  if (ids.length === 0) return clean || null;
  const marker = `[[facilities:${[...new Set(ids)].join(",")}]]`;
  return clean ? `${marker} ${clean}` : marker;
}

/**
 * Whether a block applies to a reservation. A block with no facility scope
 * blocks the whole venue; a scoped block only blocks the facilities it lists.
 */
export function blockAppliesToReservation(block, facilityIds) {
  const scope = parseFacilityScope(block?.notes);
  if (!scope) return true;
  const selected = (facilityIds || []).map((n) => Number(n));
  return scope.some((id) => selected.includes(Number(id)));
}
