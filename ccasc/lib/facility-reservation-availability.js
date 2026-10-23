import { formatDbDate } from "@/lib/utils";
import { extractChargeBreakdownFromNotes } from "@/lib/reservation-charge-breakdown";

const ACTIVE_STATUSES = ["Pending", "Confirmed"];

/**
 * Sports Complex facilities carry a "Quantity" (stored in `capacity`). A blank
 * or zero value means the facility is a single bookable unit.
 */
export function facilityQuantity(facility) {
  const capacity = Number(facility?.capacity);
  return Number.isFinite(capacity) && capacity > 0 ? Math.floor(capacity) : 1;
}

function reservationDateKeys(reservation) {
  const keys = [];
  if (reservation.eventDate) keys.push(formatDbDate(reservation.eventDate));
  for (const ad of reservation.additionalDates || []) {
    if (ad?.eventDate) keys.push(formatDbDate(ad.eventDate));
  }
  return keys.filter(Boolean);
}

/**
 * Build date → facilityId → reserved quantity of facilities already taken by
 * active reservations. Prefers charge-line quantities (which carry the booked
 * amount); falls back to one unit per Schedule row for older records.
 *
 * @returns {Record<string, Record<string, number>>}
 */
export function buildReservedFacilityQuantitiesByDate(reservations) {
  const map = {};

  const add = (dateKey, facilityId, quantity) => {
    if (!dateKey || !facilityId) return;
    const id = String(facilityId);
    const count = Math.max(1, Number(quantity) || 1);
    if (!map[dateKey]) map[dateKey] = {};
    map[dateKey][id] = (map[dateKey][id] || 0) + count;
  };

  for (const reservation of reservations || []) {
    const dateKeys = reservationDateKeys(reservation);
    if (!dateKeys.length) continue;

    const chargeLines = extractChargeBreakdownFromNotes(reservation.notes) || [];
    const facilityLines = chargeLines.filter((line) => line.facilityId);

    if (facilityLines.length > 0) {
      for (const line of facilityLines) {
        if (line.date) {
          add(String(line.date), line.facilityId, line.quantity);
        } else {
          for (const dateKey of dateKeys) {
            add(dateKey, line.facilityId, line.quantity);
          }
        }
      }
      continue;
    }

    for (const schedule of reservation.schedules || []) {
      for (const dateKey of dateKeys) add(dateKey, schedule.facilityId, 1);
    }
  }

  return map;
}

/**
 * Date → facility ids that have any reservation (kept for callers that only
 * need to know whether a facility is in use at all).
 */
export function buildReservedFacilitiesByDate(reservations) {
  const quantities = buildReservedFacilityQuantitiesByDate(reservations);
  const out = {};
  for (const [date, facilities] of Object.entries(quantities)) {
    out[date] = Object.keys(facilities);
  }
  return out;
}

/** Flatten date → facilityIds into a Set of facility ids reserved on any of the given dates. */
export function collectReservedFacilityIds(reservedByDate, dates) {
  const reserved = new Set();
  for (const date of dates || []) {
    for (const id of reservedByDate?.[date] || []) reserved.add(String(id));
  }
  return reserved;
}

/**
 * Quantity-aware conflict check.
 *
 * A request only conflicts when the units asked for exceed what is still free
 * on that date (`reserved + requested > capacity`). Different facilities (or a
 * partial quantity of one) can share the same day.
 *
 * @param {object} input
 * @param {Record<string, Record<string, number>>} [input.reservedQtyByDate]
 * @param {Record<string, string[]>} [input.assignments] date → facilityIds
 * @param {Record<string, number>} [input.quantities] facilityId → requested units
 * @param {Array<{facilityId: number|string, capacity?: number}>} [input.facilities]
 * @returns {Array<{date: string, facilityId: string, capacity: number,
 *                  reserved: number, requested: number, remaining: number}>}
 */
export function findFacilityQuantityConflicts({
  reservedQtyByDate = {},
  assignments = {},
  quantities = {},
  facilities = [],
} = {}) {
  const capacityById = new Map(
    (facilities || []).map((f) => [
      String(f.facilityId ?? f.id),
      facilityQuantity(f),
    ])
  );

  const conflicts = [];
  for (const [date, facilityIds] of Object.entries(assignments || {})) {
    const reservedMap = reservedQtyByDate?.[date] || {};
    for (const facilityId of facilityIds || []) {
      const id = String(facilityId);
      const capacity = capacityById.get(id) ?? 1;
      const reserved = Number(reservedMap[id]) || 0;
      const requested = Math.max(1, Number(quantities?.[id]) || 1);
      const remaining = Math.max(0, capacity - reserved);
      if (requested > remaining) {
        conflicts.push({ date, facilityId: id, capacity, reserved, requested, remaining });
      }
    }
  }
  return conflicts;
}

/**
 * Legacy id-based check: any reservation on a facility counts as fully taking
 * it. Kept for callers that do not carry quantities.
 */
export function findFacilityConflicts(reservedByDate, assignments) {
  const conflicts = [];
  for (const [date, facilityIds] of Object.entries(assignments || {})) {
    const reserved = new Set((reservedByDate?.[date] || []).map(String));
    for (const facilityId of facilityIds || []) {
      const id = String(facilityId);
      if (reserved.has(id)) {
        conflicts.push({ date, facilityId: id });
      }
    }
  }
  return conflicts;
}

export { ACTIVE_STATUSES };
