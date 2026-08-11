import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const CULTURAL_VENUE_IDS = [1];

export async function GET() {
  try {
    // Get fully paid reservations for Cultural Center
    const reservations = await prisma.reservation.findMany({
      where: {
        venueId: { in: CULTURAL_VENUE_IDS },
        reservationStatus: { in: ["Pending", "Confirmed"] },
      },
      include: {
        venue: { select: { venue: true } },
        timeSlot: { select: { startTime: true, endTime: true } },
        package: { select: { packageName: true } },
        additionalDates: { select: { eventDate: true } },
        bookings: {
          include: {
            payments: {
              include: {
                status: { select: { status: true } },
              },
            },
            documents: {
              include: {
                documentType: { select: { type: true } },
              },
            },
          },
        },
      },
      orderBy: { submittedAt: "desc" },
    });

    // Fetch valid client info separately
    const distinctClientIds = [...new Set(reservations.map((r) => r.clientId))];
    const clients = await prisma.client.findMany({
      where: { clientId: { in: distinctClientIds } },
      select: { clientId: true, firstName: true, lastName: true, clientRole: { select: { roleName: true } } },
    });
    const clientMap = Object.fromEntries(clients.map((c) => [c.clientId, c]));

      // Filter to only fully paid ones (case-insensitive), skip orphaned, and skip already confirmed
    const fullyPaid = reservations
      .filter((r) => clientMap[r.clientId] !== undefined)
      .filter((r) => r.reservationStatus !== "Confirmed")
      .filter((r) =>
        r.bookings.some((b) =>
          b.payments.some((p) => p.status?.status?.toLowerCase() === "fully paid")
        )
      );

    const formatted = fullyPaid.map((r) => {
      const client = clientMap[r.clientId] || { firstName: "Unknown", lastName: "", clientRole: { roleName: "N/A" } };
      const totalPaid = r.bookings.reduce(
        (sum, b) => sum + b.payments.reduce((s, p) => s + Number(p.amountPaid), 0),
        0
      );

      // Collect documents from all bookings
      const docs = r.bookings.flatMap(b => b.documents || []).map(d => ({
        id: d.documentId,
        type: d.documentType?.type || "Document",
        status: d.status || "Pending",
        filePath: d.filePath,
        remarks: d.remarks,
        submittedAt: d.submittedAt,
      }));

      const allDates = [
        r.eventDate.toISOString().split("T")[0],
        ...r.additionalDates.map((ad) => ad.eventDate.toISOString().split("T")[0]),
      ].sort();

      return {
        id: `RES-${r.reservationId}`,
        clientName: `${client.firstName} ${client.lastName}`,
        clientType: client.clientRole?.roleName || "N/A",
        venue: r.venue.venue,
        eventType: r.eventType,
        eventDate: r.eventDate.toISOString().split("T")[0],
        eventDates: allDates,
        timeSlot: `${r.timeSlot.startTime} - ${r.timeSlot.endTime}`,
        status: r.reservationStatus,
        amountPaid: totalPaid,
        packageName: r.package?.packageName || null,
        documents: docs,
      };
    });

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Failed to fetch bookings:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const { reservationId, action } = await request.json();

    if (!reservationId || !action) {
      return NextResponse.json(
        { error: "reservationId and action are required" },
        { status: 400 }
      );
    }

    const id = parseInt(reservationId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid reservationId" }, { status: 400 });
    }

    if (action === "confirm") {
      // Check if already confirmed to prevent double-confirm
      const existing = await prisma.reservation.findUnique({
        where: { reservationId: id },
        select: { reservationStatus: true },
      });

      if (!existing) {
        return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
      }

      if (existing.reservationStatus === "Confirmed") {
        return NextResponse.json({ error: "This booking has already been confirmed." }, { status: 400 });
      }

      // Update reservation status to Confirmed
      await prisma.reservation.update({
        where: { reservationId: id },
        data: { reservationStatus: "Confirmed" },
      });

      // Update associated booking status
      const bookings = await prisma.booking.findMany({
        where: { reservationId: id },
      });

      for (const booking of bookings) {
        await prisma.booking.update({
          where: { bookingId: booking.bookingId },
          data: { bookingStatusId: 2 }, // Confirmed status
        });
      }

      // Get reservation details for notification
      const reservation = await prisma.reservation.findUnique({
        where: { reservationId: id },
        select: {
          clientId: true,
          eventType: true,
          eventDate: true,
          venue: { select: { venue: true } },
        },
      });

      // Send notification to client
      if (reservation) {
        await prisma.notification.create({
          data: {
            clientId: reservation.clientId,
            staffId: 1, // Default staff ID
            message: `Your booking for "${reservation.eventType}" at ${reservation.venue.venue} on ${reservation.eventDate.toISOString().split("T")[0]} has been confirmed.`,
            type: "Booking Confirmation",
            sentAt: new Date(),
          },
        });
      }

      return NextResponse.json({ success: true, message: "Booking confirmed. The client has been notified." });
    } else if (action === "cancel") {
      // Update reservation status to Cancelled
      await prisma.reservation.update({
        where: { reservationId: id },
        data: { reservationStatus: "Cancelled" },
      });

      return NextResponse.json({ success: true, message: "Booking cancelled." });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Failed to update booking:", error);
    return NextResponse.json(
      { error: "Failed to update booking" },
      { status: 500 }
    );
  }
}