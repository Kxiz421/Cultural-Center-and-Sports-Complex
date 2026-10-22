import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import prisma from "@/lib/prisma";
import {
  checkLoginRateLimit,
  clearLoginAttempts,
  getClientIP,
  recordFailedLogin,
} from "@/lib/rate-limit";

/**
 * POST /api/auth/change-password
 *
 * Completes the forced password change for an account created with the default
 * password. The caller proves the current (default) password, so no session is
 * needed; the account keeps `mustChangePassword` set until it succeeds, which
 * is why closing the tab and signing in again simply prompts again.
 */
function passwordProblem(password) {
  if (password.length < 8) return "Password must be at least 8 characters long.";
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter.";
  if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter.";
  if (!/[0-9]/.test(password)) return "Password must contain at least one number.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must contain at least one special character (e.g., @, #, $).";
  return null;
}

/** Staff-before-Client, email-before-username - the same order login uses. */
async function findAccount(identifier) {
  const byEmail = await prisma.staff.findUnique({
    where: { email: identifier },
    select: { staffId: true, password: true, mustChangePassword: true },
  });
  const staff =
    byEmail ??
    (await prisma.staff.findUnique({
      where: { username: identifier },
      select: { staffId: true, password: true, mustChangePassword: true },
    }));
  if (staff) return { kind: "staff", id: staff.staffId, ...staff };

  const clientByEmail = await prisma.client.findUnique({
    where: { email: identifier },
    select: { clientId: true, password: true, mustChangePassword: true },
  });
  const client =
    clientByEmail ??
    (await prisma.client.findUnique({
      where: { username: identifier },
      select: { clientId: true, password: true, mustChangePassword: true },
    }));
  if (client) return { kind: "client", id: client.clientId, ...client };

  return null;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const identifier = String(body?.identifier ?? "").trim();
    const currentPassword = String(body?.currentPassword ?? "");
    const newPassword = String(body?.newPassword ?? "");

    if (!identifier || !currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const ip = getClientIP(request);
    const limit = checkLoginRateLimit(ip);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please wait a few minutes and try again." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
      );
    }

    const account = await findAccount(identifier);
    const matches =
      account &&
      account.password &&
      (await bcrypt.compare(currentPassword, account.password).catch(() => false));

    if (!account || !matches) {
      recordFailedLogin(ip);
      return NextResponse.json(
        { error: "Your current password is incorrect." },
        { status: 400 },
      );
    }

    if (!account.mustChangePassword) {
      return NextResponse.json(
        { error: "This account does not need a password change." },
        { status: 400 },
      );
    }

    const problem = passwordProblem(newPassword);
    if (problem) {
      return NextResponse.json({ error: problem }, { status: 400 });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    const data = { password: hashed, mustChangePassword: false };

    if (account.kind === "staff") {
      await prisma.staff.update({ where: { staffId: account.id }, data });
    } else {
      await prisma.client.update({ where: { clientId: account.id }, data });
    }

    clearLoginAttempts(ip);
    return NextResponse.json({ message: "Password updated" });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { error: "Failed to update the password" },
      { status: 500 },
    );
  }
}
