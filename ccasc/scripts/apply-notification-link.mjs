/**
 * Adds Notification.link (nullable) so a notification can deep-link to a page.
 *
 * Usage: node scripts/apply-notification-link.mjs
 */
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const prisma = new PrismaClient();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

  const sqlPath = path.join(__dirname, "sql", "add-notification-link.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");

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
    prisma.$queryRawUnsafe("SHOW COLUMNS FROM Notification LIKE 'link'")
  );
  console.log("link column now:", column);

  console.log("Done.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
