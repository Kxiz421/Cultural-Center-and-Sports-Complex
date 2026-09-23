/**
 * Makes Notification.client_id nullable so an announcement can be delivered to
 * a staff role that has no related client record.
 *
 * Usage: node scripts/apply-notification-client-nullable.mjs
 */
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const prisma = new PrismaClient();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** The Railway proxy drops connections now and then - retry a few times. */
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

async function main() {
  await withRetry("connect", () => prisma.$queryRaw`SELECT 1 as ok`);
  console.log("Connected.");

  const sqlPath = path.join(
    __dirname,
    "sql",
    "make-notification-client-nullable.sql"
  );
  const sql = fs.readFileSync(sqlPath, "utf8");

  // Split on semicolons, skip comments/empty statements.
  const statements = sql
    .split(";")
    .map((statement) =>
      statement
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n")
        .trim()
    )
    .filter(Boolean);

  for (const statement of statements) {
    console.log(
      "Running:",
      statement.slice(0, 60).replace(/\s+/g, " ") + "..."
    );
    await withRetry("statement", () => prisma.$executeRawUnsafe(statement));
  }

  const [column] = await withRetry("verify", () =>
    prisma.$queryRawUnsafe("SHOW COLUMNS FROM Notification LIKE 'client_id'")
  );
  console.log("client_id column now:", column);

  console.log("Done.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
