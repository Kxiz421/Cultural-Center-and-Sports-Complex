import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const CULTURAL_VENUE_IDS = [1];

export async function GET() {
  try {
    const requests = await prisma.rescheduleRequest.findMany({
      where: {
        reservation: {
          venueId: { in: CULTURAL_VENUE_IDS },
        },
      },
      include: {
        reservation: {
          include: {
            venue: { select: { venue: true } },
            client: { select: { firstName: true, lastName: true, clientId: true, clientRole: { select: { roleName: true } } } },
            timeSlot: { select: { startTime: true, endTime: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = requests.map((req) => ({
      id: req.rescheduleId,
      clientName: `${req.reservation.client.firstName} ${req.reservation.client.lastName}`,
      clientId: req.reservation.client.clientId,
      clientType: req.reservation.client.clientRole?.roleName || "N/A",
      venue: req.reservation.venue.venue,
      eventType: req.reservation.eventType,
      currentDate: req.reservation.eventDate.toISOString().split("T")[0],
      requestedDate: req.requestedDate.toISOString().split("T")[0],
      reason: req.reason,
      status: req.status,
      declineReason: req.declineReason || null,
      timeSlot: `${req.reservation.timeSlot.startTime} - ${req.reservation.timeSlot.endTime}`,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Failed to fetch reschedule requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch reschedule requests" },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const { requestId, action, declineReason } = await request.json();

    if (!requestId || !action) {
      return NextResponse.json(
        { error: "requestId and action are required" },
        { status: 400 }
      );
    }

    const id = parseInt(requestId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid requestId" }, { status: 400 });
    }

    if (action === "approve") {
      // Get the reschedule request
      const rescheduleReq = await prisma.rescheduleRequest.findUnique({
        where: { rescheduleId: id },
        include: {
          reservation: {
            include: {
              client: { select: { clientId: true, firstName: true, lastName: true } },
              venue: { select: { venue: true } },
            },
          },
        },
      });

      if (!rescheduleReq) {
        return NextResponse.json({ error: "Request not found" }, { status: 404 });
      }

      // Update the reservation's event date
      await prisma.reservation.update({
        where: { reservationId: rescheduleReq.reservationId },
        data: { eventDate: rescheduleReq.requestedDate },
      });

      // Update the request status
      await prisma.rescheduleRequest.update({
        where: { rescheduleId: id },
        data: { status: "Approved" },
      });

      // Send notification to client
      const oldDate = rescheduleReq.reservation.eventDate.toISOString().split("T")[0];
      const newDate = rescheduleReq.requestedDate.toISOString().split("T")[0];
      await prisma.notification.create({
        data: {
          clientId: rescheduleReq.reservation.client.clientId,
          staffId: 1,
          message: `Your reschedule request for "${rescheduleReq.reservation.eventType}" at ${rescheduleReq.reservation.venue.venue} has been APPROVED. Event rescheduled from ${oldDate} to ${newDate}.`,
          type: "reschedule",
          sentAt: new Date(),
        },
      });

      return NextResponse.json({ success: true, message: "Reschedule approved" });
    } else if (action === "decline") {
      // Get the reschedule request
      const rescheduleReq = await prisma.rescheduleRequest.findUnique({
        where: { rescheduleId: id },
        include: {
          reservation: {
            include: {
              client: { select: { clientId: true, firstName: true, lastName: true } },
              venue: { select: { venue: true } },
            },
          },
        },
      });

      if (!rescheduleReq) {
        return NextResponse.json({ error: "Request not found" }, { status: 404 });
      }

      // Update the request status with decline reason
      const updateData = { status: "Declined" };
      if (declineReason) {
        updateData.declineReason = declineReason;
      }
      await prisma.rescheduleRequest.update({
        where: { rescheduleId: id },
        data: updateData,
      });

      // Send notification to client
      const declineMsg = declineReason
        ? `Your reschedule request for "${rescheduleReq.reservation.eventType}" at ${rescheduleReq.reservation.venue.venue} has been DECLINED.\n\nReason: ${declineReason}`
        : `Your reschedule request for "${rescheduleReq.reservation.eventType}" at ${rescheduleReq.reservation.venue.venue} has been DECLINED.`;
      await prisma.notification.create({
        data: {
          clientId: rescheduleReq.reservation.client.clientId,
          staffId: 1,
          message: declineMsg,
          type: "reschedule",
          sentAt: new Date(),
        },
      });

      return NextResponse.json({ success: true, message: "Reschedule declined" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Failed to update reschedule request:", error);
    return NextResponse.json(
      { error: "Failed to update reschedule request" },
      { status: 500 }
    );
  }
}