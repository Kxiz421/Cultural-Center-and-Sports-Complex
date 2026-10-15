import { noCacheJson } from "@/lib/api-cache-control";
import { getPublicParticulars } from "@/lib/public-particulars";

/**
 * GET /api/public/particulars
 *
 * Anonymous, read-only particulars list for the public landing page.
 *
 * It serves the Available equipment and amenities from Particulars Management
 * with the units on hand, so the landing page shows the same quantities the
 * coordinators maintain.
 *
 * Reachability lives in `lib/auth-roles.js`: the route is registered as
 * `PUBLIC_API`, and `isPublicApiRequest()` limits it to GET/HEAD.
 */
export async function GET() {
  try {
    return noCacheJson(await getPublicParticulars());
  } catch (error) {
    console.error("Failed to fetch public particulars:", error);
    return noCacheJson(
      { error: "Failed to fetch particulars" },
      { status: 500 },
    );
  }
}
