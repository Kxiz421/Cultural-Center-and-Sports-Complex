import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import prisma from "../lib/prisma.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlPath = join(__dirname, "../backups/restore-dates.sql");
const sql = readFileSync(sqlPath, "utf8");
const statements = sql
  .split("\n")
  .map((l) => l.trim())
  .filter((l) => l.startsWith("UPDATE"));

console.log(`Applying ${statements.length} date restore statements...`);
let ok = 0;
let fail = 0;
for (const stmt of statements) {
  try {
    await prisma.$executeRawUnsafe(stmt);
    ok++;
  } catch (e) {
    fail++;
    console.error("Failed:", stmt.slice(0, 80), e.message);
  }
}
console.log(`Done. success=${ok} failed=${fail}`);

const sample = await prisma.$queryRawUnsafe(
  "SELECT reservation_id, event_date, event_type FROM Reservation ORDER BY reservation_id LIMIT 10"
);
for (const r of sample) {
  console.log(`#${r.reservation_id} ${String(r.event_date).slice(0, 10)} ${String(r.event_type).slice(0, 30)}`);
}

await prisma.$disconnect();
