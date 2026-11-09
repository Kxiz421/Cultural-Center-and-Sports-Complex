import {
  DAY_STATUS_STYLES,
  RESERVATION_DAY_LEGEND,
} from "@/lib/calendar-day-status";

export function CalendarDayLegend({
  statuses = RESERVATION_DAY_LEGEND,
  className = "",
}) {
  return (
    <div
      className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground ${className}`}
    >
      {statuses.map((status) => {
        const info = DAY_STATUS_STYLES[status];
        if (!info) return null;
        return (
          <span key={status} className="flex items-center gap-1">
            <span className={`inline-block size-3 rounded-sm ${info.dot}`} />
            {info.label}
          </span>
        );
      })}
    </div>
  );
}
