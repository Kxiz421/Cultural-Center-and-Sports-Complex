import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { CULTURAL_CENTER_VENUE_IDS } from "@/lib/coordinator-notifications";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const pendingReservations = await prisma.reservation.findMany({
      where: {
        venueId: { in: CULTURAL_CENTER_VENUE_IDS },
        reservationStatus: "Pending",
      },
      select: {
        reservationId: true,
        bookings: {
          select: {
            payments: {
              select: {
                status: { select: { status: true } },
              },
            },
          },
        },
      },
    });

    const pendingBookings = pendingReservations.filter((r) =>
      r.bookings.some((b) =>
        b.payments.some(
          (p) => p.status?.status?.toLowerCase() === "fully paid"
        )
      )
    ).length;

    const pendingReschedules = await prisma.rescheduleRequest.count({
      where: {
        status: "Pending",
        reservation: { venueId: { in: CULTURAL_CENTER_VENUE_IDS } },
      },
    });

    return NextResponse.json({
      pendingBookings,
      pendingReschedules,
    });
  } catch (error) {
    console.error("Coordinator pending counts error:", error);
    return NextResponse.json(
      { error: "Failed to fetch pending counts" },
      { status: 500 }
    );
  }
}
