/**
 * Revenue windows for the staff dashboards.
 *
 * A receipt is stored as a `Transaction` row whose `paymentDate` is the day the
 * money was taken and whose `payment` relation holds the amount collected. Every
 * dashboard therefore derives revenue the same way and only the scoping
 * `where` clause differs (all venues, one venue, ...).
 *
 * Deposit-release rows carry no `payment` (they are refunds of a pulled-out
 * 10% deposit), so the optional chaining below keeps them out of revenue and
 * stops a release from crashing a route that forgot the null check.
 */

/** Start of the day / week / month / year that `now` falls in (local time). */
export function revenueWindowStart(period, now = new Date()) {
  switch (period) {
    case "week": {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      // Week starts on Sunday, matching the week anchor the dashboards used.
      start.setDate(start.getDate() - start.getDay());
      return start;
    }
    case "month":
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case "year":
      return new Date(now.getFullYear(), 0, 1);
    case "day":
    default:
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
}

/**
 * Earliest `paymentDate` any window needs. Bounds the query so the yearly card
 * is correct without loading the entire receipt history.
 */
export function revenueQueryStart(now = new Date()) {
  return revenueWindowStart("year", now);
}

/** What a transaction contributes to revenue — 0 for non-payment entries. */
export function transactionAmount(transaction) {
  return Number(transaction?.payment?.amountPaid ?? 0);
}

/**
 * Daily / weekly / monthly / yearly revenue for the given transaction rows.
 *
 * @param {Array<{ paymentDate: Date|string, entryType?: string, payment?: { amountPaid: number|string }|null }>} transactions
 * @param {Date} [now] Reference instant (defaults to `new Date()`).
 * @returns {{ daily: number, weekly: number, monthly: number, yearly: number }}
 */
export function summarizeRevenue(transactions, now = new Date()) {
  const startOfDay = revenueWindowStart("day", now);
  const startOfWeek = revenueWindowStart("week", now);
  const startOfMonth = revenueWindowStart("month", now);
  const startOfYear = revenueWindowStart("year", now);

  const summary = { daily: 0, weekly: 0, monthly: 0, yearly: 0 };

  for (const transaction of transactions || []) {
    const amount = transactionAmount(transaction);
    if (amount === 0) continue;

    const when = new Date(transaction.paymentDate);
    if (Number.isNaN(when.getTime())) continue;

    if (when >= startOfDay) summary.daily += amount;
    if (when >= startOfWeek) summary.weekly += amount;
    if (when >= startOfMonth) summary.monthly += amount;
    if (when >= startOfYear) summary.yearly += amount;
  }

  return summary;
}
