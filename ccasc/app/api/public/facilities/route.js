import { noCacheJson } from "@/lib/api-cache-control";
import { getPublicFacilities } from "@/lib/public-facilities";

/**
 * GET /api/public/facilities
 *
 * Anonymous, read-only facility list for the public landing page.
 *
 * It serves the same rows the admin Facility Management screen lists through
 * `GET /api/facilities`, except that archived facilities are removed so an
 * admin archiving a facility hides it from the public too. Only the fields a
 * visitor needs are exposed - no rate ids, no internal counters.
 *
 * Reachability lives in `lib/auth-roles.js`: the route is registered as
 * `PUBLIC_API`, and `isPublicApiRequest()` limits it to GET/HEAD.
 */
export async function GET() {
  try {
    return noCacheJson(await getPublicFacilities());
  } catch (error) {
    console.error("Failed to fetch public facilities:", error);
    return noCacheJson(
      { error: "Failed to fetch facilities" },
      { status: 500 },
    );
  }
}
