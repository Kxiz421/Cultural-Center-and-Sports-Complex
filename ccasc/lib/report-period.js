/**
 * Shared report period helpers.
 *
 * The Admin, Accounting Clerk, Local Treasury Officer and Program Coordinator
 * modules all generate reports through the same Monthly / Weekly / Yearly
 * selector, so the period maths lives here instead of being duplicated inside
 * each panel page (which is how the four report screens drifted apart).
 */

export const REPORT_PERIODS = [
  { value: "m", label: "Monthly" },
  { value: "w", label: "Weekly" },
  { value: "y", label: "Yearly" },
];

export const REPORT_MONTHS = [
  { value: "0", label: "January" },
  { value: "1", label: "February" },
  { value: "2", label: "March" },
  { value: "3", label: "April" },
  { value: "4", label: "May" },
  { value: "5", label: "June" },
  { value: "6", label: "July" },
  { value: "7", label: "August" },
  { value: "8", label: "September" },
  { value: "9", label: "October" },
  { value: "10", label: "November" },
  { value: "11", label: "December" },
];

/**
 * Weeks are day ranges inside the selected month (1-7, 8-14, 15-21, 22-28,
 * 29-end). This matches the `Math.ceil(dayOfMonth / 7)` grouping the admin
 * reports API already used, so historical weekly figures stay consistent.
 */
export const REPORT_WEEKS = [
  { value: "1", label: "Week 1 (1–7)" },
  { value: "2", label: "Week 2 (8–14)" },
  { value: "3", label: "Week 3 (15–21)" },
  { value: "4", label: "Week 4 (22–28)" },
  { value: "5", label: "Week 5 (29–end)" },
];

/** Venue scopes shared by the report generators. */
export const REPORT_VENUES = [
  { value: "all", label: "All Venues" },
  { value: "sports", label: "Sports Complex" },
  { value: "cultural", label: "Cultural Center" },
];

/** Years offered in the Year dropdown — current year first. */
export function reportYears(count = 5) {
  const current = new Date().getFullYear();
  return Array.from({ length: count }, (_, i) => String(current - i));
}

export function monthName(value) {
  return REPORT_MONTHS.find((m) => m.value === String(value))?.label || "";
}

export function periodLabel(period) {
  return REPORT_PERIODS.find((p) => p.value === period)?.label || "Monthly";
}

export function venueLabel(venue) {
  return REPORT_VENUES.find((v) => v.value === venue)?.label || "All Venues";
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Resolves the inclusive date range for a period selection.
 *
 * @param {{ period?: string, year?: string|number, month?: string|number, week?: string|number }} input
 * @returns {{
 *   startDate: Date,
 *   endDate: Date,
 *   heading: string,      // "FOR THE YEAR 2026" — printed under the document title
 *   rangeLabel: string,   // "2026" / "December 2026" / "December 2026 · Week 2"
 *   groupByMonth: boolean // yearly reports print a band per month, like the paper form
 * }}
 */
export function resolvePeriodRange({ period = "m", year, month, week } = {}) {
  const now = new Date();
  const y = parseInt(year ?? now.getFullYear(), 10);
  const m = parseInt(month ?? now.getMonth(), 10);
  const name = monthName(m);
  const upper = name.toUpperCase();

  if (period === "y") {
    return {
      startDate: startOfDay(new Date(y, 0, 1)),
      endDate: endOfDay(new Date(y, 11, 31)),
      heading: `FOR THE YEAR ${y}`,
      rangeLabel: String(y),
      groupByMonth: true,
    };
  }

  if (period === "w") {
    const w = Math.min(Math.max(parseInt(week ?? 1, 10) || 1, 1), 5);
    const lastDay = new Date(y, m + 1, 0).getDate();
    const rawFrom = (w - 1) * 7 + 1;

    // A 5th week does not exist in a 28-day month. Returning an empty range
    // (start after end) keeps the report blank instead of leaking the first
    // days of the following month into the results.
    if (rawFrom > lastDay) {
      return {
        startDate: startOfDay(new Date(y, m + 1, 1)),
        endDate: endOfDay(new Date(y, m, lastDay)),
        heading: `FOR THE WEEK ${w} OF ${upper} ${y}`,
        rangeLabel: `${name} ${y} · Week ${w} (no days in this month)`,
        groupByMonth: false,
      };
    }

    const to = Math.min(w * 7, lastDay);
    return {
      startDate: startOfDay(new Date(y, m, rawFrom)),
      endDate: endOfDay(new Date(y, m, to)),
      heading: `FOR THE WEEK ${w} OF ${upper} ${y}`,
      rangeLabel: `${name} ${y} · Week ${w} (${rawFrom}–${to})`,
      groupByMonth: false,
    };
  }

  return {
    startDate: startOfDay(new Date(y, m, 1)),
    endDate: endOfDay(new Date(y, m + 1, 0)),
    heading: `FOR THE MONTH OF ${upper} ${y}`,
    rangeLabel: `${name} ${y}`,
    groupByMonth: false,
  };
}
