import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { formatPhp } from "@/lib/utils";
import {
  consumeDeposit,
  mapDepositSnapshot,
  pulloutDeposit,
} from "@/lib/deposit-utils";

export const dynamic = "force-dynamic";

function parseStaffId(performedBy) {
  if (!performedBy) return null;
  return parseInt(String(performedBy).replace("STF-", ""), 10) || null;
}

async function findBookingId(reservationId) {
  const booking = await prisma.booking.findFirst({
    where: { reservationId },
    include: {
      deposit: {
        include: {
          status: true,
          deductions: { orderBy: { recordedAt: "desc" } },
        },
      },
      reservation: { select: { clientId: true, eventType: true } },
    },
  });
  return booking;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      action,
      reservationId,
      amount,
      reason,
      performedBy,
      performedByName,
    } = body;

    const parsedReservationId = parseInt(reservationId, 10);
    if (!Number.isFinite(parsedReservationId)) {
      return NextResponse.json({ error: "Reservation is required." }, { status: 400 });
    }

    const booking = await findBookingId(parsedReservationId);
    if (!booking) {
      return NextResponse.json({ error: "No booking found for this reservation." }, { status: 404 });
    }

    const staffId = parseStaffId(performedBy);
    const recordedBy = performedByName || "LTOO";

    if (action === "consume") {
      const result = await consumeDeposit(prisma, {
        bookingId: booking.bookingId,
        amount,
        reason,
        staffId,
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      await prisma.auditLog.create({
        data: {
          action: "DEPOSIT_CONSUMED",
          targetUserId: `DEP-${result.deposit.depositId}`,
          targetName: booking.reservation?.eventType || "Deposit",
          performedById: performedBy || "LTOO",
          performedByName: recordedBy,
          details: `Deducted ${formatPhp(result.deduction.amount)} from the 10% deposit. Reason: ${reason}`,
        },
      });

      return NextResponse.json({
        success: true,
        deposit: mapDepositSnapshot(result.deposit),
      });
    }

    if (action === "pullout") {
      const result = await pulloutDeposit(prisma, {
        bookingId: booking.bookingId,
        recordedBy,
        staffId,
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      await prisma.auditLog.create({
        data: {
          action: "DEPOSIT_PULLED_OUT",
          targetUserId: `DEP-${result.deposit.depositId}`,
          targetName: booking.reservation?.eventType || "Deposit",
          performedById: performedBy || "LTOO",
          performedByName: recordedBy,
          details: `Pulled out remaining deposit of ${formatPhp(result.releaseAmount)}.`,
        },
      });

      return NextResponse.json({
        success: true,
        deposit: mapDepositSnapshot(result.deposit),
        releaseAmount: result.releaseAmount,
      });
    }

    return NextResponse.json({ error: "Invalid deposit action." }, { status: 400 });
  } catch (error) {
    console.error("Deposit POST error:", error);
    return NextResponse.json({ error: "Failed to update deposit" }, { status: 500 });
  }
}
