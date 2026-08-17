import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const bookings = await prisma.booking.findMany({
      where: {
        bookingStatusId: 2, // Booked/Confirmed
      },
      include: {
        reservation: {
          include: {
            client: {
              select: {
                clientId: true,
                firstName: true,
                lastName: true,
                clientRole: { select: { clientRoleId: true } },
              },
            },
            package: { select: { packageName: true } },
            venue: { select: { venue: true, venueId: true } },
            timeSlot: { select: { startTime: true, endTime: true } },
          },
        },
        payments: {
          include: { status: { select: { status: true } } },
        },
        status: { select: { status: true } },
      },
      orderBy: { bookingId: "desc" },
    });

    const mapped = bookings.map((b) => {
      const client = b.reservation?.client;
      const isProvincial = client?.clientRole?.clientRoleId === "PROV";
      const paymentStatus = b.payments?.length > 0
        ? b.payments.some((p) => p.status?.status === "Fully Paid")
          ? "Fully Paid"
          : "Partially Paid"
        : "No Payment";

      // Calculate cancellation eligibility based on 30-day rule
      const eventDate = b.reservation?.eventDate ? new Date(b.reservation.eventDate) : null;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let daysUntilEvent = null;
      let canCancel = false;
      let isWithin30Days = false;
      let forfeitureWarning = null;

      if (eventDate) {
        eventDate.setHours(0, 0, 0, 0);
        daysUntilEvent = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
        canCancel = daysUntilEvent >= 30;
        isWithin30Days = daysUntilEvent < 30 && daysUntilEvent >= 0;

        if (isWithin30Days && paymentStatus !== "No Payment") {
          forfeitureWarning = "Cancellation within 30 days of the event will result in forfeiture of the 50% down payment and 10% deposit.";
        }
      }

      return {
        id: b.bookingId,
        bookingId: b.bookingId,
        clientId: client?.clientId,
        clientName: client
          ? `${client.firstName} ${client.lastName}`
          : "Unknown",
        clientType: isProvincial ? "provincial" : "client",
        activityName: b.reservation?.eventType,
        eventDate: b.reservation?.eventDate
          ? b.reservation.eventDate.toISOString().split("T")[0]
          : "",
        venue: b.reservation?.venue?.venue,
        venueId: b.reservation?.venue?.venueId,
        timeSlot: b.reservation?.timeSlot
          ? `${b.reservation.timeSlot.startTime} - ${b.reservation.timeSlot.endTime}`
          : "",
        paymentStatus,
        bookingStatus: b.status?.status || "Confirmed",
        daysUntilEvent,
        canCancel,
        isWithin30Days,
        forfeitureWarning,
      };
    });

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("Cancellations GET error:", error);
    return NextResponse.json(
      { error: "Failed to load bookings" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { bookingId, performedBy, performedByName } = body;

    if (!bookingId) {
      return NextResponse.json(
        { error: "Booking ID is required" },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { bookingId: parseInt(bookingId) },
      include: {
        reservation: {
          include: {
            client: { select: { firstName: true, lastName: true } },
          },
        },
        payments: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const clientName = booking.reservation?.client
      ? `${booking.reservation.client.firstName} ${booking.reservation.client.lastName}`
      : "Unknown";

    // Check 30-day forfeiture rule
    const eventDate = booking.reservation?.eventDate;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let isForfeiture = false;

    if (eventDate) {
      const event = new Date(eventDate);
      event.setHours(0, 0, 0, 0);
      const daysUntilEvent = Math.ceil((event - today) / (1000 * 60 * 60 * 24));
      if (daysUntilEvent < 30) {
        isForfeiture = true;
      }
    }

    // Update booking status to Cancelled (statusId 3)
    await prisma.booking.update({
      where: { bookingId: parseInt(bookingId) },
      data: { bookingStatusId: 3 },
    });

    // Update reservation status to Cancelled
    await prisma.reservation.update({
      where: { reservationId: booking.reservationId },
      data: { reservationStatus: "Cancelled" },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: isForfeiture ? "BOOKING_CANCELLED_FORFEITED" : "BOOKING_CANCELLED",
        targetUserId: `BKG-${bookingId}`,
        targetName: clientName,
        performedById: performedBy || "LTOO",
        performedByName: performedByName || "Local Treasury Operations Officer",
        details: isForfeiture
          ? `Booking #${bookingId} for ${clientName} cancelled within 30-day window. Payments forfeited (non-refundable). Records preserved for audit.`
          : `Booking #${bookingId} for ${clientName} has been cancelled. Payments are eligible for refund.`,
      },
    });

    return NextResponse.json({
      success: true,
      isForfeiture,
      message: isForfeiture
        ? "Booking cancelled. Payments are forfeited (non-refundable). Records preserved for audit."
        : "Booking cancelled successfully. Payments are eligible for refund.",
    });
  } catch (error) {
    console.error("Cancellations POST error:", error);
    return NextResponse.json(
      { error: "Failed to cancel booking" },
      { status: 500 }
    );
  }
}