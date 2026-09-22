/**
 * Re-hash legacy plain-text passwords so those accounts can sign in again.
 *
 * Background: the Auth.js login only accepts bcrypt hashes. Rows seeded with
 * plain-text values (e.g. "pass321") fail bcrypt.compare and are silently
 * locked out. This script finds them and stores a bcrypt hash of the SAME
 * value, so the owner can sign in with their existing password.
 *
 * Run:  node scripts/hash-legacy-passwords.mjs
 *
 * NOTE: re-hashing does not make an old weak password strong. Afterwards,
 * ask those users to change it (or reset it from Admin > User Management).
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const isHashed = (value) => typeof value === "string" && value.startsWith("$2");

async function main() {
  const [clients, staff] = await Promise.all([
    prisma.client.findMany({
      select: { clientId: true, email: true, password: true },
    }),
    prisma.staff.findMany({
      select: { staffId: true, email: true, password: true },
    }),
  ]);

  let fixed = 0;

  for (const row of clients) {
    if (isHashed(row.password)) continue;
    const hashed = await bcrypt.hash(row.password, 10);
    await prisma.client.update({
      where: { clientId: row.clientId },
      data: { password: hashed },
    });
    fixed += 1;
    console.log(`Client ${row.clientId} (${row.email}): legacy password re-hashed`);
  }

  for (const row of staff) {
    if (isHashed(row.password)) continue;
    const hashed = await bcrypt.hash(row.password, 10);
    await prisma.staff.update({
      where: { staffId: row.staffId },
      data: { password: hashed },
    });
    fixed += 1;
    console.log(`Staff ${row.staffId} (${row.email}): legacy password re-hashed`);
  }

  console.log(`\nDone. ${fixed} legacy password(s) re-hashed.`);
  console.log("Those accounts still use their old (weak) password - have them change it, or reset it from Admin > User Management.");
}

main()
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
