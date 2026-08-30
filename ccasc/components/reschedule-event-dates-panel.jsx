"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { CalendarDays, Building2, Clock } from "lucide-react";
import { VenueAvailabilityCalendar } from "@/components/venue-availability-calendar";

function formatDisplayDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-PH", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function RescheduleEventDatesPanel({
  reservation,
  eventEntries,
  dateDrafts,
  onDateDraftChange,
  entryKey,
}) {
  if (!reservation || eventEntries.length === 0) return null;

  const reservationId = parseInt(String(reservation.id).replace(/^RES-/, ""), 10);
  const venueId = reservation.venueId;

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="space-y-1">
        <p className="text-sm font-semibold">{reservation.eventType || "Scheduled event"}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {reservation.venue && (
            <span className="inline-flex items-center gap-1">
              <Building2 className="size-3" />
              {reservation.venue}
            </span>
          )}
          {reservation.timeSlot && (
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" />
              {reservation.timeSlot}
            </span>
          )}
        </div>
      </div>

      <Label>Reschedule event days</Label>
      <p className="text-xs text-muted-foreground">
        Each row is a scheduled day for this event. Pick a new date on the calendar only for
        days you want to move. Unchanged days stay as scheduled.
      </p>

      <div className="space-y-6">
        {eventEntries.map((entry, idx) => {
          const key = entryKey(entry);
          const draft = dateDrafts[key] || entry.date;
          const changed = draft !== entry.date;

          return (
            <div
              key={key}
              className="rounded-lg border bg-muted/20 p-4 space-y-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <CalendarDays className="size-4 text-muted-foreground shrink-0" />
                    {reservation.eventType || "Event"}
                    {entry.isPrimary ? (
                      <Badge variant="outline" className="text-[10px]">Primary day</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">
                        Day {idx + 1}
                      </Badge>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Currently scheduled:{" "}
                    <span className="font-medium text-foreground">
                      {formatDisplayDate(entry.date)}
                    </span>
                  </p>
                  {changed && (
                    <p className="text-xs text-primary">
                      New date: <span className="font-medium">{formatDisplayDate(draft)}</span>
                    </p>
                  )}
                </div>
                {changed && (
                  <Badge className="text-[10px] shrink-0">Date changed</Badge>
                )}
              </div>

              <VenueAvailabilityCalendar
                venueId={venueId}
                excludeReservationId={reservationId}
                value={draft}
                onChange={(dateStr) => onDateDraftChange(key, dateStr)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
