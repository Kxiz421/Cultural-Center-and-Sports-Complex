import { roundMoney } from "@/lib/utils";
import { isDepositPortionMet } from "@/lib/payment-utils";
import { formatReservedParticularCharge } from "@/lib/particular-options";
import { particularLineWeight } from "@/lib/particular-pricing";
import {
  getFacilityRateForSlot,
  getPackageBillingRate,
  packageSummaryLabel,
} from "@/lib/reservation-package-select";
import { SPORTS_COMPLEX_VENUE_ID } from "@/lib/venues";
import { TIME_SLOT_OPTIONS, getTimeSlotLabel } from "@/lib/time-slots";

/**
 * Scope changes on a reschedule request.
 *
 * Rescheduling used to only move event dates. A request may now also manage the
 * facilities, the particulars and the time slot of a reservation - including on
 * the *same* date - while the reservation is still editable:
 *
 *   Cultural Center  -> until the 10% deposit has been applied
 *   Sports Complex   -> until the booking has been confirmed
 *
 * A request stores the *requested end state* (not a diff) as JSON in
 * `RescheduleRequest.scopeChange`:
 *
 *   { "timeSlotId": 1,
 *     "facilities":  [{ "facilityId": 7, "quantity": 2 }],
 *     "particulars": [{ "particularId": 4, "quantity": 700 }] }
 *
 * The Program Coordinator approves the request; approval then applies the dates
 * and the requested scope, and recomputes the reservation amount from the same
 * rate basis the booking forms charge with.
 *
 * This module stays free of Prisma so the API routes and the client screens
 * share one rule.
 */

export const SCOPE_LOCK = {
  CANCELLED:
    "This reservation is cancelled, so its facilities, particulars and time slot can no longer be changed.",
  DEPOSIT_APPLIED:
    "The 10% deposit of this Cultural Center reservation has already been applied, so its particulars and time slot can no longer be changed.",
  BOOKING_CONFIRMED:
    "This Sports Complex booking is already confirmed, so its facilities and time slot can no longer be changed.",
};

/** Only these values may be requested for the time slot (1 Day, 2 Night, 3 Whole Day). */
const TIME_SLOT_IDS = TIME_SLOT_OPTIONS.map((opt) => Number(opt.id));

/**
 * May the facilities / particulars / time slot of this reservation still be
 * managed through rescheduling?
 *
 * @param {{ venueId?: number, reservationStatus?: string, totalAmount?: number,
 *           paidAmount?: number, bookingStatus?: string }} reservation
 * @returns {{ allowed: boolean, reason: string }}
 */
export function canManageReservationScope({
  venueId,
  reservationStatus,
  totalAmount,
  paidAmount,
  bookingStatus,
} = {}) {
  const status = String(reservationStatus || "");
  if (
    status.toLowerCase() === "cancelled" ||
    String(bookingStatus || "").toLowerCase() === "cancelled"
  ) {
    return { allowed: false, reason: SCOPE_LOCK.CANCELLED };
  }

  // Sports Complex: editable until the coordinator confirms the booking.
  if (Number(venueId) === SPORTS_COMPLEX_VENUE_ID) {
    if (status === "Confirmed") {
      return { allowed: false, reason: SCOPE_LOCK.BOOKING_CONFIRMED };
    }
    return { allowed: true, reason: "" };
  }

  // Cultural Center: editable until the 10% deposit has been applied.
  const base = roundMoney(totalAmount || 0);
  const paid = roundMoney(paidAmount || 0);
  if (
    base > 0 &&
    isDepositPortionMet(paid, roundMoney(base * 0.5), roundMoney(base * 0.1))
  ) {
    return { allowed: false, reason: SCOPE_LOCK.DEPOSIT_APPLIED };
  }
  return { allowed: true, reason: "" };
}

function toPositiveQuantity(value) {
  const qty = parseInt(value, 10);
  return Number.isInteger(qty) && qty > 0 ? qty : 0;
}

/**
 * Normalizes the client payload into the stored shape. Items with a quantity of
 * 0 (or less) are dropped, which is how a facility / particular is removed.
 *
 * @returns {{ scope: object|null, error?: string }}
 */
export function normalizeScopeChangeInput(raw) {
  if (raw === undefined || raw === null) return { scope: null };
  if (typeof raw !== "object") {
    return { error: "Invalid facilities / particulars selection" };
  }

  let timeSlotId = null;
  if (
    raw.timeSlotId !== undefined &&
    raw.timeSlotId !== null &&
    raw.timeSlotId !== ""
  ) {
    const parsed = parseInt(raw.timeSlotId, 10);
    if (!TIME_SLOT_IDS.includes(parsed)) {
      return { error: "Invalid time slot" };
    }
    timeSlotId = parsed;
  }

  const facilities = [];
  for (const item of Array.isArray(raw.facilities) ? raw.facilities : []) {
    const facilityId = parseInt(item?.facilityId, 10);
    const quantity = toPositiveQuantity(item?.quantity);
    if (!Number.isInteger(facilityId) || quantity <= 0) continue;
    const existing = facilities.find((f) => f.facilityId === facilityId);
    if (existing) existing.quantity += quantity;
    else facilities.push({ facilityId, quantity });
  }

  const particulars = [];
  for (const item of Array.isArray(raw.particulars) ? raw.particulars : []) {
    const particularId = parseInt(item?.particularId, 10);
    const quantity = toPositiveQuantity(item?.quantity);
    if (!Number.isInteger(particularId) || quantity <= 0) continue;
    const existing = particulars.find((p) => p.particularId === particularId);
    if (existing) existing.quantity += quantity;
    else particulars.push({ particularId, quantity });
  }

  const scope = { timeSlotId, facilities, particulars };
  return isScopeEmpty(scope) ? { scope: null } : { scope };
}

export function isScopeEmpty(scope) {
  if (!scope) return true;
  return (
    scope.timeSlotId == null &&
    (scope.facilities?.length || 0) === 0 &&
    (scope.particulars?.length || 0) === 0
  );
}

export function scopeChangeToJson(scope) {
  if (isScopeEmpty(scope)) return null;
  return JSON.stringify({
    timeSlotId: scope.timeSlotId ?? null,
    facilities: scope.facilities || [],
    particulars: scope.particulars || [],
  });
}

/** Reads the stored JSON back; returns null for "no scope change". */
export function scopeChangeFromJson(value) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return null;
    const scope = {
      timeSlotId: parsed.timeSlotId ?? null,
      facilities: Array.isArray(parsed.facilities) ? parsed.facilities : [],
      particulars: Array.isArray(parsed.particulars) ? parsed.particulars : [],
    };
    return isScopeEmpty(scope) ? null : scope;
  } catch {
    return null;
  }
}

/** Current facilities / particulars / time slot of a reservation. */
export function currentReservationScope(reservation = {}) {
  return {
    timeSlotId: reservation.timeSlotId ?? null,
    facilities: (reservation.facilities || []).map((f) => ({
      facilityId: Number(f.facilityId),
      quantity: Number(f.quantity) || 1,
    })),
    particulars: (reservation.particulars || []).map((p) => ({
      particularId: Number(p.particularId),
      quantity: Number(p.quantity) || 0,
    })),
  };
}

/**
 * What changes between the current scope and the requested one.
 * Quantities are what the review screens print; ids are for the apply step.
 */
export function diffScopeChange(scope, current) {
  const currentFacilities = new Map(
    (current.facilities || []).map((f) => [
      Number(f.facilityId),
      Number(f.quantity) || 1,
    ])
  );
  const currentParticulars = new Map(
    (current.particulars || []).map((p) => [
      Number(p.particularId),
      Number(p.quantity) || 0,
    ])
  );
  const requestedFacilities = new Map(
    (scope.facilities || []).map((f) => [
      Number(f.facilityId),
      Number(f.quantity) || 0,
    ])
  );
  const requestedParticulars = new Map(
    (scope.particulars || []).map((p) => [
      Number(p.particularId),
      Number(p.quantity) || 0,
    ])
  );

  const build = (requested, existing) => {
    const added = [];
    const updated = [];
    const removed = [];
    for (const [id, quantity] of requested) {
      if (!existing.has(id)) added.push({ id, quantity });
      else if (existing.get(id) !== quantity) {
        updated.push({ id, quantity, previousQuantity: existing.get(id) });
      }
    }
    for (const [id, quantity] of existing) {
      if (!requested.has(id)) removed.push({ id, previousQuantity: quantity });
    }
    return { added, updated, removed };
  };

  return {
    timeSlotChanged:
      scope.timeSlotId != null &&
      Number(scope.timeSlotId) !== Number(current.timeSlotId),
    timeSlotId: scope.timeSlotId ?? null,
    previousTimeSlotId: current.timeSlotId ?? null,
    facilities: build(requestedFacilities, currentFacilities),
    particulars: build(requestedParticulars, currentParticulars),
  };
}

function nameOf(list, key, id, fallback) {
  const match = (list || []).find((item) => Number(item[key]) === Number(id));
  return match?.name || fallback;
}

/** Human-readable requested scope, used by the review screens. */
export function formatScopeChange(scope, { facilities = [], particulars = [] } = {}) {
  return {
    timeSlotId: scope.timeSlotId ?? null,
    timeSlotLabel:
      scope.timeSlotId != null ? getTimeSlotLabel(scope.timeSlotId) : "",
    facilities: (scope.facilities || []).map((f) => ({
      facilityId: Number(f.facilityId),
      name: nameOf(facilities, "facilityId", f.facilityId, `Facility ${f.facilityId}`),
      quantity: Number(f.quantity) || 0,
    })),
    particulars: (scope.particulars || []).map((p) => ({
      particularId: Number(p.particularId),
      name: nameOf(
        particulars,
        "particularId",
        p.particularId,
        `Particular ${p.particularId}`
      ),
      quantity: Number(p.quantity) || 0,
    })),
  };
}

/** One-line summary for notifications and audit rows. */
export function describeScopeChange(scope, { facilities = [], particulars = [] } = {}) {
  if (isScopeEmpty(scope)) return "";

  const parts = [];
  if (scope.timeSlotId != null) {
    parts.push(`time slot: ${getTimeSlotLabel(scope.timeSlotId)}`);
  }
  if (scope.facilities?.length) {
    parts.push(
      `facilities: ${scope.facilities
        .map(
          (f) =>
            `${nameOf(facilities, "facilityId", f.facilityId, `Facility ${f.facilityId}`)} × ${
              Number(f.quantity) || 1
            }`
        )
        .join(", ")}`
    );
  }
  if (scope.particulars?.length) {
    parts.push(
      `particulars: ${scope.particulars
        .map(
          (p) =>
            `${nameOf(particulars, "particularId", p.particularId, `Particular ${p.particularId}`)} × ${
              Number(p.quantity) || 0
            }`
        )
        .join(", ")}`
    );
  }
  return parts.join("; ");
}

/**
 * Recomputes the reservation amount - and the charge lines printed on the order
 * of payment - from the requested scope, using the same rate basis the booking
 * forms charge with:
 *
 *   package   -> the package rate for the requested time slot × event days
 *   facilities-> each facility's rate for the time slot × units × event days
 *   particulars -> the rate rules in lib/particular-pricing.js
 *
 * @param {object} input
 * @param {object[]} [input.packages] package catalogue (id, name, rates, slot)
 * @param {number|null} [input.packageId]
 * @param {number|null} [input.timeSlotId]
 * @param {number} [input.eventDayCount] number of event days
 * @param {object[]} [input.facilityRates] `{ facilityId, name, rateDay, rateNight }`
 * @param {object[]} [input.facilities] requested `{ facilityId, quantity }`
 * @param {object[]} [input.particulars] requested `{ particularId, name, quantity, unitCost }`
 * @returns {{ lines: {label: string, amount: number, facilityId?: string,
 *             quantity?: number}[], total: number }}
 */
export function computeScopeAmounts({
  packages = [],
  packageId = null,
  timeSlotId = null,
  eventDayCount = 1,
  facilityRates = [],
  facilities = [],
  particulars = [],
} = {}) {
  const days = Math.max(1, Number(eventDayCount) || 1);
  const lines = [];

  const pkg = packages.find((p) => Number(p.packageId) === Number(packageId));
  if (pkg) {
    const rate = getPackageBillingRate(pkg, timeSlotId, packages);
    if (rate > 0) {
      const base = packageSummaryLabel(pkg, timeSlotId, packages);
      lines.push({
        label: days > 1 ? `${base} × ${days} day(s)` : base,
        amount: rate * days,
      });
    }
  }

  for (const item of facilities) {
    const facility = facilityRates.find(
      (f) => Number(f.facilityId) === Number(item.facilityId)
    );
    if (!facility) continue;
    const rate = getFacilityRateForSlot(facility, timeSlotId);
    const quantity = Math.max(1, Number(item.quantity) || 1);
    if (rate <= 0) continue;
    lines.push({
      label: `${facility.name} × ${quantity}${
        days > 1 ? ` × ${days} day(s)` : ""
      }`,
      amount: rate * quantity * days,
      facilityId: String(facility.facilityId),
      quantity,
    });
  }

  for (const item of particulars) {
    const amount = particularLineWeight({
      particularName: item.name,
      quantity: item.quantity,
      unitCost: item.unitCost,
      eventDayCount: days,
    });
    if (amount <= 0) continue;
    const { label } = formatReservedParticularCharge(
      { name: item.name, quantity: item.quantity, unitCost: item.unitCost },
      { eventDayCount: days }
    );
    lines.push({ label: label || item.name, amount });
  }

  return {
    lines,
    total: roundMoney(lines.reduce((sum, line) => sum + line.amount, 0)),
  };
}
