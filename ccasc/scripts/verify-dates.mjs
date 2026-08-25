import prisma from "../lib/prisma.js";
async function main() {
  const r = await prisma.$queryRawUnsafe("SELECT reservation_id, event_date, event_type FROM Reservation ORDER BY reservation_id LIMIT 10");
  for (const x of r) {
    console.log("#" + x.reservation_id + " " + String(x.event_date).substring(0, 12) + " " + String(x.event_type).substring(0, 30));
  }
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });