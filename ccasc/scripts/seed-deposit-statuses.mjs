/**
 * Idempotent seed for DepositStatus lookup rows.
 * Run: node scripts/seed-deposit-statuses.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const STATUSES = ["Pending", "Held", "Refunded", "Forfeited"];

async function main() {
  for (const status of STATUSES) {
    const existing = await prisma.depositStatus.findFirst({ where: { status } });
    if (existing) {
      console.log(`exists: ${status}`);
      continue;
    }
    await prisma.depositStatus.create({ data: { status } });
    console.log(`created: ${status}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
