import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";


export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get("venueId");
    const month = searchParams.get("month"); // YYYY-MM format
    const timeSlotId = searchParams.get("timeSlotId");

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
    const conflictingReservations = await prisma.reservation.findMany({
      where: {
        venueId: parseInt(venueId, 10),
        reservationStatus: { in: ["Pending", "Confirmed"] },
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
      const key = r.eventDate.toISOString().split("T")[0];
      blockedDates.set(key, "Booked");
      for (const ad of r.additionalDates) {
        const adKey = ad.eventDate.toISOString().split("T")[0];
        blockedDates.set(adKey, "Booked");
      }
    }

    for (const b of calendarBlocks) {
      const key = b.blockDate.toISOString().split("T")[0];
      blockedDates.set(key, b.title || "Unavailable");
    }

    // Build response
    const dates = allDates.map((dt) => {
      const key = dt.toISOString().split("T")[0];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isPast = dt < today;
      return {
        date: key,
        available: !blockedDates.has(key) && !isPast,
        blocked: blockedDates.has(key) || isPast,
        reason: blockedDates.get(key) || null,
        isPast,
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