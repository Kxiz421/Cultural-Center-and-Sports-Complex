import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function withRetry(fn, attempts = 8) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  throw lastError;
}

async function main() {
  const columns = await withRetry(() =>
    prisma.$queryRawUnsafe(
      "SELECT COLUMN_NAME AS name FROM INFORMATION_SCHEMA.COLUMNS " +
        "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Announcement' " +
        "AND COLUMN_NAME IN ('start_date', 'end_date')"
    )
  );
  const existing = new Set(columns.map((row) => row.name));
  console.log("Existing columns:", [...existing]);

  if (!existing.has("start_date")) {
    console.log("Adding start_date...");
    await withRetry(() =>
      prisma.$executeRawUnsafe(
        "ALTER TABLE Announcement ADD COLUMN start_date DATE NULL AFTER date_posted"
      )
    );
  }

  if (!existing.has("end_date")) {
    console.log("Adding end_date...");
    await withRetry(() =>
      prisma.$executeRawUnsafe(
        "ALTER TABLE Announcement ADD COLUMN end_date DATE NULL AFTER start_date"
      )
    );
  }

  console.log("Done.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
