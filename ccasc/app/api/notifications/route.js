import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isCoordinatorInboxNotification } from "@/lib/panel-notifications";
import { getProgramCoordinatorStaffIds } from "@/lib/coordinator-notifications";
import { noCacheJson } from "@/lib/api-cache-control";


import { requireApiAuth, resolveClientScope, isClientRole } from "@/lib/api-auth";
// Send notification
export async function POST(request) {
  const guard = await requireApiAuth();
  if (guard.response) return guard.response;

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
  const guard = await requireApiAuth();
  if (guard.response) return guard.response;

  try {
    const { searchParams } = new URL(request.url);
    // Client-role sessions can only ever read their own notifications.
    const scopedClient = isClientRole(guard.user);
    const clientId = resolveClientScope(guard.user, searchParams.get("clientId"));
    const staffId = scopedClient ? null : searchParams.get("staffId");
    const scope = searchParams.get("scope");

    let whereClause = {};
    if (clientId) {
      whereClause.clientId = clientId;
      // Staff-targeted rows (addressed to a Program Coordinator) can sit on the
      // same client; keep them out of the client's own inbox.
      const coordinatorIds = await getProgramCoordinatorStaffIds();
      if (coordinatorIds.length > 0) {
        whereClause.staffId = { notIn: coordinatorIds };
      }
    }
    if (staffId) whereClause.staffId = parseInt(staffId, 10);

    const keyOf = (n) => `${n.type || ""}\u0000${n.message || ""}`;

    if (searchParams.get("unreadCountOnly") === "true") {
      if (clientId) {
        const parsedClientId = parseInt(clientId, 10);
        if (isNaN(parsedClientId)) {
          return noCacheJson({ unreadCount: 0 });
        }
        const coordinatorIds = await getProgramCoordinatorStaffIds();
        const unread = await prisma.notification.findMany({
          where: {
            clientId: parsedClientId,
            isRead: false,
            ...(coordinatorIds.length > 0
              ? { staffId: { notIn: coordinatorIds } }
              : {}),
          },
          select: { type: true, message: true },
        });
        return noCacheJson({ unreadCount: new Set(unread.map(keyOf)).size });
      }
      if (staffId) {
        const unread = await prisma.notification.findMany({
          where: { staffId: parseInt(staffId, 10), isRead: false },
          select: { type: true, message: true },
        });
        const visibleUnread =
          scope === "coordinator"
            ? unread.filter(isCoordinatorInboxNotification)
            : unread;
        return noCacheJson({ unreadCount: new Set(visibleUnread.map(keyOf)).size });
      }
    }

    const notifications = await prisma.notification.findMany({
      where: whereClause,
      orderBy: { sentAt: "desc" },
      take: scope === "coordinator" ? 150 : 50,
    });

    const visible =
      scope === "coordinator"
        ? notifications.filter(isCoordinatorInboxNotification).slice(0, 50)
        : notifications;

    // The same event can be written more than once (e.g. a document approved
    // repeatedly), so collapse identical items into a single entry.
    const grouped = new Map();
    for (const n of visible) {
      const key = keyOf(n);
      const existing = grouped.get(key);
      if (existing) {
        if (!n.isRead) existing.isRead = false;
      } else {
        grouped.set(key, { ...n });
      }
    }

    const formatted = [...grouped.values()].map((n) => ({
      id: n.notificationId,
      message: n.message,
      type: n.type,
      isRead: n.isRead,
      sentAt: n.sentAt.toISOString(),
      link: n.link || null,
    }));

    return noCacheJson(formatted);
  } catch (error) {
    console.error("Notification fetch error:", error);
    return noCacheJson(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

// Mark notification as read
export async function PUT(request) {
  const guard = await requireApiAuth();
  if (guard.response) return guard.response;

  try {
    const { notificationId, markAllRead, clientId, staffId } = await request.json();

    if (markAllRead) {
      const where = { isRead: false };
      const scopedClient = resolveClientScope(guard.user, clientId);
      if (scopedClient !== null && scopedClient !== undefined && !isNaN(scopedClient)) {
        where.clientId = Number(scopedClient);
      } else if (staffId) {
        where.staffId = parseInt(staffId, 10);
      } else {
        return NextResponse.json(
          { error: "Recipient required" },
          { status: 400 }
        );
      }
      const result = await prisma.notification.updateMany({
        where,
        data: { isRead: true },
      });
      return NextResponse.json({ updated: result.count });
    }

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