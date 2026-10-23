import prisma from "@/lib/prisma";
import { formatDbDate, formatLocalDateKey, formatPhp, roundMoney } from "@/lib/utils";
import { notifyClientEvent } from "@/lib/client-progress-notifications";

/**
 * Deadline reminders for the full payment.
 *
 * The full balance is due 2 days before the event. Clients/PDA accounts are
 * warned by in-app notice + email + SMS at each of {@link BALANCE_REMINDER_DAYS}
 * days before the event (once per milestone).
 */
export const BALANCE_REMINDER_DAYS = [2, 3, 7];

const ACTIVE_STATUSES = ["Pending", "Confirmed"];

/** Whole days from today to the event (negative once the event has passed). */
function daysUntilEvent(eventDate, now = new Date()) {
  const eventKey = formatDbDate(eventDate);
  if (!eventKey) return null;
  const todayKey = formatLocalDateKey(now);
  const diff =
    Date.parse(`${eventKey}T00:00:00.000Z`) -
    Date.parse(`${todayKey}T00:00:00.000Z`);
  return Math.round(diff / 86400000);
}

function addDaysUtc(dateLike, days) {
  const d = new Date(dateLike);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function balanceMarker(reservationId, milestone) {
  return `[BAL-${milestone}:RES-${reservationId}]`;
}

/**
 * Send the balance-deadline reminders that are due now.
 *
 * Runs cheaply on each reservations read (same pattern as the unpaid rule) and
 * relies on an embedded marker so each milestone is only sent once.
 *
 * @returns {Promise<{ remindedIds: number[] }>}
 */
export async function processBalanceDeadlineReminders({ now = new Date() } = {}) {
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const lastDay = addDaysUtc(today, Math.max(...BALANCE_REMINDER_DAYS));

  const reservations = await prisma.reservation.findMany({
    where: {
      reservationStatus: { in: ACTIVE_STATUSES },
      clientId: { not: null },
      eventDate: { gte: today, lte: lastDay },
    },
    select: {
      reservationId: true,
      eventType: true,
      eventDate: true,
      totalAmount: true,
      clientId: true,
      venue: { select: { venue: true } },
      bookings: { select: { payments: { select: { amountPaid: true } } } },
    },
  });

  const remindedIds = [];

  for (const r of reservations) {
    const total = roundMoney(Number(r.totalAmount) || 0);
    if (total <= 0) continue;

    const paid = roundMoney(
      (r.bookings || []).reduce(
        (sum, booking) =>
          sum +
          (booking.payments || []).reduce(
            (p, payment) => p + Number(payment.amountPaid || 0),
            0
          ),
        0
      )
    );
    const totalPayable = roundMoney(total * 1.1);
    if (paid >= totalPayable) continue; // fully settled

    const days = daysUntilEvent(r.eventDate, now);
    if (days == null || days < 0) continue;

    // Smallest milestone that applies (2, then 3, then 7).
    const milestone = BALANCE_REMINDER_DAYS.find((d) => days <= d);
    if (!milestone) continue;

    const marker = balanceMarker(r.reservationId, milestone);
    const alreadySent = await prisma.notification.findFirst({
      where: { message: { contains: marker } },
      select: { notificationId: true },
    });
    if (alreadySent) continue;

    const eventDateKey = formatDbDate(r.eventDate);
    const balanceDeadline = formatDbDate(addDaysUtc(r.eventDate, -2));
    const remaining = roundMoney(Math.max(0, totalPayable - paid));
    const venue = r.venue?.venue || "the venue";
    const ref = `RES-${r.reservationId}`;

    await notifyClientEvent({
      clientId: r.clientId,
      type: "payment",
      message:
        `${marker} Payment reminder: the full payment balance of ` +
        `${formatPhp(remaining)} for "${r.eventType}" at ${venue} on ` +
        `${eventDateKey} (${ref}) is due by ${balanceDeadline}, two days ` +
        `before your event. Please settle it at the cashier, Provincial ` +
        `Treasurer's Office.`,
      email: {
        subject: `Payment Deadline Reminder: ${ref} - CSASC`,
        heading: "⏳ Full Payment Due",
        accent: "#f59e0b",
        intro:
          `This is a reminder that the full payment for your reservation is ` +
          `due by ${balanceDeadline}, which is two days before your event.`,
        rows: [
          { label: "Reference", value: ref },
          { label: "Event", value: r.eventType },
          { label: "Venue", value: venue },
          { label: "Event date", value: eventDateKey },
          { label: "Remaining balance", value: formatPhp(remaining) },
          { label: "Pay by", value: balanceDeadline },
        ],
        note:
          "Please settle the remaining balance at the cashier, Provincial " +
          "Treasurer's Office, on or before the date above.",
      },
      sms:
        `CSASC ${ref}: Your full payment balance of ${formatPhp(remaining)} ` +
        `for "${r.eventType}" on ${eventDateKey} is due by ${balanceDeadline}. ` +
        `Settle at the Provincial Treasurer's Office cashier.`,
    });

    remindedIds.push(r.reservationId);
  }

  return { remindedIds };
}
