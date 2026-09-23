import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { noCacheJson } from "@/lib/api-cache-control";
import { requireApiAuth, actingAs } from "@/lib/api-auth";
import {
  ANNOUNCEMENT_NOTIFICATION_TYPE,
  ANNOUNCEMENT_STATUS,
  createAnnouncement,
} from "@/lib/announcements";

export const dynamic = "force-dynamic";

/** Announcement history, newest first. */
export async function GET() {
  const guard = await requireApiAuth(["admin"]);
  if (guard.response) return guard.response;

  try {
    const [announcements, deliveries] = await Promise.all([
      prisma.announcement.findMany({
        orderBy: { datePosted: "desc" },
        include: {
          status: { select: { status: true } },
          staff: { select: { firstName: true, lastName: true } },
        },
      }),
      // Every fan-out row of one announcement shares its `sentAt`, so one
      // grouped query yields the "notified" column for the history.
      prisma.notification.groupBy({
        by: ["sentAt"],
        where: { type: ANNOUNCEMENT_NOTIFICATION_TYPE },
        _count: { _all: true },
      }),
    ]);

    const deliveredBySentAt = new Map(
      deliveries.map((row) => [row.sentAt.getTime(), row._count._all])
    );

    const formatted = announcements.map((announcement) => ({
      id: announcement.announcementId,
      title: announcement.title,
      content: announcement.content,
      recipientType: announcement.recipientType,
      postedAt: announcement.datePosted.toISOString(),
      status: announcement.status?.status ?? "Active",
      archived: announcement.statusId === ANNOUNCEMENT_STATUS.ARCHIVED,
      authorName: announcement.staff
        ? `${announcement.staff.firstName} ${announcement.staff.lastName}`.trim()
        : "Unknown",
      notified: deliveredBySentAt.get(announcement.datePosted.getTime()) ?? 0,
    }));

    return noCacheJson(formatted);
  } catch (error) {
    console.error("Failed to fetch announcements:", error);
    return noCacheJson(
      { error: "Failed to fetch announcements" },
      { status: 500 }
    );
  }
}

/** Post an announcement and deliver it to the selected audience. */
export async function POST(request) {
  const guard = await requireApiAuth(["admin"]);
  if (guard.response) return guard.response;
  const acting = actingAs(guard.user);

  try {
    const body = await request.json();
    const title = String(body.title ?? "").trim();
    const content = String(body.message ?? body.content ?? "").trim();

    if (!title || !content) {
      return NextResponse.json(
        { error: "A title and a message are both required." },
        { status: 400 }
      );
    }
    if (title.length > 255) {
      return NextResponse.json(
        { error: "The title must be 255 characters or fewer." },
        { status: 400 }
      );
    }

    const result = await createAnnouncement({
      title,
      content,
      roles: Array.isArray(body.roles) ? body.roles.map(String) : [],
      clientIds: Array.isArray(body.clientIds) ? body.clientIds : [],
      staffIds: Array.isArray(body.staffIds) ? body.staffIds : [],
      authorStaffId: acting.performedBy,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    await prisma.auditLog.create({
      data: {
        action: "ANNOUNCEMENT_POSTED",
        targetUserId: `ANN-${result.announcementId}`,
        targetName: title,
        performedById: acting.performedBy,
        performedByName: acting.performedByName,
        details: `Announcement "${title}" sent to ${result.notificationCount} recipient(s) (${result.recipientType}).`,
      },
    });

    return NextResponse.json(
      {
        success: true,
        id: result.announcementId,
        recipientType: result.recipientType,
        notified: result.notificationCount,
        clientRecipients: result.clientRecipientCount,
        staffRecipients: result.staffRecipientCount,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to post announcement:", error);
    return NextResponse.json(
      { error: "Failed to post the announcement" },
      { status: 500 }
    );
  }
}

/** Archive or restore an announcement (history is always retained). */
export async function PUT(request) {
  const guard = await requireApiAuth(["admin"]);
  if (guard.response) return guard.response;
  const acting = actingAs(guard.user);

  try {
    const body = await request.json();
    const announcementId = Number.parseInt(body.announcementId, 10);

    if (!Number.isInteger(announcementId)) {
      return NextResponse.json(
        { error: "A valid announcementId is required." },
        { status: 400 }
      );
    }

    const restore = body.action === "restore";

    const existing = await prisma.announcement.findUnique({
      where: { announcementId },
      select: { announcementId: true, title: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Announcement not found" },
        { status: 404 }
      );
    }

    await prisma.announcement.update({
      where: { announcementId },
      data: {
        statusId: restore
          ? ANNOUNCEMENT_STATUS.ACTIVE
          : ANNOUNCEMENT_STATUS.ARCHIVED,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: restore ? "ANNOUNCEMENT_RESTORED" : "ANNOUNCEMENT_ARCHIVED",
        targetUserId: `ANN-${announcementId}`,
        targetName: existing.title,
        performedById: acting.performedBy,
        performedByName: acting.performedByName,
        details: `Announcement "${existing.title}" ${
          restore ? "restored to the active feed" : "archived"
        }.`,
      },
    });

    return NextResponse.json({ success: true, archived: !restore });
  } catch (error) {
    console.error("Failed to update announcement:", error);
    return NextResponse.json(
      { error: "Failed to update the announcement" },
      { status: 500 }
    );
  }
}
