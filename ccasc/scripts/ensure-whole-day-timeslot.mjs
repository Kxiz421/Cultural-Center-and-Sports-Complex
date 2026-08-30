import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";

const WHOLE_DAY_SLOT = {
  timeSlotId: 3,
  startTime: "08:00 AM",
  endTime: "10:00 PM",
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "../.env");
try {
  const env = readFileSync(envPath, "utf8");
  for (const line of env.split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    const value = match[2].trim().replace(/^["']|["']$/g, "");
    if (key && process.env[key] == null) process.env[key] = value;
  }
} catch {
  // Fall back to existing environment variables.
}

const prisma = new PrismaClient();

async function main() {
  const slot = await prisma.timeSlot.upsert({
    where: { timeSlotId: WHOLE_DAY_SLOT.timeSlotId },
    update: {
      startTime: WHOLE_DAY_SLOT.startTime,
      endTime: WHOLE_DAY_SLOT.endTime,
    },
    create: WHOLE_DAY_SLOT,
  });

  const timeSlots = await prisma.timeSlot.findMany({
    orderBy: { timeSlotId: "asc" },
  });
  const packages = await prisma.package.findMany({
    select: {
      packageId: true,
      packageName: true,
      dayRate: true,
      nightRate: true,
      ledWallDayRate: true,
      ledWallNightRate: true,
      timeSlotId: true,
    },
    orderBy: { packageId: "asc" },
  });

  console.log("Whole-day time slot ready:", slot);
  console.log("All time slots:", timeSlots);
  console.log(
    "Packages:",
    packages.map((pkg) => ({
      ...pkg,
      dayRate: pkg.dayRate != null ? Number(pkg.dayRate) : null,
      nightRate: pkg.nightRate != null ? Number(pkg.nightRate) : null,
      ledWallDayRate: pkg.ledWallDayRate != null ? Number(pkg.ledWallDayRate) : null,
      ledWallNightRate: pkg.ledWallNightRate != null ? Number(pkg.ledWallNightRate) : null,
    }))
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
