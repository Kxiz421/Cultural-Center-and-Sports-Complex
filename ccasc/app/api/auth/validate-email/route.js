import { NextResponse } from "next/server";

import { checkEmailDeliverability } from "@/lib/email-validation";
import { getClientIP } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/auth/validate-email
 *
 * Public (pre-registration) endpoint. Checks whether an email is well-formed,
 * and - when `full` is true and a verification provider key is configured -
 * whether the specific mailbox exists. Supports any provider.
 *
 * Body: { email: string, full?: boolean }
 */
export async function POST(request) {
  try {
    const { email, full } = await request.json();
    const result = await checkEmailDeliverability(email, {
      ip: getClientIP(request),
      allowProvider: full === true,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Email validation error:", error);
    return NextResponse.json({
      status: "unknown",
      valid: true,
      message: "We couldn't verify this email right now, but you can continue.",
    });
  }
}
