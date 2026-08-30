import { formatLocalDateKey } from "@/lib/utils";

export const MIN_ADVANCE_BOOKING_DAYS = 7;

export function startOfLocalDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Earliest selectable event date (today + 7 days, local calendar). */
export function getMinEventDate(fromDate = new Date()) {
  const min = startOfLocalDay(fromDate);
  min.setDate(min.getDate() + MIN_ADVANCE_BOOKING_DAYS);
  return min;
}

export function getMinEventDateKey(fromDate = new Date()) {
  return formatLocalDateKey(getMinEventDate(fromDate));
}

export function parseLocalDateKey(key) {
  const [y, m, d] = String(key).split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function isEventDateTooSoon(dateInput, fromDate = new Date()) {
  if (!dateInput) return false;
  const key =
    typeof dateInput === "string"
      ? dateInput.slice(0, 10)
      : formatLocalDateKey(dateInput);
  const event = parseLocalDateKey(key);
  return event < getMinEventDate(fromDate);
}

export function validateAdvanceBooking(eventDateInput, fromDate = new Date()) {
  if (isEventDateTooSoon(eventDateInput, fromDate)) {
    const minDateStr = getMinEventDateKey(fromDate);
    return {
      valid: false,
      error: `Reservations must be filed at least ${MIN_ADVANCE_BOOKING_DAYS} days before the event. The earliest available date is ${minDateStr}.`,
      minDate: minDateStr,
    };
  }
  return { valid: true, minDate: getMinEventDateKey(fromDate) };
}

export function validateAdvanceBookingDates(dateKeys, fromDate = new Date()) {
  for (const key of dateKeys) {
    const check = validateAdvanceBooking(key, fromDate);
    if (!check.valid) return check;
  }
  return { valid: true, minDate: getMinEventDateKey(fromDate) };
}

export const ADVANCE_BOOKING_REASON =
  `Must be at least ${MIN_ADVANCE_BOOKING_DAYS} days in advance`;
