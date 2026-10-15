"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CalendarOff, Loader2, Trophy, Wrench } from "lucide-react";

const SPORTS_COMPLEX_VENUE_ID = 2;

const STATUS_STYLES = {
  Reserved: "border-emerald-300 text-emerald-700 dark:text-emerald-300",
  "On maintenance": "border-orange-300 text-orange-700 dark:text-orange-300",
  Holiday: "border-red-300 text-red-700 dark:text-red-300",
  Available: "text-muted-foreground",
};

function formatLongDate(dateKey) {
  if (!dateKey) return "";
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Everything happening on one Sports Complex day: every active reservation,
 * any Holiday/Maintenance block, and each facility's resulting status.
 *
 * The Sports Complex is booked per facility, so a single reservation never
 * fills the whole day. Data comes from the same endpoints the booking flow
 * uses:
 *   - `/api/calendar`                the venue's reservations and blocks
 *   - `/api/facilities`              the facility list
 *   - `/api/facilities/availability` which facilities are reserved that day
 *
 * Mounted with a `key` of the day so switching days remounts it and resets the
 * loading state without calling setState from the effect body.
 */
function SportsComplexDayContent({ date }) {
  const [state, setState] = React.useState({
    loading: true,
    error: "",
    reservations: [],
    facilities: [],
    reserved: [],
    block: null,
  });

  React.useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetch("/api/facilities", { cache: "no-store" }),
      fetch(
        `/api/facilities/availability?venueId=${SPORTS_COMPLEX_VENUE_ID}&dates=${date}`,
        { cache: "no-store" },
      ),
      fetch(`/api/calendar?venueId=${SPORTS_COMPLEX_VENUE_ID}`, {
        cache: "no-store",
      }),
    ])
      .then(async ([facilitiesRes, availabilityRes, calendarRes]) => {
        if (!facilitiesRes.ok || !availabilityRes.ok || !calendarRes.ok) {
          throw new Error("Failed to load facility status");
        }
        return [
          await facilitiesRes.json(),
          await availabilityRes.json(),
          await calendarRes.json(),
        ];
      })
      .then(([facilitiesData, availabilityData, calendarData]) => {
        if (cancelled) return;

        const dayEvents = (calendarData?.sports || []).filter(
          (event) => String(event.date).split("T")[0] === date,
        );
        const reservations = dayEvents.filter((event) => event.type === "event");
        const block = dayEvents.find((event) => event.type === "block") || null;

        const facilities = (Array.isArray(facilitiesData) ? facilitiesData : [])
          .filter((facility) => Number(facility.venueId) === SPORTS_COMPLEX_VENUE_ID)
          .filter((facility) => facility.availability !== "Archived")
          .map((facility) => ({
            facilityId: String(facility.facilityId),
            name: facility.name,
            availability: facility.availability,
          }));

        const reserved = (availabilityData?.reservedByDate?.[date] || []).map(String);

        setState({
          loading: false,
          error: "",
          reservations,
          facilities,
          reserved,
          block,
        });
      })
      .catch((error) => {
        console.error("Failed to load the Sports Complex day view:", error);
        if (cancelled) return;
        setState({
          loading: false,
          error:
            "The facilities for this day could not be loaded. Please try again.",
          reservations: [],
          facilities: [],
          reserved: [],
          block: null,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [date]);

  const { loading, error, reservations, facilities, reserved, block } = state;

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Loading facilities…
      </div>
    );
  }

  if (error) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">{error}</p>
    );
  }

  return (
    <>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Reservations ({reservations.length})
        </p>
        {reservations.length === 0 ? (
          <p className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
            No reservations on this day.
          </p>
        ) : (
          <ul className="space-y-2">
            {reservations.map((event) => (
              <li
                key={event.id}
                className="rounded-lg border px-3 py-2 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate font-medium">
                    {event.title}
                  </span>
                  <Badge variant="outline" className="shrink-0">
                    {event.status}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {event.start} — {event.end}
                  {event.clientName ? ` · ${event.clientName}` : ""}
                </p>
                {event.facilities?.length > 0 && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {event.facilities.join(", ")}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {block && (
        <div className="flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-900 dark:border-orange-900/50 dark:bg-orange-950/40 dark:text-orange-200">
          <CalendarOff className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Whole venue: <span className="font-medium">{block.blockType}</span>
            {" — "}
            {block.title}
          </span>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Facilities ({facilities.length})
        </p>
        {facilities.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            No Sports Complex facilities found.
          </p>
        ) : (
          <ul className="space-y-2">
            {facilities.map((facility) => {
              const isReserved = reserved.includes(facility.facilityId);
              const status = isReserved
                ? "Reserved"
                : block
                  ? block.blockType
                  : facility.availability === "Under Maintenance"
                    ? "On maintenance"
                    : "Available";

              return (
                <li
                  key={facility.facilityId}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Wrench
                      className="size-3.5 shrink-0 text-muted-foreground/60"
                      aria-hidden
                    />
                    <span className="truncate font-medium">{facility.name}</span>
                  </span>
                  <Badge
                    variant="outline"
                    className={`shrink-0 ${STATUS_STYLES[status] || ""}`}
                  >
                    {status}
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}

/**
 * Day view for the Sports Complex calendar, opened by clicking anywhere in a
 * day cell - including on a reservation, so a day full of bookings is still
 * clickable.
 *
 * @param {object} props
 * @param {string|null} props.date the clicked day (YYYY-MM-DD)
 * @param {boolean} props.open
 * @param {(open: boolean) => void} props.onOpenChange
 */
export function SportsComplexDayDialog({ date, open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="size-5 text-orange-500" aria-hidden />
            Sports Complex day
          </DialogTitle>
          <DialogDescription>{formatLongDate(date)}</DialogDescription>
        </DialogHeader>
        {date ? <SportsComplexDayContent key={date} date={date} /> : null}
      </DialogContent>
    </Dialog>
  );
}
