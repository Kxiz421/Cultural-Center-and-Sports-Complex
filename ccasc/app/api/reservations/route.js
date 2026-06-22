import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");

    const reservations = await prisma.reservation.findMany({
      where: clientId ? { clientId: parseInt(clientId, 10) } : {},
      include: {
        venue: { select: { venue: true } },
        client: { select: { firstName: true, lastName: true } },
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

    const formatted = reservations.map((r) => ({
      id: `RES-${r.reservationId}`,
      clientId: r.clientId,
      clientName: `${r.client.firstName} ${r.client.lastName}`,
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
    }));

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
    const { venueId, eventType, eventDate, timeSlotId, packageId, clientId, notes } = await request.json();

    if (!venueId || !eventType || !eventDate || !timeSlotId || !clientId) {
      return NextResponse.json(
        { error: "Missing required fields: venueId, eventType, eventDate, timeSlotId, clientId" },
        { status: 400 }
      );
    }

    const reservation = await prisma.reservation.create({
      data: {
        venueId: parseInt(venueId, 10),
        eventType,
        eventDate: new Date(eventDate),
        timeSlotId: parseInt(timeSlotId, 10),
        packageId: packageId && parseInt(packageId, 10) > 0 ? parseInt(packageId, 10) : null,
        clientId: parseInt(clientId, 10),
        reservationStatus: "Pending",
        eventStatus: "Upcoming",
        submittedAt: new Date(),
      },
    });

    return NextResponse.json({
      id: `RES-${reservation.reservationId}`,
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