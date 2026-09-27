import {
  formatReservedParticularCharge,
  isBasketballEncodedQuantity,
} from "@/lib/particular-options";
import { particularLineWeight } from "@/lib/particular-pricing";

export { particularLineWeight };

/**
 * Shared "Revenue Report" builders.
 *
 * The revenue report answers "how much did this particular / venue / package
 * earn in the selected period" and always reconciles with the LIST OF SCGCC
 * ACTIVITIES amounts (both read `Reservation.totalAmount` for the same period).
 *
 * Every report carries two tables:
 *
 *   `groups` - the requested breakdown (per particular / venue / package /
 *              facility) with the amounts, what has been collected and how many
 *              units (quantity) each group is made of.
 *   `items`  - the itemised make-up of the reservations behind those figures:
 *              the **package**, the **particulars used** and the **facilities**
 *              booked, each with its own amount. Cultural Center reservations
 *              therefore show their package and particular amounts, and Sports
 *              Complex reservations show their facility amounts.
 *
 * Rules
 * -----
 *   - Revenue is the reservation amount; `collected` is what the recorded
 *     payments add up to, and `balance` is the difference between the two.
 *   - Grouping by venue or package never splits a reservation: each reservation
 *     has exactly one venue and at most one package, so those totals are exact.
 *   - Grouping by particular CAN split a reservation, because one reservation
 *     may reserve several particulars. The reservation amount is apportioned
 *     across its particulars using the same rate basis the reservation API uses
 *     when it prices them (`unitCost × quantity`, the Basketball Game option
 *     price, the Venue Rental rate). A reservation whose particulars have no
 *     rate at all is split evenly. The shares of one reservation add up to that
 *     reservation's amount, so no group is double counted.
 *   - Grouping by facility works the same way for the Sports Complex, where
 *     every facility is billed separately (see `facilityAllocations`).
 *   - Reservations without any particular / facility are reported as a single
 *     "No particular" / "No facility recorded" line so the report total still
 *     matches the period total.
 *
 * Nothing here touches Prisma: the API routes load the rows, these builders
 * shape them, and the document / CSV exports render the result.
 */

export const REVENUE_GROUP_VENUE = "venue";
export const REVENUE_GROUP_PACKAGE = "package";
export const REVENUE_GROUP_PARTICULAR = "particular";
export const REVENUE_GROUP_FACILITY = "facility";

export const NO_PARTICULAR_LABEL = "No particular (venue / package only)";
export const NO_PACKAGE_LABEL = "No package (facilities / particulars only)";
export const NO_FACILITY_LABEL = "No facility recorded";

export const REVENUE_GROUP_LABELS = {
  [REVENUE_GROUP_PARTICULAR]: "Particular",
  [REVENUE_GROUP_VENUE]: "Venue",
  [REVENUE_GROUP_PACKAGE]: "Package",
  [REVENUE_GROUP_FACILITY]: "Facility",
};

/** True for the groupings the report API understands. */
export function isRevenueGroup(value) {
  return (
    value === REVENUE_GROUP_PARTICULAR ||
    value === REVENUE_GROUP_VENUE ||
    value === REVENUE_GROUP_PACKAGE ||
    value === REVENUE_GROUP_FACILITY
  );
}

/**
 * Rate basis of one reserved particular — mirrors the pricing rules in
 * `POST /api/reservations` so a particular's share follows what was charged.
 * (Implementation lives in lib/particular-pricing.js and is re-exported above.)
 */

/** Cent-accurate money, so report payloads never carry float noise. */
export function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

/** Weights -> 0..1 shares that always add up to 1. */
export function particularShares(weights) {
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total > 0) return weights.map((w) => w / total);
  const even = 1 / (weights.length || 1);
  return weights.map(() => even);
}

export const ITEM_TYPE_PACKAGE = "Package";
export const ITEM_TYPE_PARTICULAR = "Particular";
export const ITEM_TYPE_FACILITY = "Facility";
export const ITEM_TYPE_OTHER = "Other";

/** Lowercase, punctuation-free label used to recognise stored package lines. */
function normalizeLabel(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[×x]\s*\d+\s*day\(s\)/g, " ")
    .replace(/\b(whole\s*day|day|night)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Which charge a stored breakdown line represents. Facility lines carry a
 * `facilityId`; package lines use the reservation's package name (the booking
 * form may add a slot prefix or a day multiplier); everything else is a
 * particular.
 */
function classifyChargeLine(line, reservation) {
  if (line.facilityId) return ITEM_TYPE_FACILITY;
  const packageKey = normalizeLabel(reservation.packageName);
  if (packageKey && normalizeLabel(line.label).includes(packageKey)) {
    return ITEM_TYPE_PACKAGE;
  }
  return ITEM_TYPE_PARTICULAR;
}

/** Label + quantity of one reserved particular for the itemised table. */
function particularItem(particular, eventDayCount) {
  const quantity = Number(particular.quantity) || 0;
  // Reuses the saved-reservation label format: "Chair × 700",
  // "Basketball Game — Day w/ Shot Clock", "Venue Rental — Day (8:00 AM – 5:00 PM)".
  const { label } = formatReservedParticularCharge(
    {
      name: particular.particularName,
      quantity,
      unitCost: particular.unitCost,
    },
    { eventDayCount }
  );

  return {
    itemLabel: label || particular.particularName || "Particular",
    itemType: ITEM_TYPE_PARTICULAR,
    // A Basketball Game quantity is the encoded game type, not a count.
    quantity: isBasketballEncodedQuantity(quantity) ? 0 : quantity,
    date: null,
    amount: particularLineWeight({ ...particular, eventDayCount }),
  };
}

/**
 * Itemised make-up of one reservation: the package, the particulars used and
 * the facilities booked, each with its own amount.
 *
 * Reservations booked through the app store their charge breakdown, so those
 * exact lines are used (the form writes the package, particular and facility
 * amounts that were actually charged). Older reservations without a breakdown
 * are rebuilt from the reserved particulars, the package and the booked
 * facilities, then scaled so the items still add up to the reservation amount.
 *
 * @param {object} reservation prepared row (see `reservationAllocations`)
 * @returns {{ itemLabel: string, itemType: string, quantity: number,
 *             amount: number, date: string|null }[]}
 */
export function reservationChargeItems(reservation) {
  const amount = Number(reservation.totalAmount) || 0;
  const stored = (reservation.chargeLines || []).filter(
    (line) => Number(line.amount) > 0
  );

  if (stored.length > 0) {
    return stored.map((line) => ({
      itemLabel: line.label || "Charge",
      itemType: classifyChargeLine(line, reservation),
      quantity: line.facilityId ? Number(line.quantity) || 0 : 0,
      amount: Number(line.amount) || 0,
      date: line.date || null,
    }));
  }

  const eventDayCount = 1 + (Number(reservation.additionalDateCount) || 0);
  const items = (reservation.particulars || []).map((particular) =>
    particularItem(particular, eventDayCount)
  );
  const particularTotal = items.reduce((sum, item) => sum + item.amount, 0);

  if (reservation.packageName) {
    items.push({
      itemLabel: reservation.packageName,
      itemType: ITEM_TYPE_PACKAGE,
      quantity: 0,
      amount: Math.max(0, amount - particularTotal),
      date: null,
    });
  } else if (items.length === 0 && (reservation.facilities || []).length > 0) {
    // Facility-only booking (Sports Complex): split by whole-day rate.
    const shares = particularShares(
      reservation.facilities.map((facility) => Number(facility.rateDay) || 0)
    );
    return reservation.facilities.map((facility, index) => ({
      itemLabel: facility.facilityName || `Facility ${facility.facilityId}`,
      itemType: ITEM_TYPE_FACILITY,
      quantity: 1,
      amount: amount * shares[index],
      date: null,
    }));
  }

  if (items.length === 0) {
    items.push({
      itemLabel: "Reservation total",
      itemType: ITEM_TYPE_OTHER,
      quantity: 0,
      amount,
      date: null,
    });
  }

  // Rate basis can differ from the stored total (discounts or a manually
  // entered amount), so the derived lines are scaled to the reservation amount.
  const itemTotal = items.reduce((sum, item) => sum + item.amount, 0);
  if (itemTotal > 0 && Math.abs(itemTotal - amount) > 0.01) {
    const factor = amount / itemTotal;
    for (const item of items) {
      item.amount *= factor;
    }
  }

  return items;
}

/**
 * Splits one reservation across the facilities it booked.
 *
 * The Sports Complex bills every facility separately and the booking form stores
 * those amounts (with their `facilityId`) in the reservation's charge
 * breakdown, so those exact figures are used. Any amount that is not tied to a
 * facility line (an add-on particular charged on the same reservation) is
 * apportioned across the booked facilities, and reservations that only carry
 * facility schedules (older bookings without a breakdown) are split by the
 * whole-day rate of each booked facility. The shares of one reservation add up
 * to its amount, so no facility is double counted.
 */
function facilityAllocations(reservation, { amount, collected, reservationId }) {
  const bookedFacilities = reservation.facilities || [];
  const linesByFacility = new Map();

  for (const line of reservation.chargeLines || []) {
    if (!line.facilityId) continue;
    const lineAmount = Number(line.amount) || 0;
    if (lineAmount <= 0) continue;
    const key = String(line.facilityId);
    const entry = linesByFacility.get(key) || { amount: 0, quantity: 0 };
    entry.amount += lineAmount;
    // Facility lines carry the number of units booked on that date.
    entry.quantity += Number(line.quantity) || 0;
    linesByFacility.set(key, entry);
  }

  const collectedFor = (facilityAmount) =>
    amount > 0 ? collected * (facilityAmount / amount) : 0;

  if (linesByFacility.size > 0) {
    const entries = [...linesByFacility.entries()];
    const chargedTotal = entries.reduce(
      (sum, [, entry]) => sum + entry.amount,
      0
    );
    // Add-ons that are not billed per facility follow the facility they were
    // booked with, so the facility rows still total the reservation amount.
    const leftover = Math.max(0, amount - chargedTotal);
    const shares = particularShares(entries.map(([, entry]) => entry.amount));

    return entries.map(([id, entry], index) => {
      const facilityId = Number(id);
      const facilityAmount = entry.amount + leftover * shares[index];
      const info = bookedFacilities.find(
        (facility) => String(facility.facilityId) === String(id)
      );
      return allocation({
        key: `facility:${facilityId}`,
        label: info?.facilityName || `Facility ${facilityId}`,
        facilityId,
        quantity: entry.quantity,
        amount: facilityAmount,
        collected: collectedFor(facilityAmount),
        reservationId,
      });
    });
  }

  if (bookedFacilities.length > 0) {
    const shares = particularShares(
      bookedFacilities.map((facility) => Number(facility.rateDay) || 0)
    );
    return bookedFacilities.map((facility, index) =>
      allocation({
        key: `facility:${facility.facilityId}`,
        label: facility.facilityName || `Facility ${facility.facilityId}`,
        facilityId: facility.facilityId,
        quantity: 1,
        amount: amount * shares[index],
        collected: collectedFor(amount * shares[index]),
        reservationId,
      })
    );
  }

  return [
    allocation({
      key: "facility:none",
      label: NO_FACILITY_LABEL,
      amount,
      collected,
      reservationId,
    }),
  ];
}

function allocation({
  key,
  label,
  amount,
  collected,
  reservationId,
  particularId = null,
  facilityId = null,
  quantity = 0,
}) {
  return {
    key,
    label,
    amount,
    collected,
    balance: amount - collected,
    reservationId,
    particularId,
    facilityId,
    quantity,
  };
}

/**
 * Splits one reservation into the report line(s) selected by `groupBy`.
 *
 * @param {object} reservation row prepared by the report API:
 *   `{ id, venueId, venueName, packageId, packageName, totalAmount,
 *      collectedAmount, additionalDateCount, particulars[], facilities[],
 *      chargeLines[] }`
 * @param {string} groupBy `particular` | `venue` | `package` | `facility`
 */
export function reservationAllocations(reservation, groupBy) {
  const amount = Number(reservation.totalAmount) || 0;
  const collected = Number(reservation.collectedAmount) || 0;
  const reservationId = reservation.id;

  if (groupBy === REVENUE_GROUP_VENUE) {
    return [
      allocation({
        key: `venue:${reservation.venueId}`,
        label: reservation.venueName || `Venue ${reservation.venueId}`,
        amount,
        collected,
        reservationId,
      }),
    ];
  }

  if (groupBy === REVENUE_GROUP_FACILITY) {
    return facilityAllocations(reservation, { amount, collected, reservationId });
  }

  if (groupBy === REVENUE_GROUP_PACKAGE) {
    return [
      allocation({
        key: `package:${reservation.packageId ?? 0}`,
        label: reservation.packageName || NO_PACKAGE_LABEL,
        amount,
        collected,
        reservationId,
      }),
    ];
  }

  const particulars = reservation.particulars || [];
  if (particulars.length === 0) {
    return [
      allocation({
        key: "particular:none",
        label: NO_PARTICULAR_LABEL,
        amount,
        collected,
        reservationId,
      }),
    ];
  }

  const eventDayCount = 1 + (Number(reservation.additionalDateCount) || 0);
  const weights = particulars.map((p) =>
    particularLineWeight({ ...p, eventDayCount })
  );
  const shares = particularShares(weights);

  return particulars.map((p, index) => {
    const quantity = Number(p.quantity) || 0;
    return allocation({
      key: `particular:${p.particularId}`,
      label: p.particularName || `Particular ${p.particularId}`,
      particularId: p.particularId,
      // A Basketball Game quantity is the encoded game type, not a count.
      quantity: isBasketballEncodedQuantity(quantity) ? 0 : quantity,
      amount: amount * shares[index],
      collected: collected * shares[index],
      reservationId,
    });
  });
}

/** Rolls allocations up per group, richest group first. */
export function buildRevenueGroups(allocations) {
  const map = new Map();

  for (const item of allocations) {
    const entry = map.get(item.key) || {
      key: item.key,
      label: item.label,
      amount: 0,
      collected: 0,
      quantity: 0,
      reservationIds: new Set(),
    };

    entry.amount += item.amount;
    entry.collected += item.collected;
    entry.quantity += item.quantity;
    entry.reservationIds.add(item.reservationId);
    map.set(item.key, entry);
  }

  return [...map.values()]
    .map((entry) => ({
      key: entry.key,
      label: entry.label,
      amount: round2(entry.amount),
      collected: round2(entry.collected),
      balance: round2(entry.amount - entry.collected),
      reservations: entry.reservationIds.size,
      quantity: entry.quantity,
    }))
    .sort((a, b) => b.amount - a.amount || a.label.localeCompare(b.label));
}

/**
 * Assembles the payload consumed by the revenue document and CSV export.
 *
 * @param {object} input
 * @param {object[]} input.reservations prepared reservation rows
 * @param {string} input.groupBy
 * @param {number|null} [input.particularId] keep one particular's share only
 * @param {number|null} [input.facilityId] keep one facility's share only
 * @param {object} input.meta period / scope labels attached to the report
 */
export function buildRevenueReport({
  reservations = [],
  groupBy = REVENUE_GROUP_PARTICULAR,
  particularId = null,
  facilityId = null,
  meta = {},
}) {
  const byId = new Map(reservations.map((r) => [r.id, r]));

  let allocations = reservations.flatMap((r) =>
    reservationAllocations(r, groupBy)
  );

  // Filtering to one particular / facility keeps that entity's share of each
  // reservation - not the whole reservation amount - so the figure stays
  // consistent with the unfiltered breakdown.
  if (particularId) {
    allocations = allocations.filter((a) => a.particularId === particularId);
  }
  if (facilityId) {
    allocations = allocations.filter((a) => a.facilityId === facilityId);
  }

  const groups = buildRevenueGroups(allocations);
  const amount = groups.reduce((sum, g) => sum + g.amount, 0);
  const collected = groups.reduce((sum, g) => sum + g.collected, 0);

  // Itemised make-up of every reservation counted above: its package,
  // particulars and facilities with their own amounts. `collected` follows the
  // same proportion so each item shows what has actually been paid for it.
  const counted = [...new Set(allocations.map((a) => a.reservationId))].map(
    (id) => byId.get(id)
  );

  const items = counted
    .flatMap((reservation) => {
      const reservationAmount = Number(reservation.totalAmount) || 0;
      const reservationCollected = Number(reservation.collectedAmount) || 0;
      const shareOf = (lineAmount) =>
        reservationAmount > 0 ? lineAmount / reservationAmount : 0;

      return reservationChargeItems(reservation).map((line) => {
        const lineAmount = round2(line.amount);
        const lineCollected = round2(reservationCollected * shareOf(line.amount));
        return {
          date: line.date || reservation.eventDate || "",
          dayLabel: reservation.dayLabel || "",
          eventType: reservation.eventType || "—",
          clientName: reservation.clientName || "",
          venue: reservation.venueName || "",
          packageName: reservation.packageName || "",
          itemLabel: line.itemLabel,
          itemType: line.itemType,
          quantity: line.quantity || 0,
          amount: lineAmount,
          collected: lineCollected,
          balance: round2(lineAmount - lineCollected),
        };
      });
    })
    .sort(
      (a, b) =>
        new Date(a.date) - new Date(b.date) ||
        a.eventType.localeCompare(b.eventType) ||
        a.itemType.localeCompare(b.itemType) ||
        a.itemLabel.localeCompare(b.itemLabel)
    );

  return {
    ...meta,
    groupBy,
    groupLabel:
      REVENUE_GROUP_LABELS[groupBy] || REVENUE_GROUP_LABELS.particular,
    groups,
    items,
    totals: {
      amount: round2(amount),
      collected: round2(collected),
      balance: round2(amount - collected),
      reservations: counted.length,
      groups: groups.length,
      items: items.length,
    },
    rowCount: groups.length,
  };
}
