import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { formatDbDate } from "@/lib/utils";
import { documentEventDateKey } from "@/lib/document-event-date";
import { createClientNotification } from "@/lib/coordinator-notifications";
import { noCacheJson } from "@/lib/api-cache-control";

import { requireApiAuth, actingAs } from "@/lib/api-auth";
const CULTURAL_VENUE_IDS = [1];
const SPORTS_VENUE_IDS = [2];

export async function GET(request) {
  const guard = await requireApiAuth(["program coordinator cultural","program coordinator sports","admin"]);
  if (guard.response) return guard.response;

  try {
    const { searchParams } = new URL(request.url);
    const history = searchParams.get("history");
    const cancelled = searchParams.get("cancelled");
    const venueId = searchParams.get("venueId");

    // Determine which venue IDs to filter by
    let venueFilter;
    if (venueId === "2") {
      venueFilter = { in: SPORTS_VENUE_IDS };
    } else {
      venueFilter = { in: CULTURAL_VENUE_IDS };
    }

    // Get reservations for the specified venue
    const reservations = await prisma.reservation.findMany({
      where: {
        venueId: venueFilter,
        ...(cancelled === "true"
          ? { reservationStatus: "Cancelled" }
          : history === "true"
            ? { reservationStatus: "Confirmed" }
            : { reservationStatus: { in: ["Pending"] } }),
      },
      include: {
        venue: { select: { venue: true } },
        timeSlot: { select: { startTime: true, endTime: true } },
        package: { select: { packageName: true } },
        additionalDates: { select: { eventDate: true } },
        schedules: {
          include: {
            facility: { select: { facilityName: true } },
          },
        },
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
    if (cancelled === "true" || history === "true") {
      // For history, include all confirmed reservations that have valid client
      filtered = reservations.filter((r) => clientMap[r.clientId] !== undefined);
    } else if (venueId === "2") {
      // For Sports Complex (venueId=2), show ALL pending reservations — payment is recorded by coordinator
      filtered = reservations
        .filter((r) => clientMap[r.clientId] !== undefined);
    } else {
      // For Cultural Center, only include fully paid ones (LTOO handles payment)
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
        totalAmount: r.totalAmount ? Number(r.totalAmount) : 0,
        amountPaid: totalPaid,
        packageName: r.package?.packageName || null,
        facilities: (r.schedules || []).map((s) => ({
          facilityName: s.facility.facilityName,
        })),
        documents: docs,
        notes: r.notes || "",
        isWalkIn: r.notes ? r.notes.startsWith("Walk-in client:") : false,
      };
    });

    return noCacheJson(formatted);
  } catch (error) {
    console.error("Failed to fetch bookings:", error);
    return noCacheJson(
      { error: "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  const guard = await requireApiAuth(["program coordinator cultural","program coordinator sports","admin"]);
  if (guard.response) return guard.response;
  const acting = actingAs(guard.user);

  try {
    const body = await request.json();
    const { reservationId, action } = body;

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
    } else if (action === "pay_and_confirm") {
      const existing = await prisma.reservation.findUnique({
        where: { reservationId: id },
        select: { reservationStatus: true, clientId: true, totalAmount: true },
      });

      if (!existing) {
        return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
      }

      if (existing.reservationStatus === "Confirmed") {
        return NextResponse.json({ error: "This booking has already been confirmed." }, { status: 400 });
      }

      const paidAmount = Number(existing.totalAmount) || 0;

      // Create confirmed booking
      const booking = await prisma.booking.create({
        data: {
          reservationId: id,
          confirmationDate: new Date(),
          bookingStatusId: 2, // Confirmed
          staffId: acting.performedBy ? parseInt(acting.performedBy, 10) || null : null,
        },
      });

      // Create payment record
      await prisma.payment.create({
        data: {
          bookingId: booking.bookingId,
          amountPaid: paidAmount,
          baseAmount: paidAmount,
          amountAfterDiscount: paidAmount,
          staffId: acting.performedBy ? parseInt(acting.performedBy.replace("STF-", ""), 10) || null : null,
          paymentStatusId: 5, // Fully Paid
        },
      });

      // Update reservation status
      await prisma.reservation.update({
        where: { reservationId: id },
        data: { reservationStatus: "Confirmed" },
      });

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

      return NextResponse.json({ success: true, message: "Payment recorded and booking confirmed. The client has been notified." });
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