/**
 * Seeds the Philippine holidays as calendar blocks — the same records the
 * admin "Add Holiday / Maintenance" form creates, so they appear on every
 * panel's calendar and keep the venues unbookable.
 *
 * Run: node scripts/seed-philippines-holidays.mjs
 *
 * 2026 comes from Proclamation No. 1006 (s. 2025); 2027 from the list supplied
 * for this project. Eid'l Fitr and Eid'l Adha are deliberately omitted for both
 * years: they are proclaimed separately once the Islamic dates are determined.
 *
 * Idempotent — a date that already has a Holiday block for a venue is skipped,
 * so re-running never duplicates anything.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** 1 = South Cotabato Gymnasium and Cultural Center, 2 = Sports Complex. */
const VENUE_IDS = [1, 2];

const HOLIDAYS = [
  // ---- 2026 (Proclamation No. 1006) -------------------------------------
  { date: "2026-01-01", title: "New Year's Day", notes: "Regular Holiday" },
  { date: "2026-02-17", title: "Chinese New Year", notes: "Special Non-Working Day" },
  {
    date: "2026-02-25",
    title: "EDSA People Power Revolution Anniversary",
    notes: "Special Working Day",
  },
  { date: "2026-04-02", title: "Maundy Thursday", notes: "Regular Holiday" },
  { date: "2026-04-03", title: "Good Friday", notes: "Regular Holiday" },
  { date: "2026-04-04", title: "Black Saturday", notes: "Special Non-Working Day" },
  {
    date: "2026-04-09",
    title: "Araw ng Kagitingan (Day of Valor)",
    notes: "Regular Holiday",
  },
  { date: "2026-05-01", title: "Labor Day", notes: "Regular Holiday" },
  { date: "2026-06-12", title: "Independence Day", notes: "Regular Holiday" },
  { date: "2026-08-21", title: "Ninoy Aquino Day", notes: "Special Non-Working Day" },
  { date: "2026-08-31", title: "National Heroes Day", notes: "Regular Holiday" },
  { date: "2026-11-01", title: "All Saints' Day", notes: "Special Non-Working Day" },
  { date: "2026-11-02", title: "All Souls' Day", notes: "Special Non-Working Day" },
  { date: "2026-11-30", title: "Bonifacio Day", notes: "Regular Holiday" },
  {
    date: "2026-12-08",
    title: "Feast of the Immaculate Conception of Mary",
    notes: "Special Non-Working Day",
  },
  { date: "2026-12-24", title: "Christmas Eve", notes: "Special Non-Working Day" },
  { date: "2026-12-25", title: "Christmas Day", notes: "Regular Holiday" },
  { date: "2026-12-30", title: "Rizal Day", notes: "Regular Holiday" },
  { date: "2026-12-31", title: "Last Day of the Year", notes: "Special Non-Working Day" },

  // ---- 2027 -------------------------------------------------------------
  { date: "2027-01-01", title: "New Year's Day", notes: "Regular Holiday" },
  { date: "2027-02-06", title: "Chinese New Year", notes: "Special Non-Working Day" },
  {
    date: "2027-02-25",
    title: "EDSA People Power Revolution Anniversary",
    notes: "Special Working Day",
  },
  { date: "2027-03-25", title: "Maundy Thursday", notes: "Regular Holiday" },
  { date: "2027-03-26", title: "Good Friday", notes: "Regular Holiday" },
  { date: "2027-03-27", title: "Black Saturday", notes: "Special Non-Working Day" },
  {
    date: "2027-04-09",
    title: "Araw ng Kagitingan (Day of Valor)",
    notes: "Regular Holiday",
  },
  { date: "2027-05-01", title: "Labor Day", notes: "Regular Holiday" },
  { date: "2027-06-12", title: "Independence Day", notes: "Regular Holiday" },
  { date: "2027-08-21", title: "Ninoy Aquino Day", notes: "Special Non-Working Day" },
  { date: "2027-08-30", title: "National Heroes Day", notes: "Regular Holiday" },
  { date: "2027-11-01", title: "All Saints' Day", notes: "Special Non-Working Day" },
  { date: "2027-11-02", title: "All Souls' Day", notes: "Special Non-Working Day" },
  { date: "2027-11-30", title: "Bonifacio Day", notes: "Regular Holiday" },
  {
    date: "2027-12-08",
    title: "Feast of the Immaculate Conception of Mary",
    notes: "Special Non-Working Day",
  },
  { date: "2027-12-24", title: "Christmas Eve", notes: "Special Non-Working Day" },
  { date: "2027-12-25", title: "Christmas Day", notes: "Regular Holiday" },
  { date: "2027-12-30", title: "Rizal Day", notes: "Regular Holiday" },
  { date: "2027-12-31", title: "Last Day of the Year", notes: "Special Non-Working Day" },
];

async function main() {
  let created = 0;
  let skipped = 0;

  for (const holiday of HOLIDAYS) {
    // Midnight UTC, exactly how the calendar-blocks API stores a picked date.
    const blockDate = new Date(holiday.date);

    for (const venueId of VENUE_IDS) {
      const existing = await prisma.calendarBlock.findFirst({
        where: { blockDate, blockType: "Holiday", venueId },
        select: { blockId: true },
      });

      if (existing) {
        skipped += 1;
        continue;
      }

      await prisma.calendarBlock.create({
        data: {
          title: holiday.title,
          blockDate,
          blockType: "Holiday",
          venueId,
          notes: holiday.notes,
        },
      });
      created += 1;
      console.log(`created : ${holiday.date}  ${holiday.title}  (venue ${venueId})`);
    }
  }

  console.log(
    `\n${HOLIDAYS.length} holidays x ${VENUE_IDS.length} venues — created ${created}, skipped ${skipped}.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
