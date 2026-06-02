import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const reservations = await prisma.reservation.findMany({
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