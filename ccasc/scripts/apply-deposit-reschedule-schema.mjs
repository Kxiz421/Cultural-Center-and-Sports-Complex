import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const prisma = new PrismaClient();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  await prisma.$queryRaw`SELECT 1 as ok`;
  console.log("Connected.");

  const sqlPath = path.join(__dirname, "sql", "add-deposit-and-reschedule-dates.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");

  // Split on semicolons, skip comments/empty
  const statements = sql
    .split(";")
    .map((s) =>
      s
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n")
        .trim()
    )
    .filter(Boolean);

  for (const statement of statements) {
    console.log("Running:", statement.slice(0, 60).replace(/\s+/g, " ") + "...");
    await prisma.$executeRawUnsafe(statement);
  }

  const statuses = ["Pending", "Held", "Refunded", "Forfeited"];
  for (const status of statuses) {
    const existing = await prisma.depositStatus.findFirst({ where: { status } });
    if (!existing) {
      await prisma.depositStatus.create({ data: { status } });
      console.log("created status:", status);
    } else {
      console.log("exists status:", status);
    }
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
