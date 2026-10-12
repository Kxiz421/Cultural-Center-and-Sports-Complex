/**
 * Adds the nullable `active_session` column to Staff and Client for
 * single-session login. Idempotent: checks INFORMATION_SCHEMA before ALTER-ing,
 * so it is safe to run more than once.
 *
 * Run: node scripts/apply-active-session.mjs
 * Then: npx prisma generate
 */
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const here = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(here, "../.env") });

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

const TABLES = ["Staff", "Client"];
const COLUMN = "active_session";

async function hasColumn(table) {
  const rows = await prisma.$queryRaw`
    SELECT COUNT(*) AS n
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ${table}
      AND COLUMN_NAME = ${COLUMN}
  `;
  return Number(rows[0]?.n ?? 0) > 0;
}

async function main() {
  console.log("\n=== Add active_session for single-session login ===\n");
  for (const table of TABLES) {
    if (await hasColumn(table)) {
      console.log(`  \u2713 ${table}.${COLUMN} already exists`);
      continue;
    }
    await prisma.$executeRawUnsafe(
      `ALTER TABLE \`${table}\` ADD COLUMN \`${COLUMN}\` VARCHAR(64) NULL`
    );
    console.log(`  \u2705 Added ${table}.${COLUMN}`);
  }
  console.log("\n\u2714 Migration complete. Next: npx prisma generate\n");
}

main()
  .catch((err) => {
    console.error("Migration failed:", err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
