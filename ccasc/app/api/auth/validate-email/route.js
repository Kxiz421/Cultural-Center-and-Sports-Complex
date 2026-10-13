import { NextResponse } from "next/server";

import { checkEmailDeliverability } from "@/lib/email-validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/auth/validate-email
 *
 * Public (pre-registration) endpoint. Checks whether an email is well-formed,
 * whether its domain can receive mail, and flags common typos - so the
 * registration form can warn the user while they type instead of only on
 * submit. Supports any provider.
 *
 * Body: { email: string }
 */
export async function POST(request) {
  try {
    const { email } = await request.json();
    const result = await checkEmailDeliverability(email);
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
