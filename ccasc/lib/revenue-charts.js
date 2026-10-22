/**
 * Dashboard revenue charts.
 *
 * Builds the two series behind the "Revenue Analytics" card on every
 * revenue-bearing staff dashboard:
 *
 *   `trend`     - collected revenue per bucket of the selected period
 *                 (year -> 12 months, month -> each day, day -> each hour).
 *   `breakdown` - the same revenue split per facility or per particular,
 *                 reusing the exact allocation rules of the Revenue Report
 *                 (`lib/report-revenue.js`) so the pie matches that report.
 *
 * Revenue is taken from the receipt rows (`Transaction.payment.amountPaid`) so
 * the charts reconcile with the daily/weekly/monthly/yearly cards, then each
 * receipt is spread across its reservation's facilities/particulars by the same
 * weights the report uses. Nothing here touches Prisma.
 */

import {
  REVENUE_GROUP_FACILITY,
  REVENUE_GROUP_PARTICULAR,
  reservationAllocations,
  round2,
} from "@/lib/report-revenue";
import { extractChargeBreakdownFromNotes } from "@/lib/reservation-charge-breakdown";

export const CHART_PERIODS = ["day", "month", "year"];
export const CHART_GROUPS = [REVENUE_GROUP_PARTICULAR, REVENUE_GROUP_FACILITY];

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const MONTH_LABELS_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const HOUR_LABELS = Array.from({ length: 24 }, (_, h) => {
  const suffix = h < 12 ? "AM" : "PM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour} ${suffix}`;
});

export function isChartPeriod(value) {
  return CHART_PERIODS.includes(value);
}

export function isChartGroup(value) {
  return CHART_GROUPS.includes(value);
}

function toInt(value, fallback) {
  const parsed = parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : fallback;
}

function clampMonth(value) {
  return Math.min(11, Math.max(0, value));
}

function clampDay(value, year, month) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return Math.min(lastDay, Math.max(1, value));
}

/**
 * Resolve the selected period into a date range plus the bucket grid the trend
 * chart is drawn on.
 *
 * @param {{ period?: string, year?: string|number, month?: string|number, day?: string|number }} input
 * @param {Date} [now]
 * @returns {{ period: string, year: number, month?: number, day?: number,
 *             label: string, start: Date, end: Date,
 *             buckets: string[], bucketIndex: (d: Date) => number }}
 */
export function resolveChartWindow(input = {}, now = new Date()) {
  const period = isChartPeriod(input.period) ? input.period : "month";
  const year = toInt(input.year, now.getFullYear());

  if (period === "year") {
    return {
      period,
      year,
      label: String(year),
      start: new Date(year, 0, 1, 0, 0, 0, 0),
      end: new Date(year, 11, 31, 23, 59, 59, 999),
      buckets: MONTH_LABELS.slice(),
      bucketIndex: (date) => date.getMonth(),
    };
  }

  if (period === "day") {
    const month = clampMonth(toInt(input.month, now.getMonth()));
    const day = clampDay(toInt(input.day, now.getDate()), year, month);
    return {
      period,
      year,
      month,
      day,
      label: `${MONTH_LABELS_FULL[month]} ${day}, ${year}`,
      start: new Date(year, month, day, 0, 0, 0, 0),
      end: new Date(year, month, day, 23, 59, 59, 999),
      buckets: HOUR_LABELS.slice(),
      bucketIndex: (date) => date.getHours(),
    };
  }

  const month = clampMonth(toInt(input.month, now.getMonth()));
  const lastDay = new Date(year, month + 1, 0).getDate();
  return {
    period: "month",
    year,
    month,
    label: `${MONTH_LABELS_FULL[month]} ${year}`,
    start: new Date(year, month, 1, 0, 0, 0, 0),
    end: new Date(year, month + 1, 0, 23, 59, 59, 999),
    buckets: Array.from({ length: lastDay }, (_, i) => String(i + 1)),
    bucketIndex: (date) => date.getDate() - 1,
  };
}

/** Shape a loaded reservation into what `reservationAllocations` expects. */
function prepareReservation(reservation, facilitiesById) {
  const facilityIds = [
    ...new Set((reservation.schedules || []).map((s) => s.facilityId)),
  ];

  return {
    id: reservation.reservationId,
    venueId: reservation.venueId,
    packageId: reservation.package?.packageId ?? null,
    packageName: reservation.package?.packageName || "",
    totalAmount: Number(reservation.totalAmount) || 0,
    collectedAmount: 0,
    additionalDateCount: (reservation.additionalDates || []).length,
    particulars: (reservation.reservedParticulars || []).map((rp) => ({
      particularId: rp.particular?.particularId ?? rp.particularId,
      particularName: rp.particular?.particularName || "",
      quantity: rp.quantity,
      unitCost: Number(rp.particular?.inventory?.unitCost || 0),
    })),
    facilities: facilityIds.map((id) => {
      const info = facilitiesById.get(Number(id));
      return {
        facilityId: Number(id),
        facilityName: info?.facilityName || `Facility ${id}`,
        rateDay: Number(info?.rateDay || 0),
      };
    }),
    chargeLines: extractChargeBreakdownFromNotes(reservation.notes) || [],
  };
}

/**
 * @param {object} input
 * @param {object[]} input.transactions receipt rows with `payment.booking.reservation`
 * @param {Map<number, {facilityName: string, rateDay: number}>} input.facilitiesById
 * @param {"facility"|"particular"} input.group
 * @param {object} input.window result of {@link resolveChartWindow}
 */
export function buildRevenueCharts({ transactions, facilitiesById, group, window }) {
  const trend = window.buckets.map((label) => ({ label, amount: 0 }));
  const breakdown = new Map();
  let total = 0;

  const add = (key, label, amount) => {
    const entry = breakdown.get(key) || { key, label, amount: 0 };
    entry.amount += amount;
    breakdown.set(key, entry);
  };

  for (const transaction of transactions || []) {
    const amount = Number(transaction.payment?.amountPaid ?? 0);
    if (!amount) continue;

    const when = new Date(transaction.paymentDate);
    if (Number.isNaN(when.getTime())) continue;

    const index = window.bucketIndex(when);
    if (index >= 0 && index < trend.length) trend[index].amount += amount;
    total += amount;

    const reservation = transaction.payment?.booking?.reservation;
    if (!reservation) {
      add("unassigned", "Unassigned", amount);
      continue;
    }

    const allocations = reservationAllocations(
      prepareReservation(reservation, facilitiesById),
      group,
    );
    const allocationTotal = allocations.reduce(
      (sum, item) => sum + (Number(item.amount) || 0),
      0,
    );
    if (allocationTotal <= 0) {
      add("unassigned", "Unassigned", amount);
      continue;
    }

    for (const item of allocations) {
      const share = (Number(item.amount) || 0) / allocationTotal;
      add(item.key, item.label, amount * share);
    }
  }

  return {
    total: round2(total),
    trend: trend.map((bucket) => ({ ...bucket, amount: round2(bucket.amount) })),
    breakdown: [...breakdown.values()]
      .map((row) => ({ ...row, amount: round2(row.amount) }))
      .sort((a, b) => b.amount - a.amount || a.label.localeCompare(b.label)),
  };
}
