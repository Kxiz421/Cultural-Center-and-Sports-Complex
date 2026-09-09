import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const prisma = new PrismaClient();

async function main() {
  const statuses = await prisma.availabilityStatus.findMany({
    select: { statusId: true, statusName: true },
  });
  const ids = new Set(statuses.map((s) => s.statusId));

  const packages = await prisma.package.findMany({
    select: { packageId: true, statusId: true },
  });
  const particulars = await prisma.particular.findMany({
    select: { particularId: true, statusId: true },
  });

  const badPackages = packages.filter((p) => !ids.has(p.statusId));
  const badParticulars = particulars.filter((p) => !ids.has(p.statusId));

  console.log(
    JSON.stringify(
      {
        availabilityStatusIds: [...ids].sort((a, b) => a - b),
        packageCount: packages.length,
        particularCount: particulars.length,
        badPackages,
        badParticulars,
      },
      null,
      2
    )
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
