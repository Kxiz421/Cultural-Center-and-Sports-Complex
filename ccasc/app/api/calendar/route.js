import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { formatDbDate } from "@/lib/utils";
import { noCacheJson } from "@/lib/api-cache-control";


import { requireApiAuth, resolveClientScope } from "@/lib/api-auth";
export async function GET(request) {
  const guard = await requireApiAuth();
  if (guard.response) return guard.response;

  try {
    const { searchParams } = new URL(request.url);
    const rawClientId = searchParams.get("clientId");
    const venueId = searchParams.get("venueId");
    // Client-role sessions are pinned to their own events: a crafted
    // ?clientId= can no longer expose another client's calendar.
    const scopedClientId = resolveClientScope(guard.user, rawClientId);
    const ownEventsOnly = scopedClientId !== null;
    const mineClientId = scopedClientId === null ? NaN : scopedClientId;

    // Current time for filtering out ended events (time-specific)
    const now = new Date();

    // Fetch reservations without client include to avoid orphaned FK errors
    const reservations = await prisma.reservation.findMany({
      where: ownEventsOnly
        ? { clientId: Number.isFinite(mineClientId) ? mineClientId : -1, reservationStatus: { not: "Cancelled" } }
        : { ...(venueId ? { venueId: parseInt(venueId) } : undefined), reservationStatus: { not: "Cancelled" } },
      include: {
        venue: true,
        package: {
          select: { packageName: true },
        },
        timeSlot: {
          select: {
            startTime: true,
            endTime: true,
          },
        },
        additionalDates: {
          select: { eventDate: true },
        },
        bookings: {
          select: {
            bookingId: true,
            bookingStatusId: true,
            status: {
              select: { status: true },
            },
          },
        },
      },
      orderBy: { eventDate: "asc" },
    });

    // Fetch valid client info separately
    const distinctClientIds = [...new Set(reservations.map((r) => r.clientId))];
    const clients = await prisma.client.findMany({
      where: { clientId: { in: distinctClientIds } },
      select: { clientId: true, firstName: true, lastName: true },
    });
    const clientMap = Object.fromEntries(clients.map((c) => [c.clientId, c]));

    // Fetch calendar blocks (holidays/maintenance)
    const blocks = await prisma.calendarBlock.findMany({
      include: {
        venue: {
          select: { venue: true },
        },
      },
      orderBy: { blockDate: "asc" },
    });

    // Format DATE columns as YYYY-MM-DD (UTC calendar day)
    const formatLocalDate = formatDbDate;

    // Helper: check if a reservation date+time has already ended
    function isEventEnded(eventDate, endTime) {
      if (!eventDate || !endTime) return false;
      const eventDateStr = formatLocalDate(eventDate);
      if (!eventDateStr) return false;
      // Parse end time as HH:MM (handle both HH:MM:SS and HH:MM formats)
      const endParts = endTime.split(":");
      if (endParts.length < 2) return false;
      const endHour = parseInt(endParts[0], 10);
      const endMin = parseInt(endParts[1], 10);
      if (Number.isNaN(endHour) || Number.isNaN(endMin)) return false;
      // Construct date with +08:00 (PHT) offset since time slots are in Philippine Time.
      // Using explicit offset avoids timezone-dependent parsing (no more "local time" ambiguity).
      const endDateTime = new Date(
        eventDateStr +
        "T" + String(endHour).padStart(2, "0") +
        ":" + String(endMin).padStart(2, "0") +
        ":00+08:00"
      );
      return endDateTime <= now;
    }

    // One calendar event per reserved day (primary + additional dates)
    const events = reservations
      .filter((r) => clientMap[r.clientId] !== undefined)
      .flatMap((r) => {
        const client = clientMap[r.clientId];
        const activeBookings = r.bookings.filter((b) => b.status?.status !== "Cancelled");
        const latestBooking = activeBookings.length > 0 ? activeBookings[activeBookings.length - 1] : null;
        const bookingStatus = latestBooking?.status?.status || "Unbooked";
        const allDates = [
          formatLocalDate(r.eventDate),
          ...r.additionalDates.map((ad) => formatLocalDate(ad.eventDate)),
        ].filter(Boolean);
        const uniqueDates = [...new Set(allDates)];

        // Filter out dates where the event has already ended (time-specific)
        const activeDates = uniqueDates.filter((dateKey) => !isEventEnded(dateKey, r.timeSlot.endTime));

        if (activeDates.length === 0) return [];

        return activeDates.map((dateKey, idx) => ({
          id: `RES-${r.reservationId}-${dateKey}`,
          reservationId: r.reservationId,
          clientId: r.clientId,
          title: r.eventType,
          date: dateKey,
          start: r.timeSlot.startTime,
          end: r.timeSlot.endTime,
          venue: r.venue.venue,
          venueId: r.venue.venueId,
          status: r.reservationStatus,
          type: "event",
          clientName: `${client.firstName} ${client.lastName}`,
          packageName: r.package?.packageName || null,
          bookingStatus,
          isPrimary: idx === 0,
          eventDates: activeDates,
        }));
      });

    // Transform blocks into calendar events
    const blockEvents = blocks.map((b) => ({
      id: `BLK-${b.blockId}`,
      title: b.title,
      date: formatLocalDate(b.blockDate),
      start: null,
      end: null,
      venue: b.venue.venue,
      venueId: b.venueId,
      status: b.blockType === "Holiday" ? "Holiday" : "Maintenance",
      type: "block",
      clientName: null,
      packageName: null,
      bookingStatus: null,
      blockType: b.blockType,
      notes: b.notes,
    }));

    // Group by venue
    const culturalEvents = events.filter((e) => e.venueId === 1);
    const sportsEvents = events.filter((e) => e.venueId === 2);
    const culturalBlocks = blockEvents.filter((e) => e.venueId === 1);
    const sportsBlocks = blockEvents.filter((e) => e.venueId === 2);

    return noCacheJson({
      cultural: [...culturalEvents, ...culturalBlocks],
      sports: [...sportsEvents, ...sportsBlocks],
    });
  } catch (error) {
    console.error("Calendar API error:", error);
    return noCacheJson(
      { error: "Failed to fetch calendar data" },
      { status: 500 }
    );
  }
}