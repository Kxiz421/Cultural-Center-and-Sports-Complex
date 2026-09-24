import { noCacheJson } from "@/lib/api-cache-control";
import prisma from "@/lib/prisma";

/**
 * GET /api/public/facilities
 *
 * Anonymous, read-only facility list for the public landing page.
 *
 * It serves the same rows the admin Facility Management screen lists through
 * `GET /api/facilities` (that screen does not filter by status either), so the
 * landing page can never drift from what the coordinators maintain. Only the
 * fields a visitor needs are exposed - no rate ids, no image paths, no
 * internal counters.
 *
 * Reachability lives in `lib/auth-roles.js`: the route is registered as
 * `PUBLIC_API`, and `isPublicApiRequest()` limits it to GET/HEAD.
 */
export async function GET() {
  try {
    const facilities = await prisma.facility.findMany({
      include: { venue: true, rate: true, status: true },
      orderBy: { facilityId: "asc" },
    });

    return noCacheJson(
      facilities.map((facility) => ({
        facilityId: facility.facilityId,
        name: facility.facilityName,
        description: facility.description || "",
        venueId: facility.venue?.venueId ?? facility.venueId,
        venue: facility.venue?.venue || "Unknown venue",
        rateDay: Number(facility.rate?.dayRate ?? 0),
        rateNight: Number(facility.rate?.nightRate ?? 0),
        availability: facility.status?.statusName || "Unknown",
      })),
    );
  } catch (error) {
    console.error("Failed to fetch public facilities:", error);
    return noCacheJson(
      { error: "Failed to fetch facilities" },
      { status: 500 },
    );
  }
}
