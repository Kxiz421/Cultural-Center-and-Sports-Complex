import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseSqlDate } from "@/lib/utils";
import {
  ACTIVE_STATUSES,
  buildReservedFacilitiesByDate,
} from "@/lib/facility-reservation-availability";

/**
 * GET /api/facilities/availability?venueId=2&dates=2026-09-20,2026-09-21
 * Returns which facilities are already reserved on each requested date.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get("venueId");
    const datesParam = searchParams.get("dates");
    const excludeReservationId = searchParams.get("excludeReservationId");

    if (!venueId || !datesParam) {
      return NextResponse.json(
        { error: "venueId and dates are required" },
        { status: 400 }
      );
    }

    const dateKeys = [
      ...new Set(
        datesParam
          .split(",")
          .map((d) => parseSqlDate(d.trim()))
          .filter(Boolean)
      ),
    ];

    if (dateKeys.length === 0) {
      return NextResponse.json({ reservedByDate: {}, dates: [] });
    }

    const dateObjects = dateKeys.map((d) => new Date(`${d}T00:00:00.000Z`));
    const excludeId = excludeReservationId
      ? parseInt(excludeReservationId, 10)
      : null;

    const reservations = await prisma.reservation.findMany({
      where: {
        venueId: parseInt(venueId, 10),
        reservationStatus: { in: ACTIVE_STATUSES },
        ...(excludeId ? { reservationId: { not: excludeId } } : {}),
        OR: [
          { eventDate: { in: dateObjects } },
          { additionalDates: { some: { eventDate: { in: dateObjects } } } },
        ],
      },
      select: {
        notes: true,
        eventDate: true,
        additionalDates: { select: { eventDate: true } },
        schedules: { select: { facilityId: true } },
      },
    });

    const reservedByDate = buildReservedFacilitiesByDate(reservations);

    // Only return keys for requested dates
    const filtered = {};
    for (const date of dateKeys) {
      filtered[date] = reservedByDate[date] || [];
    }

    return NextResponse.json({
      dates: dateKeys,
      reservedByDate: filtered,
    });
  } catch (error) {
    console.error("Facility availability fetch error:", error);
    return NextResponse.json(
      { error: "Failed to check facility availability" },
      { status: 500 }
    );
  }
}
