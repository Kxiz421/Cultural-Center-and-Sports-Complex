import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Send notification
export async function POST(request) {
  try {
    const { userId, clientId, staffId, message, type } = await request.json();

    if (!message || (!userId && !clientId && !staffId)) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const notification = await prisma.notification.create({
      data: {
        message,
        type: type || "General",
        staffId: staffId || (userId || null),
        clientId: clientId || (userId || null),
        sentAt: new Date(),
      },
    });

    return NextResponse.json(notification, { status: 201 });
  } catch (error) {
    console.error("Notification creation error:", error);
    return NextResponse.json(
      { error: "Failed to create notification" },
      { status: 500 }
    );
  }
}

// Get notifications for a client
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    const staffId = searchParams.get("staffId");

    let whereClause = {};
    if (clientId) whereClause.clientId = parseInt(clientId, 10);
    if (staffId) whereClause.staffId = parseInt(staffId, 10);

    const notifications = await prisma.notification.findMany({
      where: whereClause,
      orderBy: { sentAt: "desc" },
      take: 50,
    });

    const formatted = notifications.map((n) => ({
      id: n.notificationId,
      message: n.message,
      type: n.type,
      isRead: n.isRead,
      sentAt: n.sentAt.toISOString(),
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Notification fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

// Mark notification as read
export async function PUT(request) {
  try {
    const { notificationId } = await request.json();

    if (!notificationId) {
      return NextResponse.json(
        { error: "Notification ID required" },
        { status: 400 }
      );
    }

    const notification = await prisma.notification.update({
      where: { notificationId: parseInt(notificationId, 10) },
      data: { isRead: true },
    });

    return NextResponse.json(notification);
  } catch (error) {
    console.error("Notification update error:", error);
    return NextResponse.json(
      { error: "Failed to update notification" },
      { status: 500 }
    );
  }
}