import { noCacheJson } from "@/lib/api-cache-control";
import { getPublicPackages } from "@/lib/public-packages";

/**
 * GET /api/public/packages
 *
 * Anonymous, read-only package list for the public landing page.
 *
 * It serves the Available packages from Packages Management - the same rows the
 * admin Packages screen lists - so the landing page can never advertise an
 * archived package. Only the fields a visitor needs are exposed.
 *
 * Reachability lives in `lib/auth-roles.js`: the route is registered as
 * `PUBLIC_API`, and `isPublicApiRequest()` limits it to GET/HEAD.
 */
export async function GET() {
  try {
    return noCacheJson(await getPublicPackages());
  } catch (error) {
    console.error("Failed to fetch public packages:", error);
    return noCacheJson(
      { error: "Failed to fetch packages" },
      { status: 500 },
    );
  }
}
