/**
 * Read-only + round-trip check for the Announcements module.
 *
 * Verifies against the live database that:
 *   1. recipient groups resolve to the expected accounts,
 *   2. staff-targeted notifications can be stored with a NULL client_id,
 *   3. the history query (grouped fan-out counts) works.
 *
 * The round-trip rows created in step 2 are deleted again before exit.
 *
 * Usage: node --env-file=.env scripts/check-announcements.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CLIENT_FILTERS = {
  clients: { accountStatus: "Active", clientRoleId: { not: "PROV" } },
  "provincial-agencies": { accountStatus: "Active", clientRoleId: "PROV" },
};

const STAFF_ROLE_FILTERS = {
  "program-coordinators": ["Program Coordinator"],
  "accounting-clerks": ["Accounting Clerk"],
  "treasury-officers": ["Local Treasury Operations Officer"],
};

/** The Railway proxy drops connections now and then - retry a few times. */
async function withRetry(label, fn, attempts = 6) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === attempts) throw err;
      console.warn(`${label} attempt ${attempt} failed; retrying...`);
      await prisma.$disconnect().catch(() => {});
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
  return undefined;
}

async function main() {
  const counts = await withRetry("recipient counts", () =>
    Promise.all([
      ...Object.entries(CLIENT_FILTERS).map(async ([id, where]) => ({
        id,
        kind: "client",
        count: await prisma.client.count({ where: { OR: [where] } }),
      })),
      ...Object.entries(STAFF_ROLE_FILTERS).map(async ([id, roleNames]) => ({
        id,
        kind: "staff",
        count: await prisma.staff.count({
          where: {
            status: "Active",
            staffRole: { roleName: { in: roleNames } },
          },
        }),
      })),
    ])
  );

  console.log("=== Recipient groups ===");
  for (const group of counts) {
    console.log(`  ${group.id} (${group.kind}): ${group.count}`);
  }

  const clientIds = await withRetry("clients", () =>
    prisma.client.findMany({
      where: { OR: [CLIENT_FILTERS.clients] },
      select: { clientId: true },
      take: 2,
    })
  );
  const staffIds = await withRetry("staff", () =>
    prisma.staff.findMany({
      where: { status: "Active" },
      select: { staffId: true },
      take: 2,
    })
  );

  if (clientIds.length === 0 || staffIds.length === 0) {
    console.log("Not enough seeded accounts to run the round-trip check.");
    return;
  }

  // ---- Round-trip: store an announcement + fan-out rows, then clean up ----
  const sentAt = new Date();
  const marker = `__announcement_check_${sentAt.getTime()}__`;

  const announcement = await withRetry("announcement create", () =>
    prisma.announcement.create({
      data: {
        title: marker,
        content: "Round-trip check row - deleted immediately after.",
        recipientType: "All",
        datePosted: sentAt,
        staffId: staffIds[0].staffId,
        statusId: 1,
      },
    })
  );

  await withRetry("notification createMany", () =>
    prisma.notification.createMany({
      data: [
        ...clientIds.map((client) => ({
          message: marker,
          type: "Announcement",
          isRead: false,
          sentAt,
          staffId: staffIds[0].staffId,
          clientId: client.clientId,
        })),
        ...staffIds.map((staff) => ({
          message: marker,
          type: "Announcement",
          isRead: false,
          sentAt,
          staffId: staff.staffId,
          clientId: null, // staff-only row: no related client
        })),
      ],
    })
  );

  const [delivered, staffRow] = await withRetry("verify", () =>
    Promise.all([
      prisma.notification.count({ where: { message: marker } }),
      prisma.notification.findFirst({
        where: { message: marker, clientId: null },
        select: { notificationId: true, type: true, clientId: true },
      }),
    ])
  );

  const groups = await withRetry("history groupBy", () =>
    prisma.notification.groupBy({
      by: ["sentAt"],
      where: { type: "Announcement" },
      _count: { _all: true },
    })
  );
  const grouped = groups.find(
    (row) => row.sentAt.getTime() === sentAt.getTime()
  );

  console.log("\n=== Round trip ===");
  console.log(`  announcementId: ${announcement.announcementId}`);
  console.log(`  fan-out rows stored: ${delivered}`);
  console.log(`  staff row clientId: ${String(staffRow?.clientId)}`);
  console.log(`  history group count for this batch: ${grouped?._count?._all ?? 0}`);

  await withRetry("cleanup notifications", () =>
    prisma.notification.deleteMany({ where: { message: marker } })
  );
  await withRetry("cleanup announcement", () =>
    prisma.announcement.delete({ where: { announcementId: announcement.announcementId } })
  );

  const remaining = await withRetry("verify cleanup", () =>
    prisma.notification.count({ where: { message: marker } })
  );
  console.log(`  rows left after cleanup: ${remaining}`);
  console.log("\nOK");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
