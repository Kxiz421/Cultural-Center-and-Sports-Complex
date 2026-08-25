import prisma from "../lib/prisma.js";

async function main() {
  const rows = await prisma.$queryRawUnsafe(
    "SELECT reservation_id, event_date, CAST(event_date AS CHAR) AS event_date_str, event_type FROM Reservation ORDER BY reservation_id LIMIT 20"
  );
  for (const x of rows) {
    console.log(
      JSON.stringify({
        id: x.reservation_id,
        event_date: x.event_date,
        event_date_str: x.event_date_str,
        event_type: String(x.event_type).slice(0, 40),
      })
    );
  }

  const counts = await prisma.$queryRawUnsafe(
    "SELECT event_date, COUNT(*) AS cnt FROM Reservation GROUP BY event_date ORDER BY cnt DESC LIMIT 15"
  );
  console.log("--- date distribution ---");
  for (const c of counts) {
    console.log(JSON.stringify(c));
  }

  await prisma.$disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
