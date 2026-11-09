"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  selectedDates,
  onToggleDate,
  onClearDates,
}) {
  if (!reservation || eventEntries.length === 0) return null;

  const reservationId = parseInt(String(reservation.id).replace(/^RES-/, ""), 10);
  const venueId = reservation.venueId;
  const sortedSelected = [...(selectedDates || [])].sort();
  const pairs = eventEntries.map((entry, idx) => ({
    entry,
    requestedDate: sortedSelected[idx] || null,
  }));

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

      <div className="space-y-1">
        <Label>Scheduled event days</Label>
        <div className="flex flex-wrap gap-2">
          {eventEntries.map((entry, idx) => (
            <Badge key={`${entry.date}-${idx}`} variant="outline" className="text-xs">
              <CalendarDays className="mr-1 size-3" />
              {entry.isPrimary ? "Primary" : `Day ${idx + 1}`}: {formatDisplayDate(entry.date)}
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <Label>Pick the new dates</Label>
        <p className="text-xs text-muted-foreground">
          Click a date on the calendar to select it. Select up to {eventEntries.length} date
          {eventEntries.length !== 1 ? "s" : ""}; they replace the scheduled days in order.
          Leave a date unselected to keep that day as scheduled.
        </p>
      </div>

      <VenueAvailabilityCalendar
        venueId={venueId}
        excludeReservationId={reservationId}
        values={selectedDates || []}
        onToggle={onToggleDate}
      />

      {sortedSelected.length > 0 && (
        <div className="space-y-1 rounded-md border bg-muted/20 p-3 text-xs">
          {pairs.map(({ entry, requestedDate }, idx) => (
            <div
              key={`${entry.date}-${idx}`}
              className="flex flex-wrap items-center justify-between gap-2"
            >
              <span className="text-muted-foreground">
                {entry.isPrimary ? "Primary day" : `Day ${idx + 1}`} ·{" "}
                {formatDisplayDate(entry.date)}
              </span>
              <span
                className={
                  requestedDate ? "font-medium text-primary" : "text-muted-foreground"
                }
              >
                {requestedDate
                  ? `→ ${formatDisplayDate(requestedDate)}`
                  : "unchanged"}
              </span>
            </div>
          ))}
          <div className="pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClearDates}>
              Clear selected dates
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
