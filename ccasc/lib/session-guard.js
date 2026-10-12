import prisma from "@/lib/prisma";

/**
 * True when the given session token is still the account's active session.
 *
 * Fail-open: when there is nothing to compare (no token, or the account row has
 * no recorded session) it returns true, so accounts that signed in before the
 * active_session migration are never locked out.
 */
export async function isSessionTokenCurrent(userId, token) {
  if (!token || !userId) return true;

  const [prefix, rawId] = String(userId).split("-");
  const id = parseInt(rawId, 10);
  if (Number.isNaN(id)) return true;

  try {
    if (prefix === "STF") {
      const row = await prisma.staff.findUnique({
        where: { staffId: id },
        select: { activeSession: true },
      });
      return !row?.activeSession || row.activeSession === token;
    }
    if (prefix === "CLT") {
      const row = await prisma.client.findUnique({
        where: { clientId: id },
        select: { activeSession: true },
      });
      return !row?.activeSession || row.activeSession === token;
    }
  } catch (err) {
    console.error("Session check failed:", err.message);
  }
  return true;
}
