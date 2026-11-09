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
    cell: "border-border bg-background text-foreground",
    message: "Available",
  },
  "fully-booked": {
    label: "Fully booked",
    dot: "bg-red-600",
    cell: "border-red-400 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
    message: "Fully booked — no facilities are available on this date.",
  },
  maintenance: {
    label: "Maintenance",
    dot: "bg-orange-500",
    cell: "border-orange-400 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-300",
    message: "Unavailable — maintenance is scheduled.",
  },
  holiday: {
    label: "Holiday",
    dot: "bg-rose-600",
    cell: "border-rose-400 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300",
    message: "Unavailable — holiday.",
  },
  blocked: {
    label: "Unavailable",
    dot: "bg-red-500",
    cell: "border-red-400 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
    message: "This date is unavailable.",
  },
  "too-soon": {
    label: "Too soon",
    dot: "bg-slate-400",
    cell: "border-border bg-muted text-muted-foreground",
    message: `Must be at least ${MIN_ADVANCE_BOOKING_DAYS} days in advance.`,
  },
  past: {
    label: "Past",
    dot: "bg-slate-300",
    cell: "border-border bg-muted/50 text-muted-foreground/60",
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
