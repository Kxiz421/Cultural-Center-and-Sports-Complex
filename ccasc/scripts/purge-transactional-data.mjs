/**
 * Removes ALL transactional data (reservations, bookings, payments, deposits,
 * transactions, documents, schedules tied to reservations, reschedule
 * requests, notifications, audit logs, stock movements, OTPs) while keeping
 * the catalog and account data: Staff, Client, facilities, venues, packages,
 * particulars, inventory, lookups/statuses and CalendarBlock holidays.
 *
 * Destructive. Run a backup first: node scripts/backup-db.mjs
 * Run: node scripts/purge-transactional-data.mjs
 */
import { existsSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const prisma = new PrismaClient();

function ensureBackupExists() {
  const dir = join(__dirname, "../backups");
  if (!existsSync(dir)) return false;
  return readdirSync(dir).some((file) => file.endsWith(".sql"));
}

async function main() {
  if (!ensureBackupExists()) {
    console.error(
      "No backup found in ccasc/backups. Run `node scripts/backup-db.mjs` first."
    );
    process.exitCode = 1;
    return;
  }

  const before = {
    reservations: await prisma.reservation.count(),
    bookings: await prisma.booking.count(),
    payments: await prisma.payment.count(),
    deposits: await prisma.deposit.count(),
    transactions: await prisma.transaction.count(),
    documents: await prisma.document.count(),
    notifications: await prisma.notification.count(),
    auditLogs: await prisma.auditLog.count(),
    particularTransactions: await prisma.particularTransaction.count(),
  };
  console.log("Before:", before);

  const deleted = await prisma.$transaction(
    async (tx) => {
      const out = {};
      out.rescheduleDateChange = (await tx.rescheduleDateChange.deleteMany({})).count;
      out.rescheduleRequest = (await tx.rescheduleRequest.deleteMany({})).count;
      out.transaction = (await tx.transaction.deleteMany({})).count;
      out.depositDeduction = (await tx.depositDeduction.deleteMany({})).count;
      out.document = (await tx.document.deleteMany({})).count;
      out.schedule = (
        await tx.schedule.deleteMany({
          where: {
            OR: [{ reservationId: { not: null } }, { bookingId: { not: null } }],
          },
        })
      ).count;
      out.deposit = (await tx.deposit.deleteMany({})).count;
      out.payment = (await tx.payment.deleteMany({})).count;
      out.reservedParticular = (await tx.reservedParticular.deleteMany({})).count;
      out.reservationDate = (await tx.reservationDate.deleteMany({})).count;
      out.letterStatus = (await tx.letterStatus.deleteMany({})).count;
      out.booking = (await tx.booking.deleteMany({})).count;
      out.reservation = (await tx.reservation.deleteMany({})).count;
      out.notification = (await tx.notification.deleteMany({})).count;
      out.auditLog = (await tx.auditLog.deleteMany({})).count;
      out.particularTransaction = (
        await tx.particularTransaction.deleteMany({})
      ).count;
      out.registrationOtp = (await tx.registrationOtp.deleteMany({})).count;
      return out;
    },
    { timeout: 180000, maxWait: 30000 }
  );

  console.log("Deleted:", deleted);
  console.log("After:", {
    reservations: await prisma.reservation.count(),
    bookings: await prisma.booking.count(),
    payments: await prisma.payment.count(),
    deposits: await prisma.deposit.count(),
    facilities: await prisma.facility.count(),
    particulars: await prisma.particular.count(),
    inventory: await prisma.inventory.count(),
    packages: await prisma.package.count(),
    calendarBlocks: await prisma.calendarBlock.count(),
  });
  console.log("\nCatalog and holiday calendar blocks left intact.");
}

main()
  .catch((err) => {
    console.error("Purge failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
