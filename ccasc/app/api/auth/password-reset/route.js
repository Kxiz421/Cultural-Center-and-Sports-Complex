import { NextResponse } from "next/server";
import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { sendOtpEmail } from "@/lib/email";


import {
  resolvePasswordResetAccount,
  updatePasswordResetAccount,
} from "@/lib/password-reset-scope";
import {
  checkOtpSendCooldown,
  checkOtpVerifyRateLimit,
  checkPasswordResetRateLimit,
  clearOtpSend,
  clearOtpVerifyAttempts,
  getClientIP,
  recordOtpSend,
  recordOtpVerifyFailure,
  recordPasswordReset,
} from "@/lib/rate-limit";

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // ----- Rate-limit check (by IP) -----
    const ip = getClientIP(request);
    const check = checkPasswordResetRateLimit(ip);
    if (!check.allowed) {
      const minutes = Math.ceil(check.retryAfter / 60);
      return NextResponse.json(
        {
          error: `Too many password reset requests. Please try again in ${minutes} minute${minutes > 1 ? "s" : ""}.`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(check.retryAfter) },
        }
      );
    }

    // Resolve the account this reset applies to. The precedence here MUST
    // match the login provider (Staff before Client) or the OTP is written to
    // a different row than the one login authenticates.
    const account = await resolvePasswordResetAccount(email);

    if (!account) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // One code per account per minute. Keyed by the account email so a
    // double-tap on "Send code" / "Resend code" cannot fire several emails.
    const cooldownKey = String(email).trim().toLowerCase();
    const cooldown = checkOtpSendCooldown(cooldownKey);
    if (!cooldown.allowed) {
      return NextResponse.json(
        {
          error: `A recovery code was just sent. Please wait ${cooldown.retryAfter}s before requesting another.`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(cooldown.retryAfter) },
        }
      );
    }

    // Reserve the slot BEFORE the awaits below so two concurrent requests
    // cannot both pass the check above.
    recordOtpSend(cooldownKey);

    // Generate OTP (6-digit code) with a CSPRNG - Math.random() is predictable.
    const otp = String(randomInt(100000, 1000000));
    const otpExpiration = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await updatePasswordResetAccount(account, { otp, otpExpiration });

    // Send OTP via Gmail SMTP
    const emailSent = await sendOtpEmail(email, otp);

    if (!emailSent) {
      // Free the cooldown so a genuine send failure does not lock the user out.
      clearOtpSend(cooldownKey);
      return NextResponse.json(
        { error: "Failed to send OTP email. Please try again later." },
        { status: 500 }
      );
    }

    // Only record the request on a successful OTP send
    recordPasswordReset(ip);

    return NextResponse.json({ 
      message: "OTP sent successfully"
    });
  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json(
      { error: "Failed to process password reset" },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const { email, otp } = await request.json();

    if (!email || !otp) {
      return NextResponse.json(
        { error: "Email and OTP are required" },
        { status: 400 }
      );
    }

    // Throttle code guessing (5 tries / 15 min per IP + account).
    const limiterKey = `${getClientIP(request)}:${String(email).toLowerCase()}`;
    const limit = checkOtpVerifyRateLimit(limiterKey);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many incorrect codes. Please request a new code later." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
      );
    }

    // Resolve the account exactly as the PUT handler below does, so the code
    // that is verified is always the code that gets cleared on success.
    const account = await resolvePasswordResetAccount(email);

    if (!account) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if OTP matches and is not expired
    if (account.otp !== otp || !account.otpExpiration || account.otpExpiration < new Date()) {
      recordOtpVerifyFailure(limiterKey);
      return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 });
    }

    return NextResponse.json({ message: "OTP verified successfully" });
  } catch (error) {
    console.error("OTP verification error:", error);
    return NextResponse.json(
      { error: "Failed to verify OTP" },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const { email, otp, newPassword } = await request.json();

    if (!email || !otp || !newPassword) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Throttle code guessing (5 tries / 15 min per IP + account).
    const limiterKey = `${getClientIP(request)}:${String(email).toLowerCase()}`;
    const limit = checkOtpVerifyRateLimit(limiterKey);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many incorrect codes. Please request a new code later." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
      );
    }

    const account = await resolvePasswordResetAccount(email);

    if (!account) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if OTP matches and is not expired
    if (account.otp !== otp || !account.otpExpiration || account.otpExpiration < new Date()) {
      recordOtpVerifyFailure(limiterKey);
      return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the password and clear the OTP fields on the SAME row that was
    // resolved above - i.e. the row the login provider will authenticate.
    await updatePasswordResetAccount(account, {
      password: hashedPassword,
      otp: null,
      otpExpiration: null,
    });

    clearOtpVerifyAttempts(limiterKey);

    return NextResponse.json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    );
  }
}