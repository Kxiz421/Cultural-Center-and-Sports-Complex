import prisma from "@/lib/prisma";
import { FACILITY_STATUS_ID } from "@/lib/facility-status";

/**
 * The public facility list: the same rows the admin Facility Management screen
 * lists, minus archived ones, reduced to the fields a visitor needs (no rate
 * ids, no internal counters).
 *
 * Shared by `GET /api/public/facilities` and by the landing page's server
 * render, so the facility names, descriptions and rates end up in the HTML
 * search engines receive instead of only being fetched in the browser.
 */
export async function getPublicFacilities() {
  const facilities = await prisma.facility.findMany({
    where: { statusId: { not: FACILITY_STATUS_ID.ARCHIVED } },
    include: { venue: true, rate: true, status: true, images: true },
    orderBy: { facilityId: "asc" },
  });

  return facilities.map((facility) => ({
    facilityId: facility.facilityId,
    name: facility.facilityName,
    description: facility.description || "",
    capacity: facility.capacity || 0,
    venueId: facility.venue?.venueId ?? facility.venueId,
    venue: facility.venue?.venue || "Unknown venue",
    rateDay: Number(facility.rate?.dayRate ?? 0),
    rateNight: Number(facility.rate?.nightRate ?? 0),
    availability: facility.status?.statusName || "Unknown",
    images: (facility.images || []).map((image) => image.image),
  }));
}
