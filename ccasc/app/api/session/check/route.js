import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isSessionTokenCurrent } from "@/lib/session-guard";

/**
 * Tells the browser whether its session is still the account's active one.
 * When the same account signs in elsewhere, this returns valid:false and the
 * client signs itself out.
 */
export async function GET() {
  const session = await auth();
  const userId = session?.user?.userId ?? null;
  const token = session?.user?.sessionToken ?? null;

  if (!userId) {
    return NextResponse.json(
      { valid: false, reason: "unauthenticated" },
      { status: 401 }
    );
  }

  const valid = await isSessionTokenCurrent(userId, token);
  return NextResponse.json({
    valid,
    reason: valid ? null : "session_replaced",
  });
}
