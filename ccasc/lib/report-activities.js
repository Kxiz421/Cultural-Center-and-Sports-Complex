/**
 * Shared "List of Activities" report builders.
 *
 * Mirrors the printed SCGCC form:
 *
 *   LIST OF SCGCC ACTIVITIES
 *   FOR THE <PERIOD>
 *   DATE | ACTIVITIES | TIME | AMOUNT
 *
 * The paper form carries an "OR NUMBER" column, but generated reports
 * deliberately omit it — receipt numbers are never printed here.
 *
 * Charge classification (used for the summary block) is derived from data the
 * database already holds, so no extra column is required:
 *
 *   - `Client.clientRoleId === "PROV"` → government/PGSC activity (free of charge)
 *   - otherwise                        → paid by the private sector
 *   - `Payment.discountAmount > 0`     → itemised "charged to PGO" line, which is
 *                                        how the paper form records a discount
 */

import { walkInDisplayName } from "@/lib/walk-in";

export const CHARGE_PGSC = "pgsc";
export const CHARGE_PGO = "pgo";
export const CHARGE_PRIVATE = "private";

export const CHARGE_LABELS = {
  [CHARGE_PGSC]: "PGSC Activity",
  [CHARGE_PGO]: "Charged to PGO",
  [CHARGE_PRIVATE]: "Private Sector",
};

const MONTH_BANDS = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
];

export function monthBand(date) {
  return MONTH_BANDS[new Date(date).getMonth()] || "";
}

/** "8am-5pm" style label matching the paper form's TIME column. */
export function timeRange(timeSlot) {
  if (!timeSlot?.startTime || !timeSlot?.endTime) return "—";
  return `${timeSlot.startTime}-${timeSlot.endTime}`;
}

/**
 * ISO date → the DATE column. Multi-day events print as "15-16" when the
 * additional dates share the month, otherwise a plain day number.
 */
export function dateCell(date, additionalDates = []) {
  const primary = new Date(date);
  const days = [primary.getDate()];
  for (const extra of additionalDates) {
    const d = new Date(extra);
    if (d.getMonth() === primary.getMonth() && d.getFullYear() === primary.getFullYear()) {
      days.push(d.getDate());
    }
  }
  const unique = [...new Set(days)].sort((a, b) => a - b);
  if (unique.length <= 1) return String(unique[0] ?? "");
  return unique.join("-");
}

/**
 * Turns one reservation into its single report line. Any discount the LTOO
 * granted rides on the row (and is counted as an amount charged to PGO by the
 * summary) instead of being printed as a second row.
 */
export function buildActivityRows(reservation) {
  const client = reservation.client || {};
  const isProvincial = client.clientRoleId === "PROV";
  const amount = Number(reservation.totalAmount || 0);
  const dayLabel = dateCell(reservation.eventDate, reservation.additionalDates || []);

  const discounts = (reservation.bookings || []).flatMap((b) => b.payments || []);
  const discountTotal = discounts.reduce(
    (sum, p) => sum + Number(p.discountAmount || 0),
    0
  );

  return [
    {
      date: reservation.eventDate,
      dayLabel,
      activities: reservation.eventType || "—",
      time: timeRange(reservation.timeSlot),
      amount,
      discountAmount: discountTotal,
      chargeType: isProvincial ? CHARGE_PGSC : CHARGE_PRIVATE,
      chargeLabel: isProvincial
        ? CHARGE_LABELS[CHARGE_PGSC]
        : CHARGE_LABELS[CHARGE_PRIVATE],
      venue: reservation.venue?.venue || "",
      clientName:
        [client.firstName, client.lastName].filter(Boolean).join(" ") ||
        walkInDisplayName(reservation.notes),
      organization: client.clientOrg?.organizationName || "",
    },
  ];
}

/**
 * Groups flat rows into the printed layout: one section per month (yearly
 * reports only) with the rows sorted by date.
 */
export function buildSections(rows, { groupByMonth }) {
  const sorted = [...rows].sort(
    (a, b) => new Date(a.date) - new Date(b.date) || a.activities.localeCompare(b.activities)
  );

  if (!groupByMonth) {
    return [{ band: null, rows: sorted }];
  }

  const sections = [];
  for (const row of sorted) {
    const band = monthBand(row.date);
    const last = sections[sections.length - 1];
    if (last && last.band === band) {
      last.rows.push(row);
    } else {
      sections.push({ band, rows: [row] });
    }
  }
  return sections;
}

/** Summary block: TOTAL AMOUNT, CHARGED TO PGO, PGSC-FOC, PRIVATE, TOTAL INCOME. */
export function buildTotals(rows) {
  let totalAmount = 0;
  let chargedToPgo = 0;
  let pgscFoc = 0;
  let privateSectors = 0;

  for (const row of rows) {
    const amount = Number(row.amount) || 0;
    const discount = Number(row.discountAmount) || 0;
    totalAmount += amount;
    // Every discount the LTOO granted is shouldered by the PGO.
    chargedToPgo += discount;
    if (row.chargeType === CHARGE_PGSC) {
      pgscFoc += amount;
    } else {
      // Private events only pay the amount left after their discount.
      privateSectors += Math.max(0, amount - discount);
    }
  }

  return {
    totalAmount,
    chargedToPgo,
    pgscFoc,
    privateSectors,
    totalIncome: totalAmount,
  };
}

/** Assembles the payload consumed by the document component. */
export function buildActivitiesReport({ rows, meta }) {
  const sections = buildSections(rows, { groupByMonth: !!meta.groupByMonth });
  return {
    ...meta,
    sections,
    totals: buildTotals(rows),
    rowCount: rows.length,
  };
}

const PESO = new Intl.NumberFormat("en-PH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "729,650.00" — the paper form prints bare numbers, no currency symbol. */
export function formatAmount(amount) {
  return PESO.format(Number(amount) || 0);
}
