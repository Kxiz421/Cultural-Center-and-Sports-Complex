import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { noCacheJson } from "@/lib/api-cache-control";
import prisma from "@/lib/prisma";
import { roundMoney } from "@/lib/utils";
import { requireApiAuth, actingAs, ownClientId } from "@/lib/api-auth";

const ACTIVE_RESERVATION_EXCLUSIONS = ["Cancelled"];

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Password strength rules — the same ones registration and the forced
 * password change enforce.
 */
function passwordProblem(password) {
  if (password.length < 8) return "Password must be at least 8 characters long.";
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter.";
  if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter.";
  if (!/[0-9]/.test(password)) return "Password must contain at least one number.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must contain at least one special character (e.g., @, #, $).";
  return null;
}

/**
 * The signed-in client's own profile, plus their remaining balance:
 * unpaid balances on active reservations and any outstanding deposit
 * balance left from an over-consumed 10% deposit (damages/overtime).
 */
async function loadProfile(clientId) {
  const client = await prisma.client.findUnique({
    where: { clientId },
    include: {
      clientRole: { select: { roleName: true } },
      clientOrg: { select: { organizationName: true } },
      reservations: {
        where: { reservationStatus: { notIn: ACTIVE_RESERVATION_EXCLUSIONS } },
        select: {
          reservationId: true,
          eventType: true,
          eventDate: true,
          totalAmount: true,
          bookings: {
            select: {
              payments: { select: { amountPaid: true } },
              deposit: { select: { amountAfterDeductions: true } },
            },
          },
        },
        orderBy: { reservationId: "desc" },
      },
    },
  });
  if (!client) return null;

  const reservationBalances = [];
  const depositDebts = [];
  let reservationBalanceTotal = 0;
  let depositDebtTotal = 0;

  for (const reservation of client.reservations) {
    const paid = (reservation.bookings || []).reduce(
      (sum, booking) =>
        sum +
        (booking.payments || []).reduce(
          (paySum, payment) => paySum + toNumber(payment.amountPaid),
          0
        ),
      0
    );
    const balance = roundMoney(
      Math.max(0, toNumber(reservation.totalAmount) - paid)
    );
    if (balance > 0) {
      reservationBalances.push({
        reservationId: reservation.reservationId,
        eventType: reservation.eventType,
        eventDate: reservation.eventDate,
        balance,
      });
      reservationBalanceTotal = roundMoney(reservationBalanceTotal + balance);
    }

    for (const booking of reservation.bookings || []) {
      const after = booking.deposit?.amountAfterDeductions;
      if (after != null && toNumber(after) < 0) {
        const owed = roundMoney(-toNumber(after));
        depositDebts.push({
          reservationId: reservation.reservationId,
          eventType: reservation.eventType,
          eventDate: reservation.eventDate,
          amount: owed,
        });
        depositDebtTotal = roundMoney(depositDebtTotal + owed);
      }
    }
  }

  const address = [
    client.addressLine,
    client.barangay,
    client.city,
    client.province,
  ]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(", ");

  return {
    clientId: client.clientId,
    username: client.username,
    firstName: client.firstName,
    middleName: client.middleName,
    lastName: client.lastName,
    fullName:
      [client.firstName, client.middleName, client.lastName]
        .filter(Boolean)
        .join(" ") || "",
    email: client.email,
    contactNumber: client.contactNumber,
    gender: client.gender,
    birthday: client.birthday,
    addressLine: client.addressLine,
    barangay: client.barangay,
    city: client.city,
    province: client.province,
    address,
    profilePhoto: client.profilePhoto,
    roleName: client.clientRole?.roleName || null,
    organization: client.clientOrg?.organizationName || null,
    accountStatus: client.accountStatus,
    verificationStatus: client.verificationStatus,
    createdAt: client.createdAt,
    remainingBalance: roundMoney(reservationBalanceTotal + depositDebtTotal),
    reservationBalanceTotal,
    depositDebtTotal,
    reservationBalances,
    depositDebts,
  };
}

export async function GET() {
  const guard = await requireApiAuth();
  if (guard.response) return guard.response;

  const clientId = ownClientId(guard.user);
  if (clientId == null) {
    return noCacheJson({ error: "Not a client account" }, { status: 403 });
  }

  try {
    const profile = await loadProfile(clientId);
    if (!profile) {
      return noCacheJson({ error: "Client not found" }, { status: 404 });
    }
    return noCacheJson(profile);
  } catch (error) {
    console.error("Failed to load client profile:", error);
    return noCacheJson(
      { error: "Failed to load client profile" },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  const guard = await requireApiAuth();
  if (guard.response) return guard.response;

  const clientId = ownClientId(guard.user);
  if (clientId == null) {
    return NextResponse.json({ error: "Not a client account" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const existing = await prisma.client.findUnique({ where: { clientId } });
    if (!existing) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const data = {};
    const changedLabels = [];

    if (body.username !== undefined) {
      const username = String(body.username ?? "").trim();
      if (username) {
        const takenByClient = await prisma.client.findUnique({
          where: { username },
          select: { clientId: true },
        });
        const takenByStaff = await prisma.staff.findUnique({
          where: { username },
          select: { staffId: true },
        });
        if (
          (takenByClient && takenByClient.clientId !== clientId) ||
          takenByStaff
        ) {
          return NextResponse.json(
            { error: "That username is already taken." },
            { status: 409 }
          );
        }
        if (username !== existing.username) {
          data.username = username;
          changedLabels.push("username");
        }
      } else if (existing.username) {
        data.username = null;
        changedLabels.push("username");
      }
    }

    if (body.contactNumber !== undefined) {
      const digits = String(body.contactNumber ?? "")
        .replace(/\D/g, "")
        .slice(0, 11);
      if (digits.length !== 11) {
        return NextResponse.json(
          { error: "Contact number must be exactly 11 digits." },
          { status: 400 }
        );
      }
      if (digits !== existing.contactNumber) {
        data.contactNumber = digits;
        changedLabels.push("contact number");
      }
    }

    if (body.newPassword) {
      const currentPassword = String(body.currentPassword ?? "");
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Enter your current password." },
          { status: 400 }
        );
      }
      const matches =
        existing.password &&
        (await bcrypt
          .compare(currentPassword, existing.password)
          .catch(() => false));
      if (!matches) {
        return NextResponse.json(
          { error: "Your current password is incorrect." },
          { status: 400 }
        );
      }
      if (String(body.newPassword) !== String(body.confirmPassword ?? "")) {
        return NextResponse.json(
          { error: "The new passwords do not match." },
          { status: 400 }
        );
      }
      const problem = passwordProblem(String(body.newPassword));
      if (problem) {
        return NextResponse.json({ error: problem }, { status: 400 });
      }
      data.password = await bcrypt.hash(String(body.newPassword), 12);
      data.mustChangePassword = false;
      changedLabels.push("password");
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No changes to save." },
        { status: 400 }
      );
    }

    await prisma.client.update({ where: { clientId }, data });

    const acting = actingAs(guard.user);
    await prisma.auditLog.create({
      data: {
        action: "CLIENT_PROFILE_UPDATED",
        targetUserId: `CLT-${clientId}`,
        targetName: `${existing.firstName} ${existing.lastName}`.trim(),
        performedById: acting.performedBy,
        performedByName: acting.performedByName,
        details: `Client updated their profile: ${changedLabels.join(", ")}.`,
      },
    });

    const profile = await loadProfile(clientId);
    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error("Client profile update error:", error);
    return NextResponse.json(
      { error: "Failed to update your profile" },
      { status: 500 }
    );
  }
}
