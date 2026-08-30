import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { formatDbDate } from "@/lib/utils";
import { documentEventDateKey } from "@/lib/document-event-date";
import { createClientNotification } from "@/lib/coordinator-notifications";

const CULTURAL_VENUE_IDS = [1];

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const history = searchParams.get("history");

    // Get reservations for Cultural Center
    const reservations = await prisma.reservation.findMany({
      where: {
        venueId: { in: CULTURAL_VENUE_IDS },
        ...(history === "true"
          ? { reservationStatus: "Confirmed" }
          : { reservationStatus: { in: ["Pending"] } }),
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

    let filtered;
    if (history === "true") {
      // For history, include all confirmed reservations that have valid client
      filtered = reservations.filter((r) => clientMap[r.clientId] !== undefined);
    } else {
      // For pending bookings, only include fully paid ones
      filtered = reservations
        .filter((r) => clientMap[r.clientId] !== undefined)
        .filter((r) =>
          r.bookings.some((b) =>
            b.payments.some((p) => p.status?.status?.toLowerCase() === "fully paid")
          )
        );
    }

    const formatted = filtered.map((r) => {
      const client = clientMap[r.clientId] || { firstName: "Unknown", lastName: "", clientRole: { roleName: "N/A" } };
      const totalPaid = r.bookings.reduce(
        (sum, b) => sum + b.payments.reduce((s, p) => s + Number(p.amountPaid), 0),
        0
      );

      const primaryDate = formatDbDate(r.eventDate);
      const docs = r.bookings.flatMap(b => b.documents || []).map(d => ({
        id: d.documentId,
        type: d.documentType?.type || "Document",
        status: d.documentStatus || "Pending",
        filePath: d.filePath,
        remarks: d.remarks,
        submittedAt: d.submittedAt,
        eventDate: documentEventDateKey(d, primaryDate),
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

      await prisma.reservation.update({
        where: { reservationId: id },
        data: { reservationStatus: "Confirmed" },
      });

      const bookings = await prisma.booking.findMany({
        where: { reservationId: id },
      });

      for (const booking of bookings) {
        await prisma.booking.update({
          where: { bookingId: booking.bookingId },
          data: { bookingStatusId: 2 },
        });
      }

      const reservation = await prisma.reservation.findUnique({
        where: { reservationId: id },
        select: {
          clientId: true,
          eventType: true,
          eventDate: true,
          venue: { select: { venue: true } },
        },
      });

      if (reservation) {
        await createClientNotification({
          clientId: reservation.clientId,
          type: "Booking Confirmation",
          message: `Your booking for "${reservation.eventType}" at ${reservation.venue.venue} on ${reservation.eventDate.toISOString().split("T")[0]} has been confirmed.`,
        });
      }

      return NextResponse.json({ success: true, message: "Booking confirmed. The client has been notified." });
    } else if (action === "cancel") {
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