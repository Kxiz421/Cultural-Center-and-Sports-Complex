import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createClientNotification } from "@/lib/coordinator-notifications";
import { walkInDisplayName } from "@/lib/walk-in";
import {
  CANCELLATION_LATE_CUTOFF_DAYS,
  getCancellationEligibility,
} from "@/lib/cancellation-policy";
import { getBookingStatusId, BOOKING_STATUS } from "@/lib/booking-status";

import { requireApiAuth, actingAs, ownClientId } from "@/lib/api-auth";
export const dynamic = "force-dynamic";

/**
 * POST /api/cancellations
 *
 * Cancel a reservation by a client or provincial agency.
 *
 * Accepted until 2 days before the event (see lib/cancellation-policy). Inside
 * the 30-day window the payments are forfeited in favour of the Provincial
 * Government instead of being refunded; the same rule the LTOO cancellation
 * screen applies.
 *
 * Body: { reservationId, reason? }
 */
export async function POST(request) {
  const guard = await requireApiAuth();
  if (guard.response) return guard.response;
  const acting = actingAs(guard.user);

  try {
    const body = await request.json();
    const { reservationId, reason } = body;

    if (!reservationId) {
      return NextResponse.json(
        { error: "Reservation ID is required" },
        { status: 400 }
      );
    }

    const parsedReservationId = parseInt(
      String(reservationId).replace(/^RES-/, ""),
      10
    );
    if (isNaN(parsedReservationId)) {
      return NextResponse.json(
        { error: "Invalid reservation ID" },
        { status: 400 }
      );
    }

    // Fetch the reservation with client and venue info
    const reservation = await prisma.reservation.findUnique({
      where: { reservationId: parsedReservationId },
      include: {
        client: {
          select: {
            clientId: true,
            firstName: true,
            lastName: true,
            clientRole: { select: { clientRoleId: true, roleName: true } },
          },
        },
        venue: { select: { venue: true } },
      },
    });

    if (!reservation) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 }
      );
    }

    // Client-role sessions may only cancel their own reservation.
    const ownCancelClientId = ownClientId(guard.user);
    if (
      ownCancelClientId != null &&
      reservation.client?.clientId !== ownCancelClientId
    ) {
      return NextResponse.json(
        { error: "You do not have access to this reservation." },
        { status: 403 }
      );
    }

    // Cancellation rule (lib/cancellation-policy): accepted until 2 days before
    // the event; inside the 30-day window the payments are forfeited.
    const eventDate = reservation.eventDate
      ? new Date(reservation.eventDate)
      : null;
    const { daysUntil: daysUntilEvent, canCancel, isForfeiture } =
      getCancellationEligibility(reservation.eventDate);

    const alreadyClosed =
      reservation.reservationStatus === "Cancelled" ||
      reservation.reservationStatus === "Declined";

    if (alreadyClosed || !canCancel) {
      const message =
        !alreadyClosed &&
        daysUntilEvent !== null &&
        daysUntilEvent <= CANCELLATION_LATE_CUTOFF_DAYS
          ? "Cancellation is no longer available. Cancellations must be made at least " +
            CANCELLATION_LATE_CUTOFF_DAYS +
            " days before the event."
          : "Cancellation is not available for this reservation.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const clientName = reservation.client
      ? reservation.client.firstName + " " + reservation.client.lastName
      : walkInDisplayName(reservation.notes);
    const performerId =
      acting.performedBy ||
      (reservation.client ? "CLT-" + reservation.client.clientId : "WALK-IN");
    const performerName =
      acting.performedByName || clientName || "Client";

    // Mirror the LTOO cancellation: the reservation and its booking row both go
    // to Cancelled, so every panel and the facility calendar read one status.
    const cancelledBookingStatusId = await getBookingStatusId(
      BOOKING_STATUS.CANCELLED
    );

    const outcomeDetail = isForfeiture
      ? "Cancellation was made less than 30 days before the event — the 50% down payment, 10% deposit and remaining balance are forfeited in favour of the Provincial Government."
      : "Cancellation was made at least 30 days before the event — payments are eligible for refund.";

    await prisma.$transaction(async (tx) => {
      await tx.reservation.update({
        where: { reservationId: parsedReservationId },
        data: { reservationStatus: "Cancelled" },
      });

      if (cancelledBookingStatusId != null) {
        await tx.booking.updateMany({
          where: { reservationId: parsedReservationId },
          data: { bookingStatusId: cancelledBookingStatusId },
        });
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          action: isForfeiture
            ? "RESERVATION_CANCELLED_FORFEITED"
            : "RESERVATION_CANCELLED",
          targetUserId: "RES-" + parsedReservationId,
          targetName: clientName,
          performedById: performerId,
          performedByName: performerName,
          details: "Reservation #" + parsedReservationId + " for " + clientName + " at " + reservation.venue.venue + " has been cancelled. Reason: " + (reason || "No reason provided") + ". " + outcomeDetail,
        },
      });
    });

    const clientOutcome = isForfeiture
      ? "As the cancellation was made less than 30 days before the event, the 50% down payment, 10% deposit and remaining balance are forfeited in favor of the Provincial Government."
      : "Since the cancellation was made at least 30 days before the event, any payments made are eligible for refund.";

    // Send notification to the client
    await createClientNotification({
      clientId: reservation.client?.clientId,
      type: "cancellation",
      message: "Your reservation for \"" + (reservation.eventType || "Scheduled event") + "\" at " + reservation.venue.venue + " on " + (eventDate ? eventDate.toISOString().split("T")[0] : "N/A") + " has been CANCELLED. Reason: " + (reason || "No reason provided") + ". " + clientOutcome,
    });

    return NextResponse.json({
      success: true,
      message: "Reservation cancelled successfully. " + clientOutcome,
      isForfeiture,
      reservationId: parsedReservationId,
    });
  } catch (error) {
    console.error("Cancellation error:", error);
    return NextResponse.json(
      { error: "Failed to cancel reservation" },
      { status: 500 }
    );
  }
}