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
  const before = await withRetry(() => prisma.facilityImage.count());

  // Mock seed rows stored bare filenames; real images are "/uploads/..." or a
  // Vercel Blob "https://..." URL.
  const mock = await withRetry(() =>
    prisma.facilityImage.findMany({
      where: {
        NOT: {
          OR: [
            { image: { startsWith: "/" } },
            { image: { startsWith: "http" } },
          ],
        },
      },
      select: { facilityImageId: true, image: true },
    })
  );

  if (mock.length === 0) {
    console.log("No mock facility images found; nothing to delete.");
    return;
  }

  const result = await withRetry(() =>
    prisma.facilityImage.deleteMany({
      where: { facilityImageId: { in: mock.map((row) => row.facilityImageId) } },
    })
  );

  console.log(`Deleted ${result.count} mock facility image row(s):`);
  for (const row of mock) console.log(`  ${row.facilityImageId}  ${row.image}`);

  const after = await withRetry(() => prisma.facilityImage.count());
  console.log(`FacilityImage rows: ${before} -> ${after}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
