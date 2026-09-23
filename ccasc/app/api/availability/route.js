import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { formatDbDate, formatLocalDateKey } from "@/lib/utils";
import {
  getMinEventDate,
  ADVANCE_BOOKING_REASON,
} from "@/lib/reservation-advance-booking";
import { noCacheJson } from "@/lib/api-cache-control";
import { requireApiAuth } from "@/lib/api-auth";
import {
  ACTIVE_STATUSES,
  buildReservedFacilitiesByDate,
} from "@/lib/facility-reservation-availability";

/** Shown when every Sports Complex facility is already taken on a date. */
const FULLY_RESERVED_REASON = "All facilities are already reserved";

export async function GET(request) {
  const guard = await requireApiAuth();
  if (guard.response) return guard.response;

  try {
    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get("venueId");
    const month = searchParams.get("month"); // YYYY-MM format
    const timeSlotId = searchParams.get("timeSlotId");
    const excludeReservationId = searchParams.get("excludeReservationId");

    if (!venueId || !month) {
      return noCacheJson(
        { error: "venueId and month are required" },
        { status: 400 }
      );
    }

    // Parse month range
    const [year, mon] = month.split("-").map(Number);
    const startDate = new Date(year, mon - 1, 1);
    const endDate = new Date(year, mon, 0, 23, 59, 59); // last day of month

    // Get all dates in the month
    const daysInMonth = new Date(year, mon, 0).getDate();
    const allDates = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(year, mon - 1, d);
      allDates.push(dt);
    }

    // Fetch conflicting reservations (Pending or Confirmed) for this venue.
    // Sports Complex (venueId=2) books by facility, so other reservations do not
    // block the whole calendar day — facility conflicts are checked separately.
    const parsedVenueId = parseInt(venueId, 10);
    const isSportsComplex = parsedVenueId === 2;
    const excludeId = excludeReservationId
      ? parseInt(excludeReservationId, 10)
      : null;

    const conflictingReservations = isSportsComplex
      ? []
      : await prisma.reservation.findMany({
          where: {
            venueId: parsedVenueId,
            reservationStatus: { in: ["Pending", "Confirmed"] },
            ...(excludeId ? { reservationId: { not: excludeId } } : {}),
            OR: [
              { eventDate: { gte: startDate, lte: endDate } },
              {
                additionalDates: {
                  some: { eventDate: { gte: startDate, lte: endDate } },
                },
              },
            ],
          },
          select: {
            eventDate: true,
            additionalDates: { select: { eventDate: true } },
          },
        });

    // Sports Complex is booked per facility, so a reservation does not block the
    // calendar day. A date only becomes unavailable once every facility of the
    // venue is taken — those dates must not be selectable anymore.
    const fullyReservedDates = new Set();
    if (isSportsComplex) {
      const [venueFacilities, facilityReservations] = await Promise.all([
        prisma.facility.findMany({
          where: { venueId: parsedVenueId },
          select: { facilityId: true },
        }),
        prisma.reservation.findMany({
          where: {
            venueId: parsedVenueId,
            reservationStatus: { in: ACTIVE_STATUSES },
            ...(excludeId ? { reservationId: { not: excludeId } } : {}),
            OR: [
              { eventDate: { gte: startDate, lte: endDate } },
              {
                additionalDates: {
                  some: { eventDate: { gte: startDate, lte: endDate } },
                },
              },
            ],
          },
          select: {
            notes: true,
            eventDate: true,
            additionalDates: { select: { eventDate: true } },
            schedules: { select: { facilityId: true } },
          },
        }),
      ]);

      const facilityIds = venueFacilities.map((f) => String(f.facilityId));
      if (facilityIds.length > 0) {
        const reservedByDate = buildReservedFacilitiesByDate(facilityReservations);
        for (const [dateKey, reservedIds] of Object.entries(reservedByDate)) {
          const reserved = new Set((reservedIds || []).map(String));
          if (facilityIds.every((id) => reserved.has(id))) {
            fullyReservedDates.add(dateKey);
          }
        }
      }
    }

    // Fetch calendar blocks for this venue in the month
    const calendarBlocks = await prisma.calendarBlock.findMany({
      where: {
        venueId: parsedVenueId,
        blockDate: { gte: startDate, lte: endDate },
      },
      select: { blockDate: true, title: true },
    });

    // Build blocked dates set
    const blockedDates = new Map(); // ISO date -> reason string

    for (const r of conflictingReservations) {
      const key = formatDbDate(r.eventDate);
      blockedDates.set(key, "Booked");
      for (const ad of r.additionalDates) {
        const adKey = formatDbDate(ad.eventDate);
        blockedDates.set(adKey, "Booked");
      }
    }

    // Fully-booked Sports Complex dates (every facility reserved)
    for (const key of fullyReservedDates) {
      if (!blockedDates.has(key)) {
        blockedDates.set(key, FULLY_RESERVED_REASON);
      }
    }

    for (const b of calendarBlocks) {
      const key = formatDbDate(b.blockDate);
      blockedDates.set(key, b.title || "Unavailable");
    }

    const minEventDate = getMinEventDate();

    // Build response
    const dates = allDates.map((dt) => {
      const key = formatLocalDateKey(dt);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isPast = dt < today;
      const isTooSoon = dt < minEventDate;
      const isBooked = blockedDates.has(key);
      const blocked = isBooked || isPast || isTooSoon;
      return {
        date: key,
        available: !blocked,
        blocked,
        reason: isBooked
          ? blockedDates.get(key)
          : isTooSoon
            ? ADVANCE_BOOKING_REASON
            : null,
        isPast,
        isTooSoon,
      };
    });

    return noCacheJson({ dates, month });
  } catch (error) {
    console.error("Availability fetch error:", error);
    return noCacheJson(
      { error: "Failed to check availability" },
      { status: 500 }
    );
  }
}