/**
 * Clears reservation transactional data (and dependent bookings/payments).
 * Leaves users, packages, particulars, facilities, and lookup tables intact.
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

async function countAll() {
  const [
    reservations,
    reservationDates,
    reservedParticulars,
    bookings,
    payments,
    transactions,
    documents,
    schedules,
    rescheduleRequests,
    letterStatuses,
  ] = await Promise.all([
    prisma.reservation.count(),
    prisma.reservationDate.count(),
    prisma.reservedParticular.count(),
    prisma.booking.count(),
    prisma.payment.count(),
    prisma.transaction.count(),
    prisma.document.count(),
    prisma.schedule.count(),
    prisma.rescheduleRequest.count(),
    prisma.letterStatus.count(),
  ]);
  return {
    reservations,
    reservationDates,
    reservedParticulars,
    bookings,
    payments,
    transactions,
    documents,
    schedules,
    rescheduleRequests,
    letterStatuses,
  };
}

async function main() {
  console.log("Connecting…");
  await withRetry("connect", () => prisma.$queryRaw`SELECT 1`);

  const before = await withRetry("count", countAll);
  console.log("Before:", before);

  // Delete in FK-safe order (children → parents)
  const deleted = {};
  deleted.transactions = (
    await withRetry("transactions", () => prisma.transaction.deleteMany({}))
  ).count;
  deleted.payments = (
    await withRetry("payments", () => prisma.payment.deleteMany({}))
  ).count;
  deleted.documents = (
    await withRetry("documents", () =>
      prisma.document.deleteMany({ where: { bookingId: { not: null } } })
    )
  ).count;
  deleted.schedules = (
    await withRetry("schedules", () => prisma.schedule.deleteMany({}))
  ).count;
  deleted.rescheduleRequests = (
    await withRetry("rescheduleRequests", () => prisma.rescheduleRequest.deleteMany({}))
  ).count;
  deleted.letterStatuses = (
    await withRetry("letterStatuses", () => prisma.letterStatus.deleteMany({}))
  ).count;
  deleted.bookings = (
    await withRetry("bookings", () => prisma.booking.deleteMany({}))
  ).count;
  deleted.reservedParticulars = (
    await withRetry("reservedParticulars", () => prisma.reservedParticular.deleteMany({}))
  ).count;
  deleted.reservationDates = (
    await withRetry("reservationDates", () => prisma.reservationDate.deleteMany({}))
  ).count;
  deleted.reservations = (
    await withRetry("reservations", () => prisma.reservation.deleteMany({}))
  ).count;

  const after = await withRetry("count-after", countAll);
  console.log("Deleted:", deleted);
  console.log("After:", after);
  console.log("Done. Catalog/user data left intact.");
}

main()
  .catch((err) => {
    console.error("Failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
