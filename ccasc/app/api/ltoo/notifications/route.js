import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { noCacheJson } from "@/lib/api-cache-control";

import { requireApiAuth, actingAs } from "@/lib/api-auth";
export const dynamic = "force-dynamic";


export async function GET(request) {
  const guard = await requireApiAuth(["local treasury operations officer","admin"]);
  if (guard.response) return guard.response;

  try {
    const { searchParams } = new URL(request.url);
    const history = searchParams.get("history");

    if (history === "true") {
      // Return notification history
      const notifications = await prisma.notification.findMany({
        orderBy: { sentAt: "desc" },
        take: 100,
      });
      return noCacheJson(notifications);
    }

    // Return bookings with completed payments that can be notified
    const bookings = await prisma.booking.findMany({
      where: {
        bookingStatusId: 2, // Booked/Confirmed
      },
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
            venue: { select: { venue: true } },
          },
        },
        payments: {
          include: { status: { select: { status: true } } },
        },
        notifications: {
          select: { notificationId: true, sentAt: true },
          take: 1,
          orderBy: { sentAt: "desc" },
        },
      },
      orderBy: { bookingId: "desc" },
    });

    const mapped = bookings.map((b) => {
      const client = b.reservation?.client;
      const isProvincial = client?.clientRole?.clientRoleId === "PROV";
      const paymentCompleted = b.payments?.some(
        (p) => p.status?.status === "Fully Paid"
      );
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
          ? b.reservation.eventDate.toISOString().split("T")[0]
          : "",
        venue: b.reservation?.venue?.venue,
        paymentCompleted,
        notified: b.notifications && b.notifications.length > 0,
        notifiedAt: b.notifications?.[0]?.sentAt,
      };
    });

    // Only show bookings with completed payments
    const filtered = mapped.filter((b) => b.paymentCompleted);

    return noCacheJson(filtered);
  } catch (error) {
    console.error("Notifications GET error:", error);
    return noCacheJson(
      { error: "Failed to load notifications data" },
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
    const { bookingId, clientType, clientId, staffId } = body;

    if (!bookingId) {
      return NextResponse.json(
        { error: "Booking ID is required" },
        { status: 400 }
      );
    }

    // Find the booking to get client and reservation info
    const booking = await prisma.booking.findUnique({
      where: { bookingId: parseInt(bookingId) },
      include: {
        reservation: {
          include: {
            client: {
              select: { clientId: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const actualClientId = booking.reservation?.client?.clientId || parseInt(clientId) || 1;
    const clientName = booking.reservation?.client
      ? `${booking.reservation.client.firstName} ${booking.reservation.client.lastName}`
      : "Client";

    // Create notification for the client
    await prisma.notification.create({
      data: {
        message: `Your documents (Certification and Contract of Lease) are ready for release. Booking #${bookingId}.`,
        type: "Document Release",
        isRead: false,
        sentAt: new Date(),
        staffId: parseInt(staffId) || 1,
        clientId: actualClientId,
      },
    });

    // If provincial, also create notification for agency
    if (clientType === "provincial") {
      // Send to all staff with provincial agency role? For now just log
      await prisma.auditLog.create({
        data: {
          action: "NOTIFICATION_SENT",
          targetUserId: `BKG-${bookingId}`,
          targetName: clientName,
          performedById: acting.performedBy,
          performedByName: acting.performedByName,
          details: `Notification sent to provincial agency: ${clientName} for booking #${bookingId}`,
        },
      });
    }

    // Log the notification
    await prisma.auditLog.create({
      data: {
        action: "NOTIFICATION_SENT",
        targetUserId: `BKG-${bookingId}`,
        targetName: clientName,
        performedById: acting.performedBy,
        performedByName: acting.performedByName,
        details: `Document release notification sent to ${clientName}`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Notifications POST error:", error);
    return NextResponse.json(
      { error: "Failed to send notification" },
      { status: 500 }
    );
  }
}