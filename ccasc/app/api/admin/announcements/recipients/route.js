import { noCacheJson } from "@/lib/api-cache-control";
import { requireApiAuth } from "@/lib/api-auth";
import { getAnnouncementRoleCounts } from "@/lib/announcements";

export const dynamic = "force-dynamic";

/**
 * Recipient groups with live head-counts, for the audience picker in the admin
 * announcements dialog.
 */
export async function GET() {
  const guard = await requireApiAuth(["admin"]);
  if (guard.response) return guard.response;

  try {
    const roles = await getAnnouncementRoleCounts();
    return noCacheJson({ roles });
  } catch (error) {
    console.error("Failed to fetch announcement recipients:", error);
    return noCacheJson(
      { error: "Failed to fetch recipients" },
      { status: 500 }
    );
  }
}