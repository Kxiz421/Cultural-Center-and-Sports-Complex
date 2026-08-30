import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { formatDbDate } from "@/lib/utils";
import {
  applyRescheduleDateChanges,
  formatRescheduleDateChanges,
} from "@/lib/reschedule-utils";
import { createClientNotification } from "@/lib/coordinator-notifications";

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
        dateChanges: {
          orderBy: [{ isPrimary: "desc" }, { originalDate: "asc" }],
        },
        reservation: {
          include: {
            venue: { select: { venue: true } },
            client: {
              select: {
                firstName: true,
                lastName: true,
                clientId: true,
                clientRole: { select: { roleName: true } },
              },
            },
            timeSlot: { select: { startTime: true, endTime: true } },
            additionalDates: { select: { eventDate: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = requests.map((req) => {
      const dateChanges = formatRescheduleDateChanges(
        req,
        req.reservation.eventDate
      );
      const currentDates = [
        formatDbDate(req.reservation.eventDate),
        ...req.reservation.additionalDates.map((ad) => formatDbDate(ad.eventDate)),
      ];

      return {
        id: req.rescheduleId,
        clientName: `${req.reservation.client.firstName} ${req.reservation.client.lastName}`,
        clientId: req.reservation.client.clientId,
        clientType: req.reservation.client.clientRole?.roleName || "N/A",
        venue: req.reservation.venue.venue,
        eventType: req.reservation.eventType,
        currentDate: formatDbDate(req.reservation.eventDate),
        currentDates,
        requestedDate: formatDbDate(req.requestedDate),
        dateChanges,
        reason: req.reason,
        status: req.status,
        declineReason: req.declineReason || null,
        timeSlot: `${req.reservation.timeSlot.startTime} - ${req.reservation.timeSlot.endTime}`,
      };
    });

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
      const result = await applyRescheduleDateChanges(id);
      if (result.error) {
        return NextResponse.json(
          {
            error: result.error,
            conflictDates: result.conflictDates,
          },
          { status: result.status || 400 }
        );
      }

      const rescheduleReq = result.existing;
      const pairs = (result.dateChanges || [])
        .map((c) => `${c.originalDate} → ${c.requestedDate}`)
        .join("; ");

      await createClientNotification({
        clientId: rescheduleReq.reservation.client.clientId,
        type: "reschedule",
        message: `Your reschedule request for "${rescheduleReq.reservation.eventType}" at ${rescheduleReq.reservation.venue.venue} has been APPROVED. Date change(s): ${pairs}.`,
      });

      return NextResponse.json({ success: true, message: "Reschedule approved" });
    }

    if (action === "decline") {
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

      const updateData = { status: "Declined" };
      if (declineReason) {
        updateData.declineReason = declineReason;
      }
      await prisma.rescheduleRequest.update({
        where: { rescheduleId: id },
        data: updateData,
      });

      const declineMsg = declineReason
        ? `Your reschedule request for "${rescheduleReq.reservation.eventType}" at ${rescheduleReq.reservation.venue.venue} has been DECLINED.\n\nReason: ${declineReason}`
        : `Your reschedule request for "${rescheduleReq.reservation.eventType}" at ${rescheduleReq.reservation.venue.venue} has been DECLINED.`;
      await createClientNotification({
        clientId: rescheduleReq.reservation.client.clientId,
        type: "reschedule",
        message: declineMsg,
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
