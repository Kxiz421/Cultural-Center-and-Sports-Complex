/**
 * Sync existing Cultural Center facilities to Venue Rental inventory/particulars
 * Run: node scripts/sync-venue-rental.mjs
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

const CULTURAL_CENTER_VENUE_ID = 1;

async function syncFacilityToVenueRental(facility, rate) {
  const dayRate = Number(rate?.dayRate ?? 0);
  if (dayRate <= 0) return;
  const particularName = `Venue Rental – ${facility.facilityName}`;
  let particular = await prisma.particular.findFirst({ where: { particularName } });
  if (!particular) {
    particular = await prisma.particular.create({
      data: { particularName, description: facility.description || `Venue rental for ${facility.facilityName}`, statusId: facility.statusId },
    });
  }
  let inventory = await prisma.inventory.findFirst({
    where: { itemName: particularName, venueId: CULTURAL_CENTER_VENUE_ID },
  });
  if (!inventory) {
    inventory = await prisma.inventory.create({
      data: { itemName: particularName, unitCost: dayRate, quantityAvailable: facility.capacity || 1, venueId: CULTURAL_CENTER_VENUE_ID, statusId: facility.statusId },
    });
  } else {
    await prisma.inventory.update({
      where: { itemId: inventory.itemId },
      data: { unitCost: dayRate, quantityAvailable: facility.capacity || 1, statusId: facility.statusId },
    });
  }
  // Link Particular to Inventory
  if (!particular.itemId || particular.itemId !== inventory.itemId) {
    await prisma.particular.update({
      where: { particularId: particular.particularId },
      data: { itemId: inventory.itemId },
    });
  }
  console.log(`  \u2713 Synced "${particularName}" \u2192 unitCost=\u20B1${dayRate.toLocaleString()}, qty=${facility.capacity || 1}`);
}

async function main() {
  console.log("\n=== Sync Cultural Center Facilities \u2192 Venue Rental ===\n");
  const facilities = await prisma.facility.findMany({
    where: { venueId: CULTURAL_CENTER_VENUE_ID, statusId: 1 },
    include: { rate: true },
  });
  console.log(`Found ${facilities.length} active Cultural Center facilities\n`);
  for (const f of facilities) {
    console.log(`Processing: ${f.facilityName} (day_rate=\u20B1${Number(f.rate?.dayRate ?? 0).toLocaleString()})`);
    await syncFacilityToVenueRental(f, f.rate);
  }
  console.log("\n\u2714 Sync complete!");
}

main()
  .catch((err) => { console.error("Sync failed:", err); process.exit(1); })
  .finally(() => prisma.$disconnect());