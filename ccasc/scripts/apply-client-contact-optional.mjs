/**
 * Makes Client.email and Client.contact_number nullable so a registrant only
 * needs to provide (and verify) one of the two. Idempotent: each column is only
 * altered when it is still NOT NULL.
 *
 * Usage: node scripts/apply-client-contact-optional.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function withRetry(label, fn, attempts = 6) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === attempts) throw err;
      console.warn(
        `${label} attempt ${attempt} failed (${err.code || err.message}); retrying...`
      );
      await prisma.$disconnect().catch(() => {});
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
  return undefined;
}

const TARGETS = [
  { column: "email", ddl: "ALTER TABLE Client MODIFY email VARCHAR(150) NULL" },
  {
    column: "contact_number",
    ddl: "ALTER TABLE Client MODIFY contact_number VARCHAR(20) NULL",
  },
];

async function main() {
  await withRetry("connect", () => prisma.$queryRaw`SELECT 1 as ok`);
  console.log("Connected.");

  const columns = await withRetry("inspect", () =>
    prisma.$queryRawUnsafe(
      "SELECT COLUMN_NAME, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS " +
        "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Client' " +
        "AND COLUMN_NAME IN ('email', 'contact_number')"
    )
  );
  const nullable = Object.fromEntries(
    columns.map((row) => [row.COLUMN_NAME, row.IS_NULLABLE === "YES"])
  );

  for (const { column, ddl } of TARGETS) {
    if (nullable[column]) {
      console.log(`${column} is already nullable - skipping.`);
      continue;
    }
    console.log(`Altering ${column} to NULL...`);
    await withRetry("alter", () => prisma.$executeRawUnsafe(ddl));
  }

  const after = await withRetry("verify", () =>
    prisma.$queryRawUnsafe(
      "SELECT COLUMN_NAME, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS " +
        "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Client' " +
        "AND COLUMN_NAME IN ('email', 'contact_number')"
    )
  );
  console.log("Columns now:", after);
  console.log("Done.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
