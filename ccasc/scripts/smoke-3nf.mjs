import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const prisma = new PrismaClient();

async function main() {
  const checks = {};

  checks.transactions = await prisma.transaction.findMany({
    take: 5,
    include: {
      payment: {
        include: {
          booking: {
            include: { reservation: { select: { venueId: true, eventType: true } } },
          },
        },
      },
      deposit: { select: { depositId: true } },
    },
  });

  checks.bookings = await prisma.booking.findMany({
    take: 5,
    include: {
      reservation: { select: { venueId: true, venue: { select: { venue: true } } } },
    },
  });

  checks.documents = await prisma.document.findMany({
    take: 5,
    select: { documentId: true, documentStatus: true, bookingId: true },
  });

  checks.schedules = await prisma.schedule.findMany({
    take: 5,
    include: {
      reservation: { select: { clientId: true } },
      booking: { include: { reservation: { select: { clientId: true } } } },
    },
  });

  const sampleTx = checks.transactions[0];
  const sampleBk = checks.bookings[0];
  const sampleDoc = checks.documents[0];
  const sampleSk = checks.schedules[0];

  console.log(
    JSON.stringify(
      {
        ok: true,
        counts: {
          transactions: checks.transactions.length,
          bookings: checks.bookings.length,
          documents: checks.documents.length,
          schedules: checks.schedules.length,
        },
        sample: {
          transactionHasNoBookingId: sampleTx ? !("bookingId" in sampleTx) : true,
          bookingVenueFromReservation: sampleBk?.reservation?.venueId ?? null,
          documentStatus: sampleDoc?.documentStatus ?? null,
          scheduleClient:
            sampleSk?.reservation?.clientId ??
            sampleSk?.booking?.reservation?.clientId ??
            null,
        },
      },
      null,
      2
    )
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
