import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const byPayment = await prisma.$executeRawUnsafe(
    `UPDATE Transaction t
     INNER JOIN Deposit d ON d.payment_id = t.payment_id
     SET t.deposit_id = d.deposit_id
     WHERE t.deposit_id IS NULL`
  );
  const byBooking = await prisma.$executeRawUnsafe(
    `UPDATE Transaction t
     INNER JOIN Deposit d ON d.booking_id = t.booking_id
     SET t.deposit_id = d.deposit_id
     WHERE t.deposit_id IS NULL`
  );
  console.log("Backfill complete:", { byPayment, byBooking });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
