import { formatDbDate } from "@/lib/utils";
import { extractChargeBreakdownFromNotes } from "@/lib/reservation-charge-breakdown";

const ACTIVE_STATUSES = ["Pending", "Confirmed"];

function addFacility(map, dateKey, facilityId) {
  if (!dateKey || !facilityId) return;
  const id = String(facilityId);
  if (!map[dateKey]) map[dateKey] = new Set();
  map[dateKey].add(id);
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
 * Build date → Set(facilityId) of facilities already reserved by active reservations.
 * Prefer charge-line facilityId (+ optional date) when present; otherwise use Schedule rows
 * across every date of that reservation.
 */
export function buildReservedFacilitiesByDate(reservations) {
  const map = {};

  for (const reservation of reservations || []) {
    const dateKeys = reservationDateKeys(reservation);
    if (!dateKeys.length) continue;

    const chargeLines = extractChargeBreakdownFromNotes(reservation.notes) || [];
    const facilityLines = chargeLines.filter((line) => line.facilityId);

    if (facilityLines.length > 0) {
      for (const line of facilityLines) {
        const facilityId = line.facilityId;
        if (line.date) {
          addFacility(map, String(line.date), facilityId);
        } else {
          for (const dateKey of dateKeys) addFacility(map, dateKey, facilityId);
        }
      }
      continue;
    }

    for (const schedule of reservation.schedules || []) {
      for (const dateKey of dateKeys) {
        addFacility(map, dateKey, schedule.facilityId);
      }
    }
  }

  return Object.fromEntries(
    Object.entries(map).map(([date, set]) => [date, [...set]])
  );
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
 * Validate proposed facility assignments against existing reservations.
 * assignments: { [dateKey]: string[] facilityIds }
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
