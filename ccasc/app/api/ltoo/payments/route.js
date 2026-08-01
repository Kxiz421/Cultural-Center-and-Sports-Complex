import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";

const prisma = new PrismaClient();

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const bookingsOnly = searchParams.get("bookings");

    if (bookingsOnly === "true") {
      // Fetch reservations without client include to avoid orphaned FK errors
      const reservations = await prisma.reservation.findMany({
        where: {
          reservationStatus: { not: "Cancelled" },
        },
        include: {
          package: { select: { packageName: true, dayRate: true, nightRate: true } },
          venue: { select: { venue: true } },
          timeSlot: { select: { startTime: true, endTime: true } },
          bookings: { select: { bookingId: true } },
        },
        orderBy: { reservationId: "desc" },
      });

      // Fetch valid client info separately
      const distinctClientIds = [...new Set(reservations.map((r) => r.clientId))];
      const clients = await prisma.client.findMany({
        where: { clientId: { in: distinctClientIds } },
        select: { clientId: true, firstName: true, lastName: true, clientRole: { select: { clientRoleId: true } } },
      });
      const clientMap = Object.fromEntries(clients.map((c) => [c.clientId, c]));

      const mapped = reservations
        .filter((r) => clientMap[r.clientId] !== undefined)
        .map((r) => {
          const client = clientMap[r.clientId];
          return {
            id: r.reservationId,
            reservationId: r.reservationId,
            clientName: `${client.firstName} ${client.lastName}`,
            clientType: client.clientRole?.clientRoleId === "PROV" ? "provincial-agency" : "client",
            eventType: r.eventType,
            eventDate: r.eventDate ? new Date(r.eventDate).toISOString().split("T")[0] : "",
            venue: r.venue?.venue,
            timeSlot: r.timeSlot ? `${r.timeSlot.startTime} - ${r.timeSlot.endTime}` : "",
            packageName: r.package?.packageName,
            packageDayRate: r.package?.dayRate ? Number(r.package.dayRate) : null,
            packageNightRate: r.package?.nightRate ? Number(r.package.nightRate) : null,
            hasBooking: r.bookings.length > 0,
          };
        });

      return NextResponse.json(mapped);
    }

    // Return all payments
    const payments = await prisma.payment.findMany({
      include: {
        booking: {
          include: {
            reservation: {
              include: {
                client: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
        transactions: true,
        status: { select: { status: true } },
      },
      orderBy: { paymentId: "desc" },
    });

    const mapped = payments.map((p) => ({
      paymentId: p.paymentId,
      clientName: p.booking?.reservation?.client
        ? `${p.booking.reservation.client.firstName} ${p.booking.reservation.client.lastName}`
        : p.booking?.reservation?.notes?.includes("Walk-in")
          ? p.booking.reservation.notes
          : "Unknown",
      clientType:
        p.booking?.reservation?.client?.clientRoleId === "PROV"
          ? "provincial"
          : "client",
      orNumber: p.transactions?.[0]?.receiptNumber || "",
      totalAmount: Number(p.amountPaid),
      amountPaid: Number(p.amountPaid),
      paymentStatus: p.status?.status || "Partially Paid",
      activityName: p.booking?.reservation?.eventType || "",
      createdAt: p.transactions?.[0]?.paymentDate || p.booking?.confirmationDate,
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("Payments GET error:", error);
    return NextResponse.json(
      { error: "Failed to load payments" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      clientType,
      clientName,
      company,
      address,
      contactNumber,
      activityName,
      activityDate,
      totalAmount,
      orNumber,
      selectedBookingId,
      paymentStatus,
      performedBy,
      performedByName,
    } = body;

    if (!clientName || !totalAmount || !orNumber) {
      return NextResponse.json(
        { error: "Client name, total amount, and OR number are required" },
        { status: 400 }
      );
    }

    const amount = parseFloat(totalAmount);
    const statusToUse =
      clientType === "provincial" ? "Fully Paid" : paymentStatus || "Partially Paid";

    // Find or create payment status
    let paymentStatusRecord = await prisma.paymentStatus.findFirst({
      where: { status: statusToUse },
    });
    if (!paymentStatusRecord) {
      paymentStatusRecord = await prisma.paymentStatus.create({
        data: { status: statusToUse },
      });
    }

    let reservationId = selectedBookingId ? parseInt(selectedBookingId) : null;
    let bookingId = null;

    // If no reservation selected, create one
    if (!reservationId) {
      let tempClient = await prisma.client.findFirst({
        where: { clientRoleId: clientType === "provincial" ? "PROV" : "INDV" },
      });

      if (!tempClient) {
        tempClient = await prisma.client.findFirst();
      }

      const reservation = await prisma.reservation.create({
        data: {
          eventDate: activityDate ? new Date(activityDate) : new Date(),
          eventType: activityName || "Payment Recording",
          reservationStatus: "Confirmed",
          venueId: 1,
          clientId: tempClient.clientId,
          timeSlotId: 1,
          notes: `Payment recorded by LTOO. Client: ${clientName}, Company: ${company || "N/A"}, Address: ${address || "N/A"}, Contact: ${contactNumber || "N/A"}`,
          submittedAt: new Date(),
        },
      });

      reservationId = reservation.reservationId;
    }

    // Find or create a booking for this reservation
    let existingBooking = await prisma.booking.findFirst({
      where: { reservationId: reservationId },
    });

    if (!existingBooking) {
      existingBooking = await prisma.booking.create({
        data: {
          reservationId: reservationId,
          venueId: 1,
          bookingStatusId: statusToUse === "Fully Paid" ? 2 : 1, // Booked or Pending
          confirmationDate: new Date(),
          staffId: performedBy ? parseInt(performedBy.replace("STF-", "")) || null : null,
        },
      });
    }

    bookingId = existingBooking.bookingId;

    // Update booking status if Fully Paid
    if (statusToUse === "Fully Paid") {
      await prisma.booking.update({
        where: { bookingId: bookingId },
        data: { bookingStatusId: 2 },
      });
    }

    // Create payment
    const payment = await prisma.payment.create({
      data: {
        amountPaid: amount,
        paymentStatusId: paymentStatusRecord.statusId,
        bookingId: bookingId,
        staffId: performedBy ? parseInt(performedBy.replace("STF-", "")) || null : null,
      },
    });

    // Create transaction (OR record)
    await prisma.transaction.create({
      data: {
        receiptNumber: orNumber,
        paymentDate: new Date(),
        recordedBy: performedByName || "LTOO",
        bookingId: bookingId,
        paymentId: payment.paymentId,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: "PAYMENT_RECORDED",
        targetUserId: `PAY-${payment.paymentId}`,
        targetName: clientName,
        performedById: performedBy || "LTOO",
        performedByName: performedByName || "Local Treasury Operations Officer",
        details: `Payment of ${amount} recorded. OR: ${orNumber}. Status: ${statusToUse}`,
      },
    });

    return NextResponse.json({ success: true, paymentId: payment.paymentId });
  } catch (error) {
    console.error("Payments POST error:", error);
    return NextResponse.json(
      { error: "Failed to record payment" },
      { status: 500 }
    );
  }
}