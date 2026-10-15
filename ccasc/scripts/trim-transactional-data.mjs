/**
 * Trims the transactional tables down to their newest 5 rows each.
 *
 * Run: node scripts/trim-transactional-data.mjs
 *
 * Kept: Staff, Client, all lookup/status tables, Facility/FacilityRate/
 * FacilityVenue/FacilityImage, Package/PackageInclusion, Inventory, Particular,
 * ParticularTransaction and — importantly — every CalendarBlock (the seeded
 * 2026/2027 holidays).
 *
 * Survivors are chosen parent-first so nothing is left pointing at a deleted
 * row: the newest 5 reservations, then the newest 5 bookings that belong to
 * them, then the newest 5 payments/deposits of those bookings, and so on.
 * Schedule rows are only removed when they point at a deleted reservation or
 * booking — the standing per-venue facility schedules (both keys NULL) stay.
 *
 * Deletes run inside one transaction, so a failure mid-way changes nothing.
 * Take a backup first: node scripts/backup-db.mjs
 */
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

function buildDatabaseUrl() {
  const raw = process.env.DATABASE_URL || "";
  if (!raw) return raw;
  const qIndex = raw.indexOf("?");
  const base = qIndex === -1 ? raw : raw.slice(0, qIndex);
  const params = new URLSearchParams(qIndex === -1 ? "" : raw.slice(qIndex + 1));
  if (!params.has("connect_timeout")) params.set("connect_timeout", "60");
  if (!params.has("pool_timeout")) params.set("pool_timeout", "60");
  if (!params.has("connection_limit")) params.set("connection_limit", "3");
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

const prisma = new PrismaClient({
  datasources: { db: { url: buildDatabaseUrl() } },
});

const KEEP = 5;

async function withRetry(label, fn, attempts = 4) {
  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      console.warn(`${label} attempt ${i}/${attempts} failed: ${err.code || err.message}`);
      await new Promise((r) => setTimeout(r, 1500 * i));
    }
  }
  throw lastErr;
}

/** Ids of the newest `take` rows of a model, newest first. */
const newestIds = async (delegate, field, where = {}, take = KEEP) =>
  (
    await delegate.findMany({
      where,
      orderBy: { [field]: "desc" },
      take,
      select: { [field]: true },
    })
  ).map((row) => row[field]);

const MODELS = {
  reservation: (c) => c.reservation,
  booking: (c) => c.booking,
  payment: (c) => c.payment,
  transaction: (c) => c.transaction,
  document: (c) => c.document,
  schedule: (c) => c.schedule,
  reservedParticular: (c) => c.reservedParticular,
  reservationDate: (c) => c.reservationDate,
  rescheduleRequest: (c) => c.rescheduleRequest,
  rescheduleDateChange: (c) => c.rescheduleDateChange,
  deposit: (c) => c.deposit,
  depositDeduction: (c) => c.depositDeduction,
  announcement: (c) => c.announcement,
  auditLog: (c) => c.auditLog,
  notification: (c) => c.notification,
};

async function countAll(client) {
  const entries = await Promise.all(
    Object.entries(MODELS).map(async ([name, pick]) => [name, await pick(client).count()])
  );
  return Object.fromEntries(entries);
}

async function main() {
  await withRetry("connect", () => prisma.$queryRaw`SELECT 1`);

  const before = await withRetry("count-before", () => countAll(prisma));
  console.log("Before:", before);

  // --- choose survivors, parents first -----------------------------------
  const keptReservations = await newestIds(prisma.reservation, "reservationId");
  const keptBookings = await newestIds(prisma.booking, "bookingId", {
    reservationId: { in: keptReservations },
  });
  const keptPayments = await newestIds(prisma.payment, "paymentId", {
    bookingId: { in: keptBookings },
  });
  const keptDeposits = await newestIds(prisma.deposit, "depositId", {
    bookingId: { in: keptBookings },
  });
  const keptReservationDates = await newestIds(prisma.reservationDate, "reservationDateId", {
    reservationId: { in: keptReservations },
  });
  const keptReschedules = await newestIds(prisma.rescheduleRequest, "rescheduleId", {
    reservationId: { in: keptReservations },
  });
  const keptRescheduleChanges = await newestIds(
    prisma.rescheduleDateChange,
    "rescheduleDateChangeId",
    { rescheduleId: { in: keptReschedules } }
  );
  const keptTransactions = await newestIds(prisma.transaction, "transactionId", {
    OR: [{ paymentId: { in: keptPayments } }, { depositId: { in: keptDeposits } }],
  });
  const keptReservedParticulars = await newestIds(prisma.reservedParticular, "reservedParticularId", {
    reservationId: { in: keptReservations },
  });
  const keptDocuments = await newestIds(prisma.document, "documentId", {
    OR: [{ bookingId: { in: keptBookings } }, { bookingId: null }],
  });
  const keptAnnouncements = await newestIds(prisma.announcement, "announcementId");
  const keptAuditLogs = await newestIds(prisma.auditLog, "auditLogId");
  const keptNotifications = await newestIds(prisma.notification, "notificationId");

  // A kept deposit may reference a payment that is not itself in the newest 5;
  // protect it so the FK holds.
  const depositPayments = (
    await prisma.deposit.findMany({
      where: { depositId: { in: keptDeposits }, paymentId: { not: null } },
      select: { paymentId: true },
    })
  ).map((d) => d.paymentId);
  const protectedPayments = [...new Set([...keptPayments, ...depositPayments])];

  console.log("\nKeeping (newest):", {
    reservations: keptReservations,
    bookings: keptBookings,
    payments: keptPayments,
    deposits: keptDeposits,
    transactions: keptTransactions,
  });

  const deleted = await withRetry("trim", () =>
    prisma.$transaction(
      async (tx) => {
        const out = {};

        // children -> parents, each step only removing what nothing kept needs
        out.rescheduleDateChange = (
          await tx.rescheduleDateChange.deleteMany({
            where: { rescheduleDateChangeId: { notIn: keptRescheduleChanges } },
          })
        ).count;

        out.rescheduleRequest = (
          await tx.rescheduleRequest.deleteMany({
            where: { rescheduleId: { notIn: keptReschedules } },
          })
        ).count;

        out.transaction = (
          await tx.transaction.deleteMany({
            where: { transactionId: { notIn: keptTransactions } },
          })
        ).count;

        out.depositDeduction = (
          await tx.depositDeduction.deleteMany({
            where: { depositId: { notIn: keptDeposits } },
          })
        ).count;

        out.document = (
          await tx.document.deleteMany({
            where: { documentId: { notIn: keptDocuments } },
          })
        ).count;

        // Standing venue schedules (both keys NULL) survive; only rows pointing
        // at a reservation/booking we just deleted go.
        out.schedule = (
          await tx.schedule.deleteMany({
            where: {
              OR: [
                { reservationId: { notIn: keptReservations } },
                { bookingId: { notIn: keptBookings } },
              ],
            },
          })
        ).count;

        out.deposit = (
          await tx.deposit.deleteMany({
            where: { depositId: { notIn: keptDeposits } },
          })
        ).count;

        out.payment = (
          await tx.payment.deleteMany({
            where: { paymentId: { notIn: protectedPayments } },
          })
        ).count;

        out.reservedParticular = (
          await tx.reservedParticular.deleteMany({
            where: { reservedParticularId: { notIn: keptReservedParticulars } },
          })
        ).count;

        out.reservationDate = (
          await tx.reservationDate.deleteMany({
            where: { reservationDateId: { notIn: keptReservationDates } },
          })
        ).count;

        out.booking = (
          await tx.booking.deleteMany({
            where: { bookingId: { notIn: keptBookings } },
          })
        ).count;

        out.reservation = (
          await tx.reservation.deleteMany({
            where: { reservationId: { notIn: keptReservations } },
          })
        ).count;

        out.announcement = (
          await tx.announcement.deleteMany({
            where: { announcementId: { notIn: keptAnnouncements } },
          })
        ).count;

        out.auditLog = (
          await tx.auditLog.deleteMany({
            where: { auditLogId: { notIn: keptAuditLogs } },
          })
        ).count;

        out.notification = (
          await tx.notification.deleteMany({
            where: { notificationId: { notIn: keptNotifications } },
          })
        ).count;

        return out;
      },
      { timeout: 120000, maxWait: 30000 }
    )
  );

  const after = await withRetry("count-after", () => countAll(prisma));
  console.log("\nDeleted:", deleted);
  console.log("After:", after);
  console.log("\nCatalog/user data and calendar blocks left intact.");
}

main()
  .catch((err) => {
    console.error("Failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
