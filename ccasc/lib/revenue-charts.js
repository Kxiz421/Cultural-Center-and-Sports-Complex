/**
 * Dashboard revenue charts.
 *
 * Two INDEPENDENT series feed the "Revenue Analytics" card on every
 * revenue-bearing staff dashboard:
 *
 *   `graph` - collected revenue per time bucket (Weekly -> last 8 weeks,
 *             Monthly -> the 12 months of a year, Yearly -> the last 5 years).
 *             Same shape for the Cultural Center and the Sports Complex.
 *   `pie`   - what the revenue is made of: each particular or package used
 *             (Cultural Center) or each facility used (Sports Complex), with
 *             the amount, its share and how many reservations used it.
 *
 * Revenue is the receipt rows (`Transaction.payment.amountPaid`) so the charts
 * reconcile with the daily/weekly/monthly/yearly cards, then each receipt is
 * spread across its reservation's particular / package / facility by the same
 * weights the Revenue Report uses (`lib/report-revenue.js`). Nothing here
 * touches Prisma.
 */

import {
  REVENUE_GROUP_FACILITY,
  REVENUE_GROUP_PACKAGE,
  REVENUE_GROUP_PARTICULAR,
  reservationAllocations,
  round2,
} from "@/lib/report-revenue";
import { extractChargeBreakdownFromNotes } from "@/lib/reservation-charge-breakdown";

export const CHART_PERIODS = ["week", "month", "year"];
export const CHART_GROUPS = [
  REVENUE_GROUP_PARTICULAR,
  REVENUE_GROUP_PACKAGE,
  REVENUE_GROUP_FACILITY,
];

const DAY_MS = 24 * 60 * 60 * 1000;

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const WEEK_BUCKETS = 8;
const YEAR_BUCKETS = 5;

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

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Resolve the selected period into the bucket grid the graph is drawn on.
 *
 * @param {{ period?: string, year?: string|number }} input
 * @param {Date} [now]
 * @returns {{ period: string, year: number|null, label: string,
 *             start: Date, end: Date,
 *             buckets: string[], bucketIndex: (d: Date) => number }}
 */
export function resolveChartWindow(input = {}, now = new Date()) {
  const period = isChartPeriod(input.period) ? input.period : "month";

  if (period === "week") {
    const today = startOfDay(now);
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay());

    const firstStart = new Date(thisWeekStart);
    firstStart.setDate(thisWeekStart.getDate() - 7 * (WEEK_BUCKETS - 1));

    const end = new Date(thisWeekStart);
    end.setDate(thisWeekStart.getDate() + 7);
    end.setMilliseconds(end.getMilliseconds() - 1);

    const buckets = Array.from({ length: WEEK_BUCKETS }, (_, i) => {
      const d = new Date(firstStart);
      d.setDate(firstStart.getDate() + 7 * i);
      return `${MONTH_LABELS[d.getMonth()]} ${d.getDate()}`;
    });

    return {
      period,
      year: null,
      label: "Last 8 weeks",
      start: firstStart,
      end,
      buckets,
      bucketIndex: (date) =>
        Math.floor((startOfDay(date) - firstStart) / DAY_MS / 7),
    };
  }

  if (period === "year") {
    const thisYear = now.getFullYear();
    const firstYear = thisYear - (YEAR_BUCKETS - 1);
    return {
      period,
      year: null,
      label: `${firstYear}\u2013${thisYear}`,
      start: new Date(firstYear, 0, 1, 0, 0, 0, 0),
      end: new Date(thisYear, 11, 31, 23, 59, 59, 999),
      buckets: Array.from({ length: YEAR_BUCKETS }, (_, i) =>
        String(firstYear + i),
      ),
      bucketIndex: (date) => date.getFullYear() - firstYear,
    };
  }

  const year = toInt(input.year, now.getFullYear());
  return {
    period: "month",
    year,
    label: String(year),
    start: new Date(year, 0, 1, 0, 0, 0, 0),
    end: new Date(year, 11, 31, 23, 59, 59, 999),
    buckets: MONTH_LABELS.slice(),
    bucketIndex: (date) => date.getMonth(),
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
 * @param {"particular"|"package"|"facility"} input.group
 * @param {object} input.window result of {@link resolveChartWindow}
 */
export function buildRevenueCharts({
  transactions,
  facilitiesById,
  group,
  window,
  breakdownTransactions,
}) {
  const graph = window.buckets.map((label) => ({ label, amount: 0 }));

  for (const transaction of transactions || []) {
    const amount = Number(transaction.payment?.amountPaid ?? 0);
    if (!amount) continue;

    const when = new Date(transaction.paymentDate);
    if (Number.isNaN(when.getTime())) continue;

    const index = window.bucketIndex(when);
    if (index >= 0 && index < graph.length) graph[index].amount += amount;
  }

  const pie = new Map();
  let total = 0;

  const add = (key, label, amount, reservationId, quantity) => {
    const entry =
      pie.get(key) || { key, label, amount: 0, quantity: 0, reservationIds: new Set() };
    entry.amount += amount;
    entry.quantity += Number(quantity) || 0;
    entry.reservationIds.add(reservationId);
    pie.set(key, entry);
  };

  for (const transaction of breakdownTransactions ?? transactions ?? []) {
    const amount = Number(transaction.payment?.amountPaid ?? 0);
    if (!amount) continue;

    total += amount;

    const reservation = transaction.payment?.booking?.reservation;
    if (!reservation) continue;

    const prepared = prepareReservation(reservation, facilitiesById);
    const allocations = reservationAllocations(prepared, group);
    const allocationTotal = allocations.reduce(
      (sum, item) => sum + (Number(item.amount) || 0),
      0,
    );
    if (allocationTotal <= 0) continue;

    for (const item of allocations) {
      const share = (Number(item.amount) || 0) / allocationTotal;
      add(
        item.key,
        item.label,
        amount * share,
        reservation.reservationId,
        item.quantity,
      );
    }
  }

  const totalRounded = round2(total);
  const pieRows = [...pie.values()]
    .map((entry) => ({
      key: entry.key,
      label: entry.label,
      amount: round2(entry.amount),
      quantity: entry.quantity,
      reservations: entry.reservationIds.size,
      percent: total > 0 ? round2((entry.amount / total) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount || a.label.localeCompare(b.label));

  return {
    total: totalRounded,
    graph: graph.map((bucket) => ({ ...bucket, amount: round2(bucket.amount) })),
    pie: pieRows,
  };
}
