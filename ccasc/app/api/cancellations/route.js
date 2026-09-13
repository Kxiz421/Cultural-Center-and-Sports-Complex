import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createClientNotification } from "@/lib/coordinator-notifications";

export const dynamic = "force-dynamic";

/**
 * POST /api/cancellations
 *
 * Cancel a reservation by a client or provincial agency.
 * Only allowed if the event date is at least 30 days away.
 *
 * Body: { reservationId, reason?, performedBy?, performedByName? }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { reservationId, reason, performedBy, performedByName } = body;

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

    // Check the 30-day cancellation rule
    const eventDate = reservation.eventDate
      ? new Date(reservation.eventDate)
      : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let daysUntilEvent = null;
    let canCancel = false;

    if (eventDate) {
      eventDate.setHours(0, 0, 0, 0);
      daysUntilEvent = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
      canCancel = daysUntilEvent >= 30;
    }

    if (!canCancel) {
      const message =
        daysUntilEvent !== null && daysUntilEvent < 30
          ? "Cancellation is only allowed at least 30 days before the event. Only " + daysUntilEvent + " day(s) remaining before the event."
          : "Cancellation is not available for this reservation.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const clientName = reservation.client.firstName + " " + reservation.client.lastName;
    const performerId = performedBy || "CLT-" + reservation.client.clientId;
    const performerName =
      performedByName || clientName || "Client";

    // Cancel only the reservation (bookings are left untouched)
    await prisma.$transaction(async (tx) => {
      await tx.reservation.update({
        where: { reservationId: parsedReservationId },
        data: { reservationStatus: "Cancelled" },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          action: "RESERVATION_CANCELLED",
          targetUserId: "RES-" + parsedReservationId,
          targetName: clientName,
          performedById: performerId,
          performedByName: performerName,
          details: "Reservation #" + parsedReservationId + " for " + clientName + " at " + reservation.venue.venue + " has been cancelled. Reason: " + (reason || "No reason provided") + ". Cancellation was made at least 30 days before the event — payments are eligible for refund.",
        },
      });
    });

    // Send notification to the client
    await createClientNotification({
      clientId: reservation.client.clientId,
      type: "cancellation",
      message: "Your reservation for \"" + (reservation.eventType || "Scheduled event") + "\" at " + reservation.venue.venue + " on " + (eventDate ? eventDate.toISOString().split("T")[0] : "N/A") + " has been CANCELLED. Reason: " + (reason || "No reason provided") + ". Since the cancellation was made at least 30 days before the event, any payments made are eligible for refund.",
    });

    return NextResponse.json({
      success: true,
      message: "Reservation cancelled successfully. Any payments made are eligible for refund.",
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