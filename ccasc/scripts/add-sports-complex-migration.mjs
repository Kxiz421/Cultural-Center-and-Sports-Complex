/**
 * CSASC – Add Sports Complex facilities with quantities (capacity).
 * Run: node scripts/add-sports-complex-migration.mjs
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

const SPORTS_COMPLEX_VENUE_ID = 2;
const STATUS_AVAILABLE = 1;

async function upsertFacility(name, description, capacity, rateId) {
  const existing = await prisma.facility.findFirst({
    where: { facilityName: name, venueId: SPORTS_COMPLEX_VENUE_ID },
  });
  if (existing) {
    await prisma.facility.update({
      where: { facilityId: existing.facilityId },
      data: { capacity, description: description || existing.description, rateId },
    });
    console.log(`  ✓ Updated "${name}" → capacity=${capacity}`);
  } else {
    await prisma.facility.create({
      data: {
        facilityName: name,
        description: description || "",
        capacity,
        rateId,
        statusId: STATUS_AVAILABLE,
        venueId: SPORTS_COMPLEX_VENUE_ID,
      },
    });
    console.log(`  ✓ Created "${name}" → capacity=${capacity}`);
  }
}
async function getOrCreateRate(dayRate, nightRate) {
  let rate = await prisma.facilityRate.findFirst({
    where: { dayRate, nightRate },
  });
  if (rate) {
    console.log(`  → Using existing rate_id=${rate.rateId} (₱${Number(dayRate).toLocaleString()}/₱${Number(nightRate).toLocaleString()})`);
    return rate.rateId;
  }
  rate = await prisma.facilityRate.create({
    data: { dayRate, nightRate },
  });
  console.log(`  → Created new rate_id=${rate.rateId} (₱${Number(dayRate).toLocaleString()}/₱${Number(nightRate).toLocaleString()})`);
  return rate.rateId;
}

async function main() {
  console.log("\n=== Sports Complex Facility Quantity Migration ===\n");

  // 1. Create/update FacilityRate entries
  console.log("Step 1: Ensuring FacilityRate entries exist...");
  const rate500 = await getOrCreateRate(500, 500);
  const rate1000 = await getOrCreateRate(1000, 1000);
  const rate1200 = await getOrCreateRate(1200, 1200);
  const rate1500 = await getOrCreateRate(1500, 1500);
  const rate1700 = await getOrCreateRate(1700, 1700);
  const rate2200 = await getOrCreateRate(2200, 2200);
  const rate2500 = await getOrCreateRate(2500, 2500);
  const rate3000 = await getOrCreateRate(3000, 3000);

  // Update all Sports Complex facility rates to have night_rate=0
  // so pricing is always the day rate regardless of time slot
  console.log("\nStep 1b: Normalizing rates — setting night_rate=0 for all Sports Complex facility rates...");
  const scRates = await prisma.facility.findMany({
    where: { venueId: SPORTS_COMPLEX_VENUE_ID },
    select: { rateId: true },
    distinct: ["rateId"],
  });
  const scRateIds = [...new Set(scRates.map((f) => f.rateId))];
  for (const rid of scRateIds) {
    await prisma.facilityRate.update({
      where: { rateId: rid },
      data: { nightRate: 0 },
    });
  }
  console.log(`  ✓ Updated ${scRateIds.length} rate(s): night_rate → 0 (single daily rate only)`);
  console.log("\nStep 2: Adding/updating facilities with quantities...");
  await upsertFacility("Track Oval", "Used for jogging or sprints", 1, rate3000);
  await upsertFacility("Swimming Pool", "Olympic-size swimming pool for aquatic events and competitions", 1, rate2500);
  await upsertFacility("Softball Field", "Standard softball field for tournaments and practice sessions", 1, rate500);
  await upsertFacility("Football Field", "Regulation football field for matches and training", 1, rate500);
  await upsertFacility("Volleyball Court", "Volleyball court with net for games and tournaments", 2, rate500);
  await upsertFacility("Tennis Court", "Tennis court with professional surface for matches", 3, rate500);
  await upsertFacility("Concrete Grandstand", "Concrete grandstand seating for spectators with roof cover", 1, rate1200);
  await upsertFacility("Concrete Grandstand (with Lights)", "Concrete grandstand with lighting system for evening events", 1, rate1700);
  await upsertFacility("Concrete Grandstand (with Sounds)", "Concrete grandstand with sound system for events", 1, rate2200);
  await upsertFacility("Wooden Grandstand", "Wooden grandstand seating for spectators", 2, rate500);
  await upsertFacility("Wooden Grandstand (with Lights)", "Wooden grandstand with lighting system for evening events", 2, rate1000);
  await upsertFacility("Wooden Grandstand (with Sounds)", "Wooden grandstand with sound system for events", 2, rate1500);
  await upsertFacility("Outside Lights & Sound System", "Outdoor lighting and sound system for night events and performances", 1, rate1000);
// 3. Update existing Basketball Court & Boxing Ring capacities
  console.log("\nStep 3: Adding/updating existing facilities...");
  const basketball = await prisma.facility.findFirst({
    where: { facilityName: "Basketball Court", venueId: SPORTS_COMPLEX_VENUE_ID },
  });
  if (basketball) {
    await prisma.facility.update({
      where: { facilityId: basketball.facilityId },
      data: { capacity: 1 },
    });
    console.log('  ✓ Updated "Basketball Court" → capacity=1');
  }

  const boxingRing = await prisma.facility.findFirst({
    where: { facilityName: "Boxing Ring", venueId: SPORTS_COMPLEX_VENUE_ID },
  });
  if (boxingRing) {
    await prisma.facility.update({
      where: { facilityId: boxingRing.facilityId },
      data: { capacity: 1 },
    });
    console.log('  ✓ Updated "Boxing Ring" → capacity=1');
  }

  // 4. Verify
  console.log("\nStep 4: Verification — Sports Complex facilities:");
  const allFacilities = await prisma.facility.findMany({
    where: { venueId: SPORTS_COMPLEX_VENUE_ID },
    include: { rate: true },
    orderBy: { facilityId: "asc" },
  });
  let totalQty = 0;
  for (const f of allFacilities) {
    const qty = f.capacity || 0;
    totalQty += qty;
    console.log(
      "  " + f.facilityName.padEnd(40) +
      " qty=" + String(qty).padEnd(3) +
      " rate=₱" + Number(f.rate.dayRate).toLocaleString() + "/day"
    );
  }
  console.log("\n✅ Migration complete! " + allFacilities.length + " facilities, " + totalQty + " total units.");
}

main()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());