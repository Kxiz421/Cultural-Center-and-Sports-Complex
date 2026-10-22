import { NextResponse } from "next/server";
import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { maskEmail, sendOtpEmail } from "@/lib/email";
import { isFirebaseConfigured, verifyFirebaseIdToken } from "@/lib/firebase-admin";
import { createResetTicket, verifyResetTicket } from "@/lib/reset-ticket";
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
  FIREBASE_VERIFY: "firebase-verify",
};

const CHANNEL = {
  EMAIL: "email",
  SMS: "sms",
};

const GENERIC_NOT_FOUND = "No account found with those details.";
const AMBIGUOUS_MESSAGE =
  "These details match more than one account. Please reset using your email address or contact the administrator.";
const FIREBASE_UNAVAILABLE_ERROR =
  "Phone recovery is not available right now. Please recover using your email address.";

function readAction(raw) {
  if (raw === ACTION.LOOKUP) return ACTION.LOOKUP;
  if (raw === ACTION.FIREBASE_VERIFY) return ACTION.FIREBASE_VERIFY;
  return ACTION.SEND;
}

/**
 * Read the recovery channel from the request body. Missing/blank defaults to
 * email so a bare "send" keeps working.
 */
function readChannel(value) {
  if (value === undefined || value === null || value === "") return CHANNEL.EMAIL;
  if (value === CHANNEL.EMAIL || value === CHANNEL.SMS) return value;
  return null;
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
  if (isFirebaseConfigured() && toE164Ph(account.contactNumber)) {
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

/**
 * Exchange a Firebase-verified phone number for a short-lived reset ticket.
 *
 * Firebase proves the caller controls a phone number, not which account they
 * own - so the verified number must be the one saved on the account that the
 * identifier resolved to. Otherwise anyone could verify their own number and
 * reset somebody else's password.
 */
async function handleFirebaseVerify(body, identifier) {
  if (!isFirebaseConfigured()) {
    return NextResponse.json({ error: FIREBASE_UNAVAILABLE_ERROR }, { status: 503 });
  }

  const idToken = String(body?.idToken ?? "");
  if (!idToken) {
    return NextResponse.json(
      { error: "Missing phone verification token." },
      { status: 400 }
    );
  }

  const verified = await verifyFirebaseIdToken(idToken);

  if (!verified.ok && verified.reason === "unavailable") {
    return NextResponse.json({ error: FIREBASE_UNAVAILABLE_ERROR }, { status: 503 });
  }

  const verifiedPhone = verified.ok ? toE164Ph(verified.phoneNumber) : null;

  if (!verifiedPhone) {
    return NextResponse.json(
      { error: "We couldn't verify that phone number. Please request a new code." },
      { status: 401 }
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
  const storedPhone = toE164Ph(account.contactNumber);

  if (!storedPhone || storedPhone !== verifiedPhone) {
    return NextResponse.json(
      {
        error:
          "That mobile number is not the one saved on this account. Use the number on your account, or recover using your email address.",
      },
      { status: 403 }
    );
  }

  return NextResponse.json({
    message: "Phone verified successfully",
    ticket: createResetTicket(account),
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const identifier = String(body?.identifier ?? "").trim();
    const action = readAction(body?.action);

    const limited = passwordResetRateLimited(request);
    if (limited) return limited;

    if (!identifier) {
      return NextResponse.json(
        { error: "Enter your email, username, or mobile number." },
        { status: 400 }
      );
    }

    if (action === ACTION.FIREBASE_VERIFY) {
      return handleFirebaseVerify(body, identifier);
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

    if (readChannel(body?.channel) !== CHANNEL.EMAIL) {
      return NextResponse.json(
        { error: "Use phone verification for the SMS option." },
        { status: 400 }
      );
    }

    const target = String(account.email ?? "").trim();
    if (!target) {
      return NextResponse.json(
        { error: "This account has no email address on file." },
        { status: 400 }
      );
    }

    // One code per account per minute. Keyed by the destination so a double-tap
    // on "Send code" / "Resend code" cannot fire several messages.
    const cooldownKey = `${CHANNEL.EMAIL}:${target.toLowerCase()}`;
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

    const sent = await sendOtpEmail(target, otp);

    if (!sent) {
      // Free the cooldown so a genuine send failure does not lock the user out.
      clearOtpSend(cooldownKey);
      return NextResponse.json(
        { error: "Failed to send OTP email. Please try again later." },
        { status: 500 }
      );
    }

    // Only record the request on a successful OTP send
    recordPasswordReset(getClientIP(request));

    return NextResponse.json({
      message: "OTP sent successfully",
      channel: CHANNEL.EMAIL,
      target: maskEmail(target),
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
    const ticket = body?.ticket;
    const newPassword = body?.newPassword;

    if (!identifier || !newPassword || (!otp && !ticket)) {
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

    if (ticket) {
      // Phone path: the ticket was minted only after Firebase verified that the
      // caller controls this account's saved mobile number.
      const granted = verifyResetTicket(ticket);
      if (
        !granted ||
        granted.userType !== account.userType ||
        granted.id !== account.id
      ) {
        return NextResponse.json(
          { error: "Your phone verification has expired. Please start again." },
          { status: 400 }
        );
      }
    } else {
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

      clearOtpVerifyAttempts(limiterKey);
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

    return NextResponse.json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    );
  }
}
