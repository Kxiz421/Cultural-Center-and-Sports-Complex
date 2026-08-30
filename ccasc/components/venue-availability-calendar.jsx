"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  getMinEventDate,
  MIN_ADVANCE_BOOKING_DAYS,
  getMinEventDateKey,
  isEventDateTooSoon,
} from "@/lib/reservation-advance-booking";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * Single-date venue calendar (availability + 7-day rule), matching reservation UX.
 */
export function VenueAvailabilityCalendar({
  venueId,
  excludeReservationId = null,
  value,
  onChange,
  disabled = false,
}) {
  const [currentMonth, setCurrentMonth] = React.useState(() => {
    if (value) {
      const d = new Date(`${value}T12:00:00`);
      if (!Number.isNaN(d.getTime())) return new Date(d.getFullYear(), d.getMonth(), 1);
    }
    const min = getMinEventDate();
    return new Date(min.getFullYear(), min.getMonth(), 1);
  });
  const [availability, setAvailability] = React.useState({});
  const [availLoading, setAvailLoading] = React.useState(false);

  React.useEffect(() => {
    if (!venueId) {
      setAvailability({});
      return;
    }
    const monthStr = `${currentMonth.getFullYear()}-${String(
      currentMonth.getMonth() + 1
    ).padStart(2, "0")}`;
    const params = new URLSearchParams({
      venueId: String(venueId),
      month: monthStr,
    });
    if (excludeReservationId) {
      params.set("excludeReservationId", String(excludeReservationId));
    }

    let cancelled = false;
    setAvailLoading(true);
    fetch(`/api/availability?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.dates) {
          const map = {};
          for (const d of data.dates) map[d.date] = d;
          setAvailability(map);
        }
      })
      .catch((err) => console.error("Failed to load availability:", err))
      .finally(() => {
        if (!cancelled) setAvailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [venueId, currentMonth, excludeReservationId]);

  const prevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  };

  const nextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  };

  const pickDate = (dateStr) => {
    if (disabled || !availability[dateStr]?.available) return;
    if (isEventDateTooSoon(dateStr)) return;
    onChange?.(dateStr);
  };

  if (!venueId) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        Venue information is missing for this reservation.
      </p>
    );
  }

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minEventDate = getMinEventDate();

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, month, d);
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({ date: d, key, dt });
  }

  const monthLabel = `${MONTHS[month]} ${year}`;

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Earliest selectable date: <span className="font-medium">{getMinEventDateKey()}</span>
        ({MIN_ADVANCE_BOOKING_DAYS}+ days from today). Blocked dates are unavailable.
      </p>
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={prevMonth}
          disabled={disabled}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="font-medium text-sm">{monthLabel}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={nextMonth}
          disabled={disabled}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="text-muted-foreground py-1">{d}</div>
        ))}
        {days.map((day, i) => {
          if (!day) return <div key={`e${i}`} />;
          const isSelected = value === day.key;
          const avail = availability[day.key];
          const isTooSoon = day.dt < minEventDate || avail?.isTooSoon;
          const isPast = avail?.isPast || day.dt < today;
          const isAvailable = avail?.available && !isPast && !isTooSoon;
          const isBlocked = avail?.blocked || isPast || isTooSoon;

          return (
            <button
              key={day.key}
              type="button"
              disabled={disabled || !isAvailable}
              onClick={() => pickDate(day.key)}
              className={`
                py-2 rounded-md text-sm transition-colors
                ${isSelected ? "bg-primary text-white font-semibold" : ""}
                ${isAvailable && !isSelected && !disabled ? "hover:bg-primary/10 cursor-pointer" : ""}
                ${isBlocked || disabled ? "text-muted-foreground/30 line-through cursor-not-allowed" : ""}
                ${!isBlocked && !isSelected && !disabled ? "text-foreground" : ""}
              `}
              title={
                isTooSoon
                  ? `Must be at least ${MIN_ADVANCE_BOOKING_DAYS} days in advance`
                  : isBlocked
                    ? avail?.reason || "Unavailable"
                    : day.key
              }
            >
              {day.date}
            </button>
          );
        })}
      </div>
      {value && (
        <Badge variant="secondary" className="text-xs">
          Selected: {value}
        </Badge>
      )}
      {availLoading && (
        <p className="text-xs text-muted-foreground text-center">Loading availability...</p>
      )}
    </div>
  );
}
