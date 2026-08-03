import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");

    // Get reservations WITHOUT client include to avoid orphaned FK errors
    const reservations = await prisma.reservation.findMany({
      where: clientId ? { clientId: parseInt(clientId, 10) } : {},
      include: {
        venue: { select: { venue: true } },
        timeSlot: { select: { startTime: true, endTime: true } },
        bookings: {
          include: {
            status: { select: { status: true } },
            payments: { select: { amountPaid: true } },
          },
        },
        reservedParticulars: {
          include: {
            particular: { select: { particularName: true } },
          },
        },
      },
      orderBy: { submittedAt: "desc" },
    });

    // Fetch valid client info separately
    const distinctClientIds = [...new Set(reservations.map((r) => r.clientId))];
    const clients = await prisma.client.findMany({
      where: { clientId: { in: distinctClientIds } },
      select: { clientId: true, firstName: true, lastName: true },
    });
    const clientMap = Object.fromEntries(clients.map((c) => [c.clientId, c]));

    const formatted = reservations
      .filter((r) => clientMap[r.clientId] !== undefined) // Skip orphaned
      .map((r) => {
        const client = clientMap[r.clientId];
        return {
          id: `RES-${r.reservationId}`,
          clientId: r.clientId,
          clientName: `${client.firstName} ${client.lastName}`,
          venueId: r.venueId,
          venue: r.venue.venue,
          eventType: r.eventType,
          eventDate: r.eventDate.toISOString().split("T")[0],
          timeSlot: `${r.timeSlot.startTime} - ${r.timeSlot.endTime}`,
          status: r.reservationStatus,
          submittedAt: r.submittedAt.toISOString(),
          bookingStatus: r.bookings[0]?.status?.status || "Unbooked",
          bookingVenueId: r.bookings[0]?.venueId || null,
          amountPaid: r.bookings.reduce((sum, b) => 
            sum + b.payments.reduce((s, p) => s + Number(p.amountPaid), 0), 0),
          particulars: r.reservedParticulars.map((rp) => rp.particular.particularName),
          notes: r.notes || null,
        };
      });

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Failed to fetch reservations:", error);
    return NextResponse.json(
      { error: "Failed to fetch reservations" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { venueId, eventType, eventDate, timeSlotId, packageId, clientId, notes, clientName, clientContact, clientEmail } = await request.json();

    if (!venueId || !eventType || !eventDate || !timeSlotId || !clientId) {
      return NextResponse.json(
        { error: "Missing required fields: venueId, eventType, eventDate, timeSlotId, clientId" },
        { status: 400 }
      );
    }

    const isWalkIn = notes && notes.startsWith("Walk-in client:");
    const parsedClientId = parseInt(clientId, 10);
    const venueNames = { 1: "Cultural Center", 2: "Sports Complex" };
    const venueName = venueNames[parseInt(venueId, 10)] || "Unknown Venue";

    const reservation = await prisma.reservation.create({
      data: {
        venueId: parseInt(venueId, 10),
        eventType,
        eventDate: new Date(eventDate),
        timeSlotId: parseInt(timeSlotId, 10),
        packageId: packageId && parseInt(packageId, 10) > 0 ? parseInt(packageId, 10) : null,
        clientId: parsedClientId,
        reservationStatus: "Pending",
        eventStatus: "Upcoming",
        submittedAt: new Date(),
        notes: notes || null,
      },
    });

    const reservationId = `RES-${reservation.reservationId}`;

    // For walk-in reservations, send notifications
    if (isWalkIn) {
      const displayName = clientName || "Walk-in Client";
      const timeSlotNames = { 1: "Day (8:00 AM - 5:00 PM)", 2: "Night (5:00 PM - 10:00 PM)" };
      const timeSlotName = timeSlotNames[parseInt(timeSlotId, 10)] || "Unknown Time Slot";

      // 1. Notify provincial department agencies (PDA) about the new walk-in reservation
      const provincialAgencies = await prisma.client.findMany({
        where: {
          clientRoleId: "PROV",
        },
        select: { clientId: true },
      });

      const pdaNotificationMessage = `New walk-in reservation: ${displayName} booked ${venueName} for "${eventType}" on ${eventDate} (${timeSlotName}).`;

      for (const agency of provincialAgencies) {
        await prisma.notification.create({
          data: {
            message: pdaNotificationMessage,
            type: "booking",
            staffId: 1,
            clientId: agency.clientId,
            sentAt: new Date(),
          },
        });
      }

      // 2. Notify the client about their new reservation
      await prisma.notification.create({
        data: {
          message: `Your walk-in reservation at ${venueName} for "${eventType}" on ${eventDate} (${timeSlotName}) has been submitted successfully. Reference: ${reservationId}`,
          type: "booking",
          staffId: 1,
          clientId: parsedClientId,
          sentAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      id: reservationId,
      message: "Reservation created successfully",
    }, { status: 201 });
  } catch (error) {
    console.error("Failed to create reservation:", error);
    return NextResponse.json(
      { error: "Failed to create reservation" },
      { status: 500 }
    );
  }
}
