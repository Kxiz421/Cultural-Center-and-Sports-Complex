import prisma from "../lib/prisma.js";

async function main() {
  try {
    await prisma.$executeRawUnsafe(
      "ALTER TABLE Document ADD COLUMN event_date DATE NULL"
    );
    console.log("Added Document.event_date");
  } catch (err) {
    const message = String(err?.message || err);
    if (/Duplicate column name|already exists/i.test(message)) {
      console.log("Document.event_date already exists");
    } else {
      throw err;
    }
  }

  const result = await prisma.$executeRawUnsafe(`
    UPDATE Document d
    INNER JOIN Booking b ON d.booking_id = b.booking_id
    INNER JOIN Reservation r ON b.reservation_id = r.reservation_id
    SET d.event_date = r.event_date
    WHERE d.event_date IS NULL
  `);
  console.log("Backfilled existing documents:", result);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
