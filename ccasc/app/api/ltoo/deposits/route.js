import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { formatDbDate, formatPhp, roundMoney } from "@/lib/utils";
import {
  consumeDeposit,
  getDepositOutstanding,
  getDepositRemaining,
  mapDepositSnapshot,
  pulloutDeposit,
  settleDepositBalance,
} from "@/lib/deposit-utils";
import { notifyClientEvent } from "@/lib/client-progress-notifications";

import { requireApiAuth, actingAs } from "@/lib/api-auth";
export const dynamic = "force-dynamic";

function parseStaffId(performedBy) {
  if (!performedBy) return null;
  return parseInt(String(performedBy).replace("STF-", ""), 10) || null;
}

/** Build the reservation context string + email rows used in client notifications. */
function reservationContext(reservation, reservationId) {
  const eventDate = reservation?.eventDate ? formatDbDate(reservation.eventDate) : null;
  const venue = reservation?.venue?.venue || null;
  const text = [
    reservation?.eventType ? `"${reservation.eventType}"` : null,
    eventDate ? `on ${eventDate}` : null,
    venue ? `at ${venue}` : null,
    reservationId ? `(Reservation #${reservationId})` : null,
  ]
    .filter(Boolean)
    .join(" ");
  const rows = [
    ...(reservation?.eventType ? [{ label: "Event", value: reservation.eventType }] : []),
    ...(eventDate ? [{ label: "Event date", value: eventDate }] : []),
    ...(venue ? [{ label: "Venue", value: venue }] : []),
    ...(reservationId ? [{ label: "Reference", value: `RES-${reservationId}` }] : []),
  ];
  return { text, rows };
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
      reservation: {
        select: {
          clientId: true,
          eventType: true,
          eventDate: true,
          eventStatus: true,
          venue: { select: { venue: true } },
          additionalDates: { select: { eventDate: true } },
        },
      },
    },
  });
  return booking;
}

export async function POST(request) {
  const guard = await requireApiAuth(["local treasury operations officer","admin"]);
  if (guard.response) return guard.response;
  const acting = actingAs(guard.user);

  try {
    const body = await request.json();
    const {
      action,
      reservationId,
      amount,
      reason,
    } = body;

    const parsedReservationId = parseInt(reservationId, 10);
    if (!Number.isFinite(parsedReservationId)) {
      return NextResponse.json({ error: "Reservation is required." }, { status: 400 });
    }

    const booking = await findBookingId(parsedReservationId);
    if (!booking) {
      return NextResponse.json({ error: "No booking found for this reservation." }, { status: 404 });
    }

    const staffId = parseStaffId(acting.performedBy);
    const recordedBy = acting.performedByName || "LTOO";

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
          performedById: acting.performedBy,
          performedByName: recordedBy,
          details: `Deducted ${formatPhp(result.deduction.amount)} from the 10% deposit. Reason: ${reason}`,
        },
      });

      const clientId = booking.reservation?.clientId;
      if (clientId) {
        const outstanding = getDepositOutstanding(result.deposit);
        const remaining = getDepositRemaining(result.deposit);
        const ctx = reservationContext(booking.reservation, parsedReservationId);
        const overLimit = outstanding > 0;
        const message =
          `A deduction of ${formatPhp(result.deduction.amount)} was applied to your 10% deposit` +
          `${ctx.text ? ` for ${ctx.text}` : ""} (reason: ${result.deduction.reason}).` +
          (overLimit
            ? ` This exceeds the amount held, leaving an outstanding balance of ${formatPhp(outstanding)}.`
            : ` Remaining deposit: ${formatPhp(remaining)}.`);

        await notifyClientEvent({
          clientId,
          type: "payment",
          message,
          email: {
            subject: overLimit
              ? "Deposit Deduction — Outstanding Balance - CSASC"
              : "10% Deposit Deduction - CSASC",
            heading: overLimit ? "⚠️ Deposit Deduction — Balance Due" : "🧾 Deposit Deduction",
            accent: overLimit ? "#dc2626" : "#2563eb",
            intro: overLimit
              ? "A deduction was applied to your 10% deposit and went beyond the amount you paid."
              : "A deduction was applied to your 10% deposit.",
            rows: [
              { label: "Deduction", value: formatPhp(result.deduction.amount) },
              { label: "Reason", value: result.deduction.reason },
              ...ctx.rows,
              { label: "Remaining deposit", value: formatPhp(remaining) },
              ...(overLimit
                ? [{ label: "Outstanding balance", value: formatPhp(outstanding) }]
                : []),
            ],
            note: overLimit
              ? `Please settle the outstanding balance of ${formatPhp(outstanding)} at the Local Treasury Operations Office. You cannot reserve a new event until this balance is settled.`
              : undefined,
          },
          sms: message,
        });
      }

      return NextResponse.json({
        success: true,
        deposit: mapDepositSnapshot(result.deposit),
      });
    }

    if (action === "pullout") {
      const res = booking.reservation;
      const eventDate = res?.eventDate ? formatDbDate(res.eventDate) : null;
      const additionalDates = res?.additionalDates || null;
      const eventStatus = res?.eventStatus || null;

      const result = await pulloutDeposit(prisma, {
        bookingId: booking.bookingId,
        recordedBy,
        staffId,
        eventDate,
        additionalDates,
        eventStatus,
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      await prisma.auditLog.create({
        data: {
          action: "DEPOSIT_PULLED_OUT",
          targetUserId: `DEP-${result.deposit.depositId}`,
          targetName: booking.reservation?.eventType || "Deposit",
          performedById: acting.performedBy,
          performedByName: recordedBy,
          details: `Pulled out remaining deposit of ${formatPhp(result.releaseAmount)}.`,
        },
      });

      const clientId = booking.reservation?.clientId;
      if (clientId) {
        const ctx = reservationContext(booking.reservation, parsedReservationId);
        const message = `Your remaining 10% deposit of ${formatPhp(result.releaseAmount)} has been pulled out${
          ctx.text ? ` for ${ctx.text}` : ""
        }.`;

        await notifyClientEvent({
          clientId,
          type: "payment",
          message,
          email: {
            subject: "10% Deposit Pulled Out - CSASC",
            heading: "💸 10% Deposit Pulled Out",
            accent: "#059669",
            intro: "Your remaining 10% deposit has been released.",
            rows: [
              { label: "Amount released", value: formatPhp(result.releaseAmount) },
              ...ctx.rows,
            ],
            note: "This confirms the release of your remaining deposit after the event has ended.",
          },
          sms: message,
        });
      }

      return NextResponse.json({
        success: true,
        deposit: mapDepositSnapshot(result.deposit),
        releaseAmount: result.releaseAmount,
      });
    }

    if (action === "settle") {
      const result = await settleDepositBalance(prisma, {
        bookingId: booking.bookingId,
        amount:
          amount === undefined || amount === null || amount === ""
            ? null
            : roundMoney(amount),
        recordedBy,
        staffId,
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      await prisma.auditLog.create({
        data: {
          action: "DEPOSIT_BALANCE_SETTLED",
          targetUserId: `DEP-${result.deposit.depositId}`,
          targetName: booking.reservation?.eventType || "Deposit",
          performedById: acting.performedBy,
          performedByName: recordedBy,
          details: `Settled outstanding deposit balance of ${formatPhp(result.settledAmount)}.`,
        },
      });

      const clientId = booking.reservation?.clientId;
      if (clientId) {
        const outstanding = getDepositOutstanding(result.deposit);
        const ctx = reservationContext(booking.reservation, parsedReservationId);
        const message =
          `Your outstanding 10% deposit balance of ${formatPhp(result.settledAmount)} has been settled${
            ctx.text ? ` for ${ctx.text}` : ""
          }.` +
          (outstanding > 0 ? ` Remaining balance: ${formatPhp(outstanding)}.` : " Thank you.");

        await notifyClientEvent({
          clientId,
          type: "payment",
          message,
          email: {
            subject: "Deposit Balance Settled - CSASC",
            heading: "✅ Deposit Balance Settled",
            accent: "#059669",
            intro: "Your outstanding deposit balance has been settled.",
            rows: [
              { label: "Amount settled", value: formatPhp(result.settledAmount) },
              ...ctx.rows,
              { label: "Remaining balance", value: formatPhp(outstanding) },
            ],
            note:
              outstanding > 0
                ? undefined
                : "Your deposit account is now fully settled. Thank you.",
          },
          sms: message,
        });
      }

      return NextResponse.json({
        success: true,
        deposit: mapDepositSnapshot(result.deposit),
        settledAmount: result.settledAmount,
      });
    }

    return NextResponse.json({ error: "Invalid deposit action." }, { status: 400 });
  } catch (error) {
    console.error("Deposit POST error:", error);
    return NextResponse.json({ error: "Failed to update deposit" }, { status: 500 });
  }
}
