import prisma from "@/lib/prisma";

/** AvailabilityStatus id for a particular that clients may book. */
const AVAILABLE_STATUS_ID = 1;
/** The landing page's Particulars list belongs to the Cultural Center venue. */
const CULTURAL_CENTER_VENUE_ID = 1;

/**
 * Venue Rental rows and the Basketball Game row are packages rather than
 * rentable equipment, so a visitor never sees them listed as attachable items.
 */
function isAttachableParticular(particular) {
  const name = particular.particularName || "";
  if (/venue rental/i.test(name)) return false;
  if (/basketball/i.test(name)) return false;
  return true;
}

/** True for a Cultural Center item (or one with no linked stock to scope by). */
function isCulturalCenterParticular(particular) {
  return (
    particular.venueId == null ||
    Number(particular.venueId) === CULTURAL_CENTER_VENUE_ID
  );
}

/**
 * The public particulars list: the Available equipment and amenities from
 * Particulars Management with the units currently on hand.
 *
 * Shared by `GET /api/public/particulars` and by the landing page's server
 * render, so the item names and quantities end up in the HTML search engines
 * receive instead of only being fetched in the browser.
 */
export async function getPublicParticulars() {
  const rows = await prisma.particular.findMany({
    where: { statusId: AVAILABLE_STATUS_ID },
    include: {
      inventory: { select: { quantityAvailable: true, venueId: true } },
    },
    orderBy: { particularId: "asc" },
  });

  return rows
    .map((row) => ({
      particularId: row.particularId,
      particularName: row.particularName,
      quantity: row.inventory?.quantityAvailable ?? 0,
      venueId: row.inventory?.venueId ?? null,
    }))
    .filter(isAttachableParticular)
    .filter(isCulturalCenterParticular);
}
