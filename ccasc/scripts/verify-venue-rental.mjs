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
  if (!params.has("connect_timeout")) params.set("connect_timeout", "30");
  if (!params.has("pool_timeout")) params.set("pool_timeout", "30");
  if (!params.has("connection_limit")) params.set("connection_limit", "3");
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

const prisma = new PrismaClient({
  datasources: { db: { url: buildDatabaseUrl() } },
});

async function main() {
  const particulars = await prisma.particular.findMany({
    where: { particularName: { contains: "Venue Rental" } },
    include: { inventory: true }
  });
  console.log("=== Venue Rental Particulars ===");
  for (const p of particulars) {
    const cost = p.inventory?.unitCost ? Number(p.inventory.unitCost) : 0;
    const qty = p.inventory?.quantityAvailable || 0;
    console.log(`  ID=${p.particularId} | "${p.particularName}" | \u20B1${cost.toLocaleString()} | qty=${qty}`);
  }
  console.log(`\nTotal: ${particulars.length} venue rental items`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });