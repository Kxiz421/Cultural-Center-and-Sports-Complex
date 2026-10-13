import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { noCacheJson } from "@/lib/api-cache-control";
import { venueAcronym } from "@/lib/venues";
import { formatDbDate, formatLocalDateKey } from "@/lib/utils";
import { getBookingStatusId, BOOKING_STATUS } from "@/lib/booking-status";
import { processUnpaidReservationRule } from "@/lib/reservation-unpaid-cleanup";

import { requireApiAuth, actingAs } from "@/lib/api-auth";
export const dynamic = "force-dynamic";

/** Whole days from today (local) to a DATE column value; negative when past. */
function daysUntilDate(dateValue) {
  const key = formatDbDate(dateValue);
  if (!key) return null;
  const diff =
    Date.parse(`${key}T00:00:00.000Z`) -
    Date.parse(`${formatLocalDateKey(new Date())}T00:00:00.000Z`);
  return Math.round(diff / 86400000);
}

export async function GET() {
  const guard = await requireApiAuth(["local treasury operations officer","admin"]);
  if (guard.response) return guard.response;

  try {
    // Unpaid reservations due within 2 days are removed here too, so this list
    // stays in sync with the facility calendar.
    try {
      await processUnpaidReservationRule();
    } catch (cleanupError) {
      console.error("Unpaid reservation rule failed:", cleanupError);
    }

    const bookings = await prisma.booking.findMany({
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

      // Show the same status the facility calendar shows: the reservation status.
      const reservationStatus = b.reservation?.reservationStatus || "Pending";
      const daysUntilEvent = daysUntilDate(b.reservation?.eventDate);
      const isWithin30Days =
        daysUntilEvent !== null && daysUntilEvent < 30 && daysUntilEvent >= 0;

      // Cancellation is possible until 2 days before the event - inside that
      // last-2-days window it is blocked. Cancelling within 30 days forfeits the
      // 50% down payment and 10% deposit (shown as a warning, not a block).
      const canCancel =
        reservationStatus === "Confirmed" &&
        !isProvincial &&
        paymentStatus !== "Fully Paid" &&
        daysUntilEvent !== null &&
        daysUntilEvent > 2;

      let forfeitureWarning = null;
      if (isWithin30Days && paymentStatus !== "No Payment") {
        forfeitureWarning = "Cancellation within 30 days of the event will result in forfeiture of the 50% down payment and 10% deposit.";
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
          ? formatDbDate(b.reservation.eventDate)
          : "",
        venue: b.reservation?.venue?.venue,
        venueId: b.reservation?.venue?.venueId,
        venueAcronym: venueAcronym(b.reservation?.venue?.venueId),
        timeSlot: b.reservation?.timeSlot
          ? `${b.reservation.timeSlot.startTime} - ${b.reservation.timeSlot.endTime}`
          : "",
        paymentStatus,
        bookingStatus: reservationStatus,
        packageName: b.reservation?.package?.packageName,
        reservationId: b.reservationId,
        daysUntilEvent,
        canCancel,
        isWithin30Days,
        forfeitureWarning,
      };
    });

    return noCacheJson(mapped);
  } catch (error) {
    console.error("Cancellations GET error:", error);
    return noCacheJson(
      { error: "Failed to load bookings" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const guard = await requireApiAuth(["local treasury operations officer","admin"]);
  if (guard.response) return guard.response;
  const acting = actingAs(guard.user);

  try {
    const body = await request.json();
    const { bookingId } = body;

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

    // Update booking status to Cancelled (id resolved by name).
    const cancelledStatusId = await getBookingStatusId(BOOKING_STATUS.CANCELLED);
    if (cancelledStatusId != null) {
      await prisma.booking.update({
        where: { bookingId: parseInt(bookingId) },
        data: { bookingStatusId: cancelledStatusId },
      });
    }

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
        performedById: acting.performedBy,
        performedByName: acting.performedByName,
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