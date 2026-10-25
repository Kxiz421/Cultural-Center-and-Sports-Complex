import { NextResponse } from "next/server";
import { randomInt } from "node:crypto";

import prisma from "@/lib/prisma";
import { maskEmail, sendOtpEmail } from "@/lib/email";
import { isSmsEnabled, sendOtpSms } from "@/lib/sms";
import { phMasked } from "@/lib/phone";
import { isValidEmailFormat } from "@/lib/email-validation";
import {
  REGISTER_CHANNEL,
  normalizeRegistrationTarget,
} from "@/lib/register-otp";
import {
  checkOtpSendCooldown,
  checkOtpVerifyRateLimit,
  clearOtpSend,
  clearOtpVerifyAttempts,
  getClientIP,
  recordOtpSend,
  recordOtpVerifyFailure,
} from "@/lib/rate-limit";

/** How long a registration code stays valid. */
const OTP_TTL_MS = 10 * 60 * 1000;

function maskedTarget(channel, target) {
  return channel === REGISTER_CHANNEL.SMS ? phMasked(target) : maskEmail(target);
}

/**
 * Send (or resend) a registration verification code to an email/phone.
 * Shared by email and SMS; SMS only works when an SMS provider is configured.
 */
async function handleSend(channel, rawTarget) {
  if (channel === REGISTER_CHANNEL.EMAIL && !isValidEmailFormat(rawTarget)) {
    return NextResponse.json(
      { error: "Enter a valid email address (e.g., name@gmail.com)." },
      { status: 400 },
    );
  }

  const target = normalizeRegistrationTarget(channel, rawTarget);
  if (!target) {
    return NextResponse.json(
      {
        error:
          channel === REGISTER_CHANNEL.SMS
            ? "Enter a valid mobile number (e.g., 09171234567)."
            : "Enter a valid email address.",
      },
      { status: 400 },
    );
  }

  // Early duplicate check for emails so a registrant learns immediately that
  // the address is already in use (the register route enforces this too).
  if (channel === REGISTER_CHANNEL.EMAIL) {
    const [staff, client] = await Promise.all([
      prisma.staff.findUnique({ where: { email: target }, select: { staffId: true } }),
      prisma.client.findUnique({ where: { email: target }, select: { clientId: true } }),
    ]);
    if (staff || client) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }
  }

  const cooldownKey = `register:${channel}:${target}`;
  const cooldown = checkOtpSendCooldown(cooldownKey);
  if (!cooldown.allowed) {
    return NextResponse.json(
      {
        error: `A code was just sent. Please wait ${cooldown.retryAfter}s before requesting another.`,
      },
      { status: 429, headers: { "Retry-After": String(cooldown.retryAfter) } },
    );
  }

  // Reserve the slot before the awaits so a double-tap cannot fire twice.
  recordOtpSend(cooldownKey);

  const otp = String(randomInt(100000, 1000000));
  const otpExpiration = new Date(Date.now() + OTP_TTL_MS);

  await prisma.registrationOtp.upsert({
    where: { channel_target: { channel, target } },
    create: { channel, target, otp, otpExpiration, verified: false },
    update: { otp, otpExpiration, verified: false },
  });

  let sent;
  if (channel === REGISTER_CHANNEL.SMS) {
    if (isSmsEnabled()) {
      sent = await sendOtpSms(target, otp, {
        purpose: "verify",
        expiresInMinutes: OTP_TTL_MS / 60000,
      });
    } else if (process.env.NODE_ENV !== "production") {
      // No SMS provider is configured locally. Still enforce the step, but surface
      // the code in the server log so the flow can be tested end to end.
      console.warn(
        `[register-otp] SMS disabled - development code for ${target}: ${otp}`,
      );
      sent = true;
    } else {
      clearOtpSend(cooldownKey);
      return NextResponse.json(
        {
          error:
            "SMS verification is unavailable right now. Please contact the administrator.",
        },
        { status: 503 },
      );
    }
  } else {
    sent = await sendOtpEmail(target, otp, {
      purpose: "verify",
      expiresInMinutes: OTP_TTL_MS / 60000,
    });
  }

  if (!sent) {
    clearOtpSend(cooldownKey);
    return NextResponse.json(
      {
        error:
          channel === REGISTER_CHANNEL.SMS
            ? "Failed to send the verification SMS. Please try again later."
            : "Failed to send the verification email. Please try again later.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    message: "Verification code sent",
    channel,
    target: maskedTarget(channel, target),
  });
}

/** Verify a registration code and mark the target as proven. */
async function handleVerify(request, channel, rawTarget, otp) {
  const target = normalizeRegistrationTarget(channel, rawTarget);
  if (!target) {
    return NextResponse.json({ error: "Invalid target" }, { status: 400 });
  }

  const code = String(otp ?? "").trim();
  if (!code) {
    return NextResponse.json(
      { error: "Enter the verification code." },
      { status: 400 },
    );
  }

  // Throttle code guessing (5 tries / 15 min per IP + target).
  const limiterKey = `${getClientIP(request)}:register:${channel}:${target}`;
  const limit = checkOtpVerifyRateLimit(limiterKey);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many incorrect codes. Please request a new one later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const row = await prisma.registrationOtp.findUnique({
    where: { channel_target: { channel, target } },
  });

  if (
    !row ||
    row.otp !== code ||
    !row.otpExpiration ||
    row.otpExpiration < new Date()
  ) {
    recordOtpVerifyFailure(limiterKey);
    return NextResponse.json(
      { error: "Invalid or expired verification code." },
      { status: 400 },
    );
  }

  await prisma.registrationOtp.update({
    where: { channel_target: { channel, target } },
    data: { verified: true, otp: null, otpExpiration: null },
  });

  clearOtpVerifyAttempts(limiterKey);
  return NextResponse.json({ verified: true, channel });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const action = body?.action === "verify" ? "verify" : "send";
    const channel = body?.channel;
    const rawTarget = String(body?.target ?? "").trim();

    if (channel !== REGISTER_CHANNEL.EMAIL && channel !== REGISTER_CHANNEL.SMS) {
      return NextResponse.json(
        { error: "Unsupported verification channel." },
        { status: 400 },
      );
    }
    if (!rawTarget) {
      return NextResponse.json(
        { error: "Enter the email or mobile number to verify." },
        { status: 400 },
      );
    }

    return action === "verify"
      ? await handleVerify(request, channel, rawTarget, body?.otp)
      : await handleSend(channel, rawTarget);
  } catch (error) {
    console.error("Registration verification error:", error);
    return NextResponse.json(
      { error: "Failed to process the verification request." },
      { status: 500 },
    );
  }
}
