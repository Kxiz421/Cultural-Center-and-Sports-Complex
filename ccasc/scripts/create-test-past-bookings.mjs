/**
 * Creates 5 already-ended Cultural Center reservations for deposit-pullout
 * testing. Each is fully paid (50% down + 10% deposit + balance) and carries a
 * "Held" deposit with the full 10% remaining, so the LTOO can pull it out.
 *
 * Safe to re-run: each booking is tagged with a marker in its notes and skipped
 * if it already exists.
 *
 * Usage: node scripts/create-test-past-bookings.mjs
 */
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: (() => {
        const raw = process.env.DATABASE_URL || "";
        if (!raw) return raw;
        const q = raw.indexOf("?");
        const base = q === -1 ? raw : raw.slice(0, q);
        const params = new URLSearchParams(q === -1 ? "" : raw.slice(q + 1));
        if (!params.has("connect_timeout")) params.set("connect_timeout", "60");
        if (!params.has("pool_timeout")) params.set("pool_timeout", "60");
        if (!params.has("connection_limit")) params.set("connection_limit", "3");
        const query = params.toString();
        return query ? `${base}?${query}` : base;
      })(),
    },
  },
});

const MARKER = "TEST-DEPOSIT-PULLOUT";
const CULTURAL_CENTER_VENUE_ID = 1;
const BASE_AMOUNT = 20000;
const PAYABLE = Math.round(BASE_AMOUNT * 1.1 * 100) / 100;
const DEPOSIT = Math.round(BASE_AMOUNT * 0.1 * 100) / 100;

const DATES = [
  "2026-01-15",
  "2026-02-20",
  "2026-03-12",
  "2026-04-08",
  "2026-05-25",
];
const EVENT_TYPES = [
  "TEST — Wedding Reception",
  "TEST — Birthday Celebration",
  "TEST — Corporate Seminar",
  "TEST — Barangay Assembly",
  "TEST — Cultural Show",
];

async function getOrCreate(model, where, create) {
  const existing = await prisma[model].findFirst({ where });
  if (existing) return existing;
  return prisma[model].create({ data: create });
}

async function main() {
  const client =
    (await prisma.client.findFirst({
      where: { clientRoleId: "PUB", accountStatus: "Active" },
      orderBy: { clientId: "asc" },
    })) ||
    (await prisma.client.findFirst({ orderBy: { clientId: "asc" } }));
  if (!client) throw new Error("No client found to own the test reservations.");

  const timeSlot = await prisma.timeSlot.findFirst({ orderBy: { timeSlotId: "asc" } });
  if (!timeSlot) throw new Error("No TimeSlot row found.");

  const bookingStatus = await getOrCreate(
    "bookingStatus",
    { status: "Confirmed" },
    { status: "Confirmed" }
  );
  const paymentStatus = await getOrCreate(
    "paymentStatus",
    { status: "Fully Paid" },
    { status: "Fully Paid" }
  );
  const heldStatus = await getOrCreate(
    "depositStatus",
    { status: "Held" },
    { status: "Held" }
  );

  console.log(`Client: ${client.firstName} ${client.lastName} (CLT-${client.clientId})`);
  console.log(`TimeSlot: ${timeSlot.timeSlotId}\n`);

  for (let i = 0; i < DATES.length; i += 1) {
    const tag = `${MARKER} #${i + 1}`;
    const existing = await prisma.reservation.findFirst({
      where: { notes: { contains: tag } },
      select: { reservationId: true },
    });
    if (existing) {
      console.log(`#${i + 1} already exists → RES-${existing.reservationId}`);
      continue;
    }

    const date = new Date(`${DATES[i]}T00:00:00.000Z`);

    const reservation = await prisma.reservation.create({
      data: {
        venueId: CULTURAL_CENTER_VENUE_ID,
        eventType: EVENT_TYPES[i],
        eventDate: date,
        timeSlotId: timeSlot.timeSlotId,
        clientId: client.clientId,
        reservationStatus: "Confirmed",
        eventStatus: "Completed",
        totalAmount: BASE_AMOUNT,
        submittedAt: new Date(`${DATES[i]}T00:00:00.000Z`),
        notes: `${tag} — seeded test booking for deposit pullout testing.`,
      },
    });

    const booking = await prisma.booking.create({
      data: {
        reservationId: reservation.reservationId,
        bookingStatusId: bookingStatus.bookingStatusId,
        confirmationDate: new Date(`${DATES[i]}T00:00:00.000Z`),
      },
    });

    const payment = await prisma.payment.create({
      data: {
        amountPaid: PAYABLE,
        paymentStatusId: paymentStatus.statusId,
        bookingId: booking.bookingId,
        baseAmount: BASE_AMOUNT,
        discountAmount: 0,
        amountAfterDiscount: PAYABLE,
      },
    });

    const deposit = await prisma.deposit.create({
      data: {
        bookingId: booking.bookingId,
        requiredAmount: DEPOSIT,
        amountPaid: DEPOSIT,
        amountAfterDeductions: DEPOSIT,
        depositStatusId: heldStatus.depositStatusId,
        paymentId: payment.paymentId,
        notes: tag,
      },
    });

    await prisma.transaction.create({
      data: {
        receiptNumber: "",
        paymentDate: new Date(`${DATES[i]}T00:00:00.000Z`),
        recordedBy: "Seed (test)",
        paymentId: payment.paymentId,
        depositId: deposit.depositId,
        entryType: "payment",
      },
    });

    console.log(
      `#${i + 1} created → RES-${reservation.reservationId} | ${DATES[i]} | paid ₱${PAYABLE} | deposit ₱${DEPOSIT} (Held)`
    );
  }

  console.log("\nDone.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
