import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { formatDbDate, formatLocalDateKey } from "@/lib/utils";
import {
  getMinEventDate,
  ADVANCE_BOOKING_REASON,
} from "@/lib/reservation-advance-booking";
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get("venueId");
    const month = searchParams.get("month"); // YYYY-MM format
    const timeSlotId = searchParams.get("timeSlotId");
    const excludeReservationId = searchParams.get("excludeReservationId");

    if (!venueId || !month) {
      return NextResponse.json(
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

    // Fetch conflicting reservations (Pending or Confirmed) for this venue
    const excludeId = excludeReservationId
      ? parseInt(excludeReservationId, 10)
      : null;

    const conflictingReservations = await prisma.reservation.findMany({
      where: {
        venueId: parseInt(venueId, 10),
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

    // Fetch calendar blocks for this venue in the month
    const calendarBlocks = await prisma.calendarBlock.findMany({
      where: {
        venueId: parseInt(venueId, 10),
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

    return NextResponse.json({ dates, month });
  } catch (error) {
    console.error("Availability fetch error:", error);
    return NextResponse.json(
      { error: "Failed to check availability" },
      { status: 500 }
    );
  }
}