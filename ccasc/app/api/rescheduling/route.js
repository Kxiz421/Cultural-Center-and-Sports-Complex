import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Submit a reschedule request
export async function POST(request) {
  try {
    const { reservationId, requestedDate, reason } = await request.json();

    if (!reservationId || !requestedDate || !reason) {
      return NextResponse.json(
        { error: "Missing required fields: reservationId, requestedDate, reason" },
        { status: 400 }
      );
    }

    const reservation = await prisma.reservation.findUnique({
      where: { reservationId: parseInt(reservationId, 10) },
    });

    if (!reservation) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }

    // Check if request is at least 7 days before event
    const eventDate = new Date(reservation.eventDate);
    const today = new Date();
    const daysDiff = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));

    if (daysDiff < 7) {
      return NextResponse.json(
        { error: "Rescheduling must be requested at least 7 days before the event" },
        { status: 400 }
      );
    }

    // Create reschedule request
    const rescheduleRequest = await prisma.rescheduleRequest.create({
      data: {
        reservationId: parseInt(reservationId, 10),
        requestedDate: new Date(requestedDate),
        reason,
        status: "Pending",
      },
    });

    return NextResponse.json({
      id: rescheduleRequest.rescheduleId,
      message: "Rescheduling request submitted successfully",
    }, { status: 201 });
  } catch (error) {
    console.error("Reschedule request error:", error);
    return NextResponse.json(
      { error: "Failed to submit rescheduling request" },
      { status: 500 }
    );
  }
}

// Update reschedule request status (staff only)
export async function PUT(request) {
  try {
    const { rescheduleId, status } = await request.json();

    if (!rescheduleId || !status) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const updateData = { status };

    // If approved, update the reservation date
    if (status === "Approved") {
      const existing = await prisma.rescheduleRequest.findUnique({
        where: { rescheduleId: parseInt(rescheduleId, 10) },
      });

      if (existing) {
        await prisma.reservation.update({
          where: { reservationId: existing.reservationId },
          data: { eventDate: existing.requestedDate },
        });
      }
    }

    const rescheduleRequest = await prisma.rescheduleRequest.update({
      where: { rescheduleId: parseInt(rescheduleId, 10) },
      data: updateData,
    });

    return NextResponse.json(rescheduleRequest);
  } catch (error) {
    console.error("Reschedule update error:", error);
    return NextResponse.json(
      { error: "Failed to update rescheduling request" },
      { status: 500 }
    );
  }
}

// Get reschedule requests
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const reservationId = searchParams.get("reservationId");

    if (!reservationId) {
      return NextResponse.json(
        { error: "Reservation ID required" },
        { status: 400 }
      );
    }

    const requests = await prisma.rescheduleRequest.findMany({
      where: { reservationId: parseInt(reservationId, 10) },
      orderBy: { createdAt: "desc" },
    });

    const formatted = requests.map((r) => ({
      id: r.rescheduleId,
      reservationId: r.reservationId,
      requestedDate: r.requestedDate.toISOString().split("T")[0],
      reason: r.reason,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Reschedule fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch rescheduling requests" },
      { status: 500 }
    );
  }
}