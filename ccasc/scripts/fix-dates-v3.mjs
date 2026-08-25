import prisma from "../lib/prisma.js";

const MONTHS = { Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
  Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12" };

function parseDate(str) {
  if (!str) return null;
  const parts = String(str).split(" ");
  if (parts.length >= 4 && MONTHS[parts[1]]) {
    return parts[3] + "-" + MONTHS[parts[1]] + "-" + parts[2].padStart(2, "0");
  }
  return null;
}

async function main() {
  const reservations = await prisma.$queryRawUnsafe("SELECT reservation_id, event_date, submitted_at FROM Reservation");
  console.log("Total reservations: " + reservations.length);
  let fixed = 0;
  for (const row of reservations) {
    const ed = String(row.event_date);
    const sa = String(row.submitted_at);
    if (ed.includes("GMT")) {
      const nd = parseDate(ed);
      if (nd) { await prisma.$executeRawUnsafe("UPDATE Reservation SET event_date = ? WHERE reservation_id = ?", nd, row.reservation_id); fixed++; }
    }
    if (sa.includes("GMT")) {
      const nd = parseDate(sa);
      if (nd) { await prisma.$executeRawUnsafe("UPDATE Reservation SET submitted_at = ? WHERE reservation_id = ?", nd, row.reservation_id); }
    }
  }
  console.log("Fixed reservations: " + fixed);

  // Fix ReservationDate
  const resDates = await prisma.$queryRawUnsafe("SELECT reservation_date_id, event_date FROM ReservationDate");
  let fixedRd = 0;
  for (const rd of resDates) {
    const d = String(rd.event_date);
    if (d.includes("GMT")) {
      const nd = parseDate(d);
      if (nd) { await prisma.$executeRawUnsafe("UPDATE ReservationDate SET event_date = ? WHERE reservation_date_id = ?", nd, rd.reservation_date_id); fixedRd++; }
    }
  }
  console.log("Fixed ReservationDate: " + fixedRd);

  // Fix Booking confirmation dates
  const bookings = await prisma.$queryRawUnsafe("SELECT booking_id, confirmation_date FROM Booking");
  let fixedBk = 0;
  for (const b of bookings) {
    const d = String(b.confirmation_date);
    if (d.includes("GMT")) {
      const nd = parseDate(d);
      if (nd) { await prisma.$executeRawUnsafe("UPDATE Booking SET confirmation_date = ? WHERE booking_id = ?", nd, b.booking_id); fixedBk++; }
    }
  }
  console.log("Fixed Booking: " + fixedBk);

  // Fix Transaction payment dates
  const txns = await prisma.$queryRawUnsafe("SELECT transaction_id, payment_date FROM `Transaction`");
  let fixedTx = 0;
  for (const t of txns) {
    const d = String(t.payment_date);
    if (d.includes("GMT")) {
      const nd = parseDate(d);
      if (nd) { await prisma.$executeRawUnsafe("UPDATE `Transaction` SET payment_date = ? WHERE transaction_id = ?", nd, t.transaction_id); fixedTx++; }
    }
  }
  console.log("Fixed Transaction: " + fixedTx);

  // Fix all other tables with date columns
  const otherChecks = [
    ["LetterStatus", "updated_at"],
    ["Announcement", "date_posted"],
    ["AuditLog", "created_at"],
    ["Notification", "sent_at"],
    ["RescheduleRequest", "created_at"],
    ["RescheduleRequest", "updated_at"],
    ["RescheduleRequest", "requested_date"],
    ["CalendarBlock", "created_at"],
    ["CalendarBlock", "block_date"],
    ["Document", "submitted_at"],
  ];
  for (const [table, col] of otherChecks) {
    try {
      const rows = await prisma.$queryRawUnsafe("SELECT * FROM `" + table + "` WHERE `" + col + "` LIKE '%GMT%'");
      for (const row of rows) {
        const d = String(row[col]);
        const nd = parseDate(d);
        if (nd) {
          const idCol = Object.keys(row).find(k => k.endsWith("_id") || k.endsWith("Id"));
          if (idCol) {
            await prisma.$executeRawUnsafe("UPDATE `" + table + "` SET `" + col + "` = ? WHERE `" + idCol + "` = ?", nd, row[idCol]);
          }
        }
      }
      if (rows.length > 0) console.log("Fixed " + rows.length + " " + table + "." + col);
    } catch (e) { /* skip */ }
  }

  console.log("All done!");
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });