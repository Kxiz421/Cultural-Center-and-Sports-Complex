import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const bookings = await prisma.booking.findMany({
      include: {
        reservation: {
          include: {
            venue: { select: { venue: true } },
            client: { select: { firstName: true, lastName: true } },
          },
        },
        venue: { select: { venue: true } },
        status: { select: { status: true } },
        staff: { select: { firstName: true, lastName: true } },
        payments: { select: { amountPaid: true } },
      },
      orderBy: { confirmationDate: { sort: "desc", nulls: "last" } },
    });

    const formatted = bookings.map((b) => ({
      id: `BK-${b.bookingId}`,
      reservationId: `RES-${b.reservationId}`,
      venueId: b.venueId || b.reservation.venueId,
      venue: b.venue?.venue || b.reservation.venue.venue,
      clientName: `${b.reservation.client.firstName} ${b.reservation.client.lastName}`,
      eventType: b.reservation.eventType,
      eventDate: b.reservation.eventDate.toISOString().split("T")[0],
      status: b.status.status,
      staffName: b.staff ? `${b.staff.firstName} ${b.staff.lastName}` : null,
      confirmationDate: b.confirmationDate?.toISOString().split("T")[0] || null,
      amountPaid: b.payments.reduce((sum, p) => sum + Number(p.amountPaid), 0),
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Failed to fetch bookings:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}