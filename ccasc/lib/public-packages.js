import prisma from "@/lib/prisma";

/** AvailabilityStatus id for a package that clients may book. */
const AVAILABLE_STATUS_ID = 1;

/**
 * The public package list: every Available package from Packages Management,
 * reduced to the fields a visitor needs (no status ids, no audit data).
 *
 * Packages are built for the Cultural Center, which is why they are not tagged
 * by venue - the whole Available catalogue is returned in the same order the
 * admin Packages screen lists it.
 *
 * Shared by `GET /api/public/packages` and by the landing page's server render,
 * so the package names, rates and inclusions end up in the HTML search engines
 * receive instead of only being fetched in the browser.
 */
export async function getPublicPackages() {
  const packages = await prisma.package.findMany({
    where: { statusId: AVAILABLE_STATUS_ID },
    include: {
      timeSlot: { select: { startTime: true, endTime: true } },
      inclusions: {
        include: {
          item: { select: { itemName: true, quantityAvailable: true } },
        },
      },
    },
    orderBy: { packageId: "asc" },
  });

  return packages.map((pkg) => ({
    packageId: pkg.packageId,
    name: pkg.packageName,
    description: pkg.description || "",
    dayRate: Number(pkg.dayRate ?? 0),
    nightRate: Number(pkg.nightRate ?? 0),
    ledWallDayRate: Number(pkg.ledWallDayRate ?? 0),
    ledWallNightRate: Number(pkg.ledWallNightRate ?? 0),
    timeSlot: `${pkg.timeSlot.startTime} — ${pkg.timeSlot.endTime}`,
    inclusions: (pkg.inclusions || []).map((inclusion) => ({
      name: inclusion.item?.itemName || "Item",
      quantity: Number(inclusion.quantityAvailable) || 0,
    })),
  }));
}
