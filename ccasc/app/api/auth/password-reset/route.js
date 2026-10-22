import { NextResponse } from "next/server";
import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { maskEmail, sendOtpEmail } from "@/lib/email";
import { isSmsEnabled, sendOtpSms } from "@/lib/sms";
import { phMasked, toE164Ph } from "@/lib/phone";


import {
  resolvePasswordResetAccountByIdentifier,
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

const ACTION = {
  LOOKUP: "lookup",
  SEND: "send",
};

const CHANNEL = {
  EMAIL: "email",
  SMS: "sms",
};

const GENERIC_NOT_FOUND = "No account found with those details.";
const AMBIGUOUS_MESSAGE =
  "These details match more than one account. Please reset using your email address or contact the administrator.";
const SMS_UNAVAILABLE_ERROR =
  "SMS reset is not available right now. Please recover using your email address.";

/**
 * Read the recovery channel from the request body. Missing/blank defaults to
 * email so a bare "send" keeps working.
 */
function readChannel(value) {
  if (value === undefined || value === null || value === "") return CHANNEL.EMAIL;
  if (value === CHANNEL.EMAIL || value === CHANNEL.SMS) return value;
  return null;
}

/** Per-account cooldown between successful password resets. */
const RESET_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Block a reset request when the account already reset its password within the
 * last 30 days. Returns the 429 response, or null when the reset may proceed.
 */
function resetCooldownResponse(account) {
  if (!account?.passwordResetAt) return null;
  const last = new Date(account.passwordResetAt).getTime();
  if (Number.isNaN(last)) return null;
  if (Date.now() - last >= RESET_COOLDOWN_MS) return null;

  const when = new Date(last + RESET_COOLDOWN_MS).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return NextResponse.json(
    {
      error: `You can only reset your password once a month. You can request another reset on ${when}.`,
    },
    { status: 429 },
  );
}

/**
 * The masked recovery options available on this account. Only channels that
 * actually exist are listed, and every target is partially hidden so the
 * lookup cannot be used to harvest a user's full contact details.
 */
function channelsFor(account) {
  const channels = [];
  if (account.email) {
    channels.push({ type: CHANNEL.EMAIL, target: maskEmail(account.email) });
  }
  if (isSmsEnabled() && toE164Ph(account.contactNumber)) {
    channels.push({ type: CHANNEL.SMS, target: phMasked(account.contactNumber) });
  }
  return channels;
}

/** IP-level throttle shared by the lookup and the send step. */
function passwordResetRateLimited(request) {
  const check = checkPasswordResetRateLimit(getClientIP(request));
  if (check.allowed) return null;

  const minutes = Math.ceil(check.retryAfter / 60);
  return NextResponse.json(
    {
      error: `Too many password reset requests. Please try again in ${minutes} minute${minutes > 1 ? "s" : ""}.`,
    },
    { status: 429, headers: { "Retry-After": String(check.retryAfter) } }
  );
}

/**
 * Resolve the account from the identifier the user typed, or the error to
 * return. Shared by every handler so POST/PATCH/PUT always agree on the row.
 */
async function resolveIdentifier(identifier) {
  const account = await resolvePasswordResetAccountByIdentifier(identifier);

  if (!account) {
    return { error: { status: 404, message: GENERIC_NOT_FOUND } };
  }
  if (account.ambiguous) {
    return { error: { status: 409, message: AMBIGUOUS_MESSAGE } };
  }

  return { account };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const identifier = String(body?.identifier ?? "").trim();
    const action = body?.action === ACTION.LOOKUP ? ACTION.LOOKUP : ACTION.SEND;

    const limited = passwordResetRateLimited(request);
    if (limited) return limited;

    if (!identifier) {
      return NextResponse.json(
        { error: "Enter your email, username, or mobile number." },
        { status: 400 }
      );
    }

    const resolved = await resolveIdentifier(identifier);

    if (resolved.error) {
      return NextResponse.json(
        { error: resolved.error.message },
        { status: resolved.error.status }
      );
    }

    const account = resolved.account;

    if (action === ACTION.LOOKUP) {
      return NextResponse.json({ identifier, channels: channelsFor(account) });
    }

    // Password resets are limited to once per 30 days per account.
    const resetBlocked = resetCooldownResponse(account);
    if (resetBlocked) return resetBlocked;

    const channel = readChannel(body?.channel);
    if (!channel) {
      return NextResponse.json(
        { error: "Unsupported recovery method" },
        { status: 400 }
      );
    }

    let target;
    if (channel === CHANNEL.SMS) {
      if (!isSmsEnabled()) {
        return NextResponse.json({ error: SMS_UNAVAILABLE_ERROR }, { status: 503 });
      }
      target = toE164Ph(account.contactNumber);
      if (!target) {
        return NextResponse.json(
          {
            error:
              "This account has no mobile number on file. Please recover using your email address.",
          },
          { status: 400 }
        );
      }
    } else {
      target = String(account.email ?? "").trim();
      if (!target) {
        return NextResponse.json(
          { error: "This account has no email address on file." },
          { status: 400 }
        );
      }
    }

    // One code per account per minute. Keyed by the destination so a double-tap
    // on "Send code" / "Resend code" cannot fire several messages.
    const cooldownKey = `${channel}:${target.toLowerCase()}`;
    const cooldown = checkOtpSendCooldown(cooldownKey);
    if (!cooldown.allowed) {
      return NextResponse.json(
        {
          error: `A recovery code was just sent. Please wait ${cooldown.retryAfter}s before requesting another.`,
        },
        { status: 429, headers: { "Retry-After": String(cooldown.retryAfter) } }
      );
    }

    // Reserve the slot BEFORE the awaits below so two concurrent requests
    // cannot both pass the check above.
    recordOtpSend(cooldownKey);

    // Generate OTP (6-digit code) with a CSPRNG - Math.random() is predictable.
    const otp = String(randomInt(100000, 1000000));
    const otpExpiration = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await updatePasswordResetAccount(account, { otp, otpExpiration });

    const sent =
      channel === CHANNEL.SMS
        ? await sendOtpSms(target, otp)
        : await sendOtpEmail(target, otp);

    if (!sent) {
      // Free the cooldown so a genuine send failure does not lock the user out.
      clearOtpSend(cooldownKey);
      return NextResponse.json(
        {
          error:
            channel === CHANNEL.SMS
              ? "Failed to send the recovery SMS. Please try again later."
              : "Failed to send OTP email. Please try again later.",
        },
        { status: 500 }
      );
    }

    // Only record the request on a successful OTP send
    recordPasswordReset(getClientIP(request));

    return NextResponse.json({
      message: "OTP sent successfully",
      channel,
      target: channel === CHANNEL.SMS ? phMasked(target) : maskEmail(target),
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
    const body = await request.json();
    const identifier = String(body?.identifier ?? "").trim();
    const otp = body?.otp;

    if (!identifier || !otp) {
      return NextResponse.json(
        { error: "Enter your details and the recovery code." },
        { status: 400 }
      );
    }

    const resolved = await resolveIdentifier(identifier);

    if (resolved.error) {
      return NextResponse.json(
        { error: resolved.error.message },
        { status: resolved.error.status }
      );
    }

    const account = resolved.account;

    // Throttle code guessing (5 tries / 15 min per IP + account).
    const limiterKey = `${getClientIP(request)}:${account.userType}:${account.id}`;
    const limit = checkOtpVerifyRateLimit(limiterKey);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many incorrect codes. Please request a new code later." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
      );
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
    const body = await request.json();
    const identifier = String(body?.identifier ?? "").trim();
    const otp = body?.otp;
    const newPassword = body?.newPassword;

    if (!identifier || !otp || !newPassword) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const resolved = await resolveIdentifier(identifier);

    if (resolved.error) {
      return NextResponse.json(
        { error: resolved.error.message },
        { status: resolved.error.status }
      );
    }

    const account = resolved.account;

    // Throttle code guessing (5 tries / 15 min per IP + account).
    const limiterKey = `${getClientIP(request)}:${account.userType}:${account.id}`;
    const limit = checkOtpVerifyRateLimit(limiterKey);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many incorrect codes. Please request a new code later." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
      );
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
    // `passwordResetAt` starts the once-per-30-days clock for this account.
    await updatePasswordResetAccount(account, {
      password: hashedPassword,
      otp: null,
      otpExpiration: null,
      passwordResetAt: new Date(),
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
