import { monthBand } from "@/lib/report-activities";
import { monthName, resolvePeriodRange } from "@/lib/report-period";

/**
 * Shared "Particulars Stock Report" builders.
 *
 * The report records the stock movements an admin performed on a particular —
 * the `ParticularTransaction` rows of type RESTOCK / DAMAGE written by
 * `app/api/particulars/route.js` — for a Monthly, Weekly, Yearly or single-day
 * period:
 *
 *   PARTICULARS STOCK REPORT
 *   FOR THE <PERIOD>
 *   SUMMARY :  PARTICULAR | STOCK ON HAND | RESTOCKED | DAMAGED | NET | RECORDS
 *   LOG     :  DATE & TIME | PARTICULAR | TYPE | QTY | RESTOCKED BY / REPORTED BY
 *
 * Two deliberate rules:
 *
 *  - The summary lists **every particular in scope**, including the ones with
 *    no movement in the period (printed as zeros), so "All Particulars" doubles
 *    as a stock statement rather than hiding the quiet items.
 *  - `stockOnHand` is the particular's quantity *at generation time*
 *    (`Inventory.quantityAvailable`). No historical balance is stored, so the
 *    report never pretends to know what the balance was mid-period.
 *
 * Period maths are shared with the other report screens (`resolvePeriodRange`);
 * only the single-day ("Specific Date") range is added here, so the Monthly /
 * Weekly / Yearly dropdowns of the existing reports stay untouched.
 */

/** Period options offered by the particulars report screen. */
export const PARTICULARS_REPORT_PERIODS = [
  { value: "m", label: "Monthly" },
  { value: "w", label: "Weekly" },
  { value: "y", label: "Yearly" },
  { value: "d", label: "Specific Date" },
];

/** Human label of a movement type stored in ParticularTransaction. */
export const MOVEMENT_LABELS = {
  RESTOCK: "Restocked",
  DAMAGE: "Damaged",
};

export function movementTypeLabel(transactionType) {
  return MOVEMENT_LABELS[transactionType] || String(transactionType || "");
}

/**
 * Movement-type filter of the report screen.
 *
 * `noun` is the same filter written for prose ("damage" -> "No damage was
 * recorded for this period"), because the dropdown's own labels ("Damaged
 * Only") do not read well inside a sentence.
 */
export const MOVEMENT_FILTERS = [
  { value: "all", label: "Restocked & Damaged", noun: "restocking and damage" },
  { value: "RESTOCK", label: "Restocked Only", noun: "restocking" },
  { value: "DAMAGE", label: "Damaged Only", noun: "damage" },
];

/** True when `value` is one of the movement-type filters. */
export function isMovementFilter(value) {
  return MOVEMENT_FILTERS.some((filter) => filter.value === value);
}

function movementFilter(value) {
  return (
    MOVEMENT_FILTERS.find((filter) => filter.value === value) || MOVEMENT_FILTERS[0]
  );
}

export function movementFilterLabel(value) {
  return movementFilter(value).label;
}

export function movementFilterNoun(value) {
  return movementFilter(value).noun;
}

export function particularReportPeriodLabel(period) {
  return (
    PARTICULARS_REPORT_PERIODS.find((p) => p.value === period)?.label || "Monthly"
  );
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

/** "2026-09-14" (an <input type="date"> value) -> local Date, or null. */
function parseDateInput(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || "").trim());
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Today as "YYYY-MM-DD", the default value of the Specific Date input. */
export function todayDateInput(now = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** "Sep 14, 2026" — the DATE half of the log's timestamp column. */
export function movementDateLabel(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** "10:55 PM" — the TIME half of the log's timestamp column. */
export function movementTimeLabel(value) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Resolves the inclusive range behind a particulars report selection.
 *
 * `m` / `w` / `y` delegate to the shared `resolvePeriodRange`; `d` is the
 * single-day ("Specific Date") range, and falls back to today when the date
 * input is empty or malformed so the report is never blank by accident.
 *
 * @returns {{
 *   startDate: Date,
 *   endDate: Date,
 *   heading: string,      // printed under the document title
 *   rangeLabel: string,   // shown in the configuration card
 *   groupByMonth: boolean // yearly reports band the log per month
 * }}
 */
export function resolveParticularsReportRange({
  period = "m",
  year,
  month,
  week,
  date,
} = {}) {
  if (period === "d") {
    const day = parseDateInput(date) || new Date();
    const name = monthName(day.getMonth());
    return {
      startDate: startOfDay(day),
      endDate: endOfDay(day),
      heading: `FOR ${name.toUpperCase()} ${day.getDate()}, ${day.getFullYear()}`,
      rangeLabel: `${name} ${day.getDate()}, ${day.getFullYear()}`,
      groupByMonth: false,
    };
  }

  return resolvePeriodRange({ period, year, month, week });
}

/** Flattens ParticularTransaction rows into the printed log lines. */
export function buildMovementRows(transactions = []) {
  return transactions.map((transaction) => {
    const performedByName = String(transaction.performedByName || "").trim();
    return {
      transactionId: transaction.transactionId,
      particularId: transaction.particularId,
      particularName:
        transaction.particular?.particularName ||
        transaction.particularName ||
        `Particular ${transaction.particularId}`,
      transactionType: transaction.transactionType,
      typeLabel: movementTypeLabel(transaction.transactionType),
      quantity: Number(transaction.quantity) || 0,
      performedById: transaction.performedById || "",
      // Falls back to the staff id so a movement is never shown unattributed.
      performedByName: performedByName || transaction.performedById || "—",
      createdAt: transaction.createdAt,
      dateLabel: movementDateLabel(transaction.createdAt),
      timeLabel: movementTimeLabel(transaction.createdAt),
    };
  });
}

/**
 * One summary line per particular in scope.
 *
 * Particulars with no movement keep zeroed counters (they are still part of
 * "all the particulars"); a movement whose particular is missing from
 * `particulars` is added on the fly so nothing is dropped from the totals.
 */
export function buildParticularGroups({ rows = [], particulars = [] } = {}) {
  const groups = new Map();

  const ensure = (particularId, particularName, stockOnHand = null) => {
    const key = String(particularId);
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        particularId,
        particularName: particularName || `Particular ${particularId}`,
        stockOnHand,
        restocked: 0,
        damaged: 0,
        netChange: 0,
        records: 0,
        restockRecords: 0,
        damageRecords: 0,
        lastMovementAt: null,
      });
    }
    const group = groups.get(key);
    if (group.stockOnHand === null && stockOnHand !== null) {
      group.stockOnHand = stockOnHand;
    }
    return group;
  };

  for (const particular of particulars) {
    ensure(
      particular.particularId,
      particular.particularName,
      particular.stockOnHand ?? null
    );
  }

  for (const row of rows) {
    const group = ensure(row.particularId, row.particularName);
    group.records += 1;
    if (row.transactionType === "RESTOCK") {
      group.restocked += row.quantity;
      group.restockRecords += 1;
    } else if (row.transactionType === "DAMAGE") {
      group.damaged += row.quantity;
      group.damageRecords += 1;
    }
    group.netChange = group.restocked - group.damaged;
    if (
      !group.lastMovementAt ||
      new Date(row.createdAt) > new Date(group.lastMovementAt)
    ) {
      group.lastMovementAt = row.createdAt;
    }
  }

  return [...groups.values()].sort((a, b) =>
    a.particularName.localeCompare(b.particularName)
  );
}

/** "SEPTEMBER 2026" — the band printed above a month of movements. */
export function movementBand(date) {
  const value = new Date(date);
  return `${monthBand(value)} ${value.getFullYear()}`;
}

/**
 * Groups the log chronologically: a single section, or one section per month
 * when the report covers a whole year (the same banding the activity report
 * uses for its yearly output).
 */
export function buildMovementSections(rows, { groupByMonth = false } = {}) {
  const sorted = [...rows].sort(
    (a, b) =>
      new Date(a.createdAt) - new Date(b.createdAt) ||
      a.particularName.localeCompare(b.particularName)
  );

  if (!groupByMonth) {
    return [{ band: null, rows: sorted }];
  }

  const sections = [];
  for (const row of sorted) {
    const band = movementBand(row.createdAt);
    const last = sections[sections.length - 1];
    if (last && last.band === band) {
      last.rows.push(row);
    } else {
      sections.push({ band, rows: [row] });
    }
  }
  return sections;
}

/** Summary block printed under the log. */
export function buildParticularsTotals({ rows = [], groups = [] } = {}) {
  let restocked = 0;
  let damaged = 0;
  let restockRecords = 0;
  let damageRecords = 0;

  for (const row of rows) {
    if (row.transactionType === "RESTOCK") {
      restocked += row.quantity;
      restockRecords += 1;
    } else if (row.transactionType === "DAMAGE") {
      damaged += row.quantity;
      damageRecords += 1;
    }
  }

  let stockOnHand = 0;
  let stockTracked = 0;
  for (const group of groups) {
    if (group.stockOnHand !== null && group.stockOnHand !== undefined) {
      stockOnHand += Number(group.stockOnHand) || 0;
      stockTracked += 1;
    }
  }

  return {
    restocked,
    damaged,
    netChange: restocked - damaged,
    records: rows.length,
    restockRecords,
    damageRecords,
    particulars: groups.length,
    particularsWithMovement: groups.filter((group) => group.records > 0).length,
    stockOnHand,
    stockTracked,
  };
}

/**
 * Assembles the payload consumed by the document and the CSV export.
 *
 * @param {{ transactions?: object[], particulars?: object[], meta?: object }} input
 *   `particulars` carries `{ particularId, particularName, stockOnHand }` for
 *   every particular the report covers — including the quiet ones.
 */
export function buildParticularsReport({
  transactions = [],
  particulars = [],
  meta = {},
}) {
  const rows = buildMovementRows(transactions);
  const groups = buildParticularGroups({ rows, particulars });
  const sections = buildMovementSections(rows, {
    groupByMonth: !!meta.groupByMonth,
  });

  return {
    ...meta,
    rows,
    groups,
    sections,
    totals: buildParticularsTotals({ rows, groups }),
    rowCount: rows.length,
  };
}
