/**
 * Cancellation policy, shared by `app/api/cancellations` and the client /
 * provincial agency Rescheduling screens so the rule can never drift apart.
 *
 * Cancellations must be made at least thirty (30) days before the scheduled
 * event. Cancelling later is still allowed up to two days before the event, but
 * inside the 30-day window the 50% down payment, the 10% deposit and any
 * remaining balance are forfeited in favour of the Provincial Government.
 *
 * This module stays free of Prisma so the route and the client screens share
 * one rule.
 */

/** Cancelling inside this many days of the event forfeits the payments. */
export const CANCELLATION_NOTICE_DAYS = 30;

/** The last day a cancellation is still accepted is this many days out. */
export const CANCELLATION_LATE_CUTOFF_DAYS = 2;

/** Printed and shown wherever the forfeiture applies. */
export const FORFEITURE_NOTICE =
  "Cancellations made less than 30 days before the event will result in the forfeiture of the 50% down payment, 10% deposit and remaining balance in favor of the Provincial Government.";

/** Whole days from today to a DATE value; null when the value is unusable. */
export function daysUntilEvent(dateValue) {
  if (!dateValue) return null;
  const event = new Date(dateValue);
  if (Number.isNaN(event.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  event.setHours(0, 0, 0, 0);
  return Math.ceil((event - today) / (1000 * 60 * 60 * 24));
}

/**
 * The cancellation rule for one event date.
 *
 * @param {string|Date|null} dateValue
 * @returns {{ daysUntil: number|null, canCancel: boolean, isForfeiture: boolean }}
 */
export function getCancellationEligibility(dateValue) {
  const daysUntil = daysUntilEvent(dateValue);
  return {
    daysUntil,
    canCancel:
      daysUntil !== null && daysUntil > CANCELLATION_LATE_CUTOFF_DAYS,
    isForfeiture:
      daysUntil !== null && daysUntil < CANCELLATION_NOTICE_DAYS,
  };
}
