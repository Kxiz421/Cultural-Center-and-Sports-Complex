import { MIN_ADVANCE_BOOKING_DAYS } from "@/lib/reservation-advance-booking";

export const DAY_STATUS = {
  AVAILABLE: "available",
  FULLY_BOOKED: "fully-booked",
  MAINTENANCE: "maintenance",
  HOLIDAY: "holiday",
  BLOCKED: "blocked",
  TOO_SOON: "too-soon",
  PAST: "past",
};

export const DAY_STATUS_STYLES = {
  available: {
    label: "Available",
    dot: "bg-emerald-500",
    cell: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
    message: "Available",
  },
  "fully-booked": {
    label: "Fully booked",
    dot: "bg-red-600",
    cell: "border-red-500 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
    message: "Fully booked — no facilities are available on this date.",
  },
  maintenance: {
    label: "Maintenance",
    dot: "bg-amber-500",
    cell: "border-amber-500 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
    message: "Unavailable — maintenance is scheduled.",
  },
  holiday: {
    label: "Holiday",
    dot: "bg-violet-600",
    cell: "border-violet-500 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300",
    message: "Unavailable — holiday.",
  },
  blocked: {
    label: "Unavailable",
    dot: "bg-fuchsia-500",
    cell: "border-fuchsia-400 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-900 dark:bg-fuchsia-950/40 dark:text-fuchsia-300",
    message: "This date is unavailable.",
  },
  "too-soon": {
    label: "Too soon",
    dot: "bg-sky-500",
    cell: "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300",
    message: `Must be at least ${MIN_ADVANCE_BOOKING_DAYS} days in advance.`,
  },
  past: {
    label: "Past",
    dot: "bg-gray-400",
    cell: "border-gray-200 bg-gray-100 text-gray-400 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-500",
    message: "This date has already passed.",
  },
};

export const RESERVATION_DAY_LEGEND = [
  DAY_STATUS.AVAILABLE,
  DAY_STATUS.FULLY_BOOKED,
  DAY_STATUS.MAINTENANCE,
  DAY_STATUS.HOLIDAY,
  DAY_STATUS.TOO_SOON,
  DAY_STATUS.PAST,
];

export function resolveDayStatus(avail, { isPast = false, isTooSoon = false } = {}) {
  if (isPast) return DAY_STATUS.PAST;
  if (isTooSoon) return DAY_STATUS.TOO_SOON;
  if (avail?.status) return avail.status;
  if (avail?.blocked) {
    const reason = String(avail.reason || "");
    if (
      reason === "All facilities are already reserved" ||
      reason === "Booked" ||
      reason === "Fully booked"
    ) {
      return DAY_STATUS.FULLY_BOOKED;
    }
    return DAY_STATUS.BLOCKED;
  }
  return DAY_STATUS.AVAILABLE;
}

export function dayStatusMessage(avail, status) {
  if (avail?.message) return avail.message;
  return DAY_STATUS_STYLES[status]?.message || "Unavailable";
}

export function dayStatusCellClass(status) {
  return DAY_STATUS_STYLES[status]?.cell || DAY_STATUS_STYLES.blocked.cell;
}
