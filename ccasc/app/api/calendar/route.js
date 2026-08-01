import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Fetch all reservations without client include to avoid orphaned FK errors
    const reservations = await prisma.reservation.findMany({
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

    // Transform reservations into calendar events, skip orphaned
    const events = reservations
      .filter((r) => clientMap[r.clientId] !== undefined)
      .map((r) => {
        const client = clientMap[r.clientId];
        // Get the latest non-cancelled booking's status
        const activeBookings = r.bookings.filter((b) => b.status?.status !== "Cancelled");
        const latestBooking = activeBookings.length > 0 ? activeBookings[activeBookings.length - 1] : null;
        const bookingStatus = latestBooking?.status?.status || "Unbooked";
        return {
          id: `RES-${r.reservationId}`,
          title: r.eventType,
          date: r.eventDate.toISOString().split("T")[0],
          start: r.timeSlot.startTime,
          end: r.timeSlot.endTime,
          venue: r.venue.venue,
          venueId: r.venue.venueId,
          status: r.reservationStatus,
          type: "event",
          clientName: `${client.firstName} ${client.lastName}`,
          packageName: r.package?.packageName || null,
          bookingStatus: bookingStatus,
        };
      });

    // Transform blocks into calendar events
    const blockEvents = blocks.map((b) => ({
      id: `BLK-${b.blockId}`,
      title: b.title,
      date: b.blockDate.toISOString().split("T")[0],
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

    return NextResponse.json({
      cultural: [...culturalEvents, ...culturalBlocks],
      sports: [...sportsEvents, ...sportsBlocks],
    });
  } catch (error) {
    console.error("Calendar API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch calendar data" },
      { status: 500 }
    );
  }
}