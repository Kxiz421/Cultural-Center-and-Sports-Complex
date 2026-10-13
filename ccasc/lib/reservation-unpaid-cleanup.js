import prisma from "@/lib/prisma";
import { formatDbDate, formatLocalDateKey, roundMoney } from "@/lib/utils";
import { SYSTEM_NOTIFICATION_STAFF_ID } from "@/lib/coordinator-notifications";
import { sendUnpaidReservationReminderEmail } from "@/lib/email";
import { parseWalkInClient, walkInDisplayName } from "@/lib/walk-in";

/**
 * Rule: a reservation that has not received a single cent of payment is
 *   1. reminded {@link UNPAID_REMINDER_DAYS} days before its event, and
 *   2. removed {@link UNPAID_REMOVAL_DAYS} days before its event (so it no
 *      longer appears on the facility calendar).
 */
export const UNPAID_REMINDER_DAYS = 3;
export const UNPAID_REMOVAL_DAYS = 2;

/** Terminal statuses are never touched by the unpaid cleanup. */
const REMOVABLE_EXCLUDED_STATUSES = ["Cancelled", "Declined"];

const CLIENT_RESERVATIONS_LINK = "/panel/client/reservations";
const PDA_CALENDAR_LINK = "/panel/provincial-agency/calendar";

/** Total amount paid across every booking of a reservation. */
export function sumReservationPayments(bookings) {
  return roundMoney(
    (bookings || []).reduce(
      (total, booking) =>
        total +
        (booking.payments || []).reduce(
          (paid, payment) => paid + Number(payment.amountPaid || 0),
          0
        ),
      0
    )
  );
}

/**
 * Whole days from `fromDate` (local calendar day) to the event date. Negative
 * when the event is already in the past.
 */
export function daysUntilEvent(eventDate, fromDate = new Date()) {
  const eventKey = formatDbDate(eventDate);
  if (!eventKey) return null;
  const todayKey = formatLocalDateKey(fromDate);
  const diff =
    Date.parse(`${eventKey}T00:00:00.000Z`) -
    Date.parse(`${todayKey}T00:00:00.000Z`);
  return Math.round(diff / 86400000);
}

function addDays(dateLike, days) {
  const d = new Date(dateLike);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/** Stable marker embedded in reminder messages so a reservation is only ever
 * reminded once (also used to detect an already-sent reminder). */
export function unpaidReminderMarker(reservationId) {
  return `[RES-${reservationId}]`;
}

/** Reservation owes money, has paid nothing at all, and has no excluded status. */
function isUnpaidReservation(reservation) {
  if (!reservation) return false;
  if (REMOVABLE_EXCLUDED_STATUSES.includes(reservation.reservationStatus)) return false;
  if (!(Number(reservation.totalAmount) > 0)) return false;
  return sumReservationPayments(reservation.bookings) <= 0;
}

/** True when the reservation should be reminded now (3 days before the event). */
export function isReminderDueUnpaidReservation(reservation, fromDate = new Date()) {
  if (!isUnpaidReservation(reservation)) return false;
  const days = daysUntilEvent(reservation.eventDate, fromDate);
  if (days === null) return false;
  return days <= UNPAID_REMINDER_DAYS && days > UNPAID_REMOVAL_DAYS;
}

/** True when the reservation should be removed now (2 days before the event). */
export function isRemovableUnpaidReservation(reservation, fromDate = new Date()) {
  if (!isUnpaidReservation(reservation)) return false;
  const days = daysUntilEvent(reservation.eventDate, fromDate);
  if (days === null) return false;
  return days <= UNPAID_REMOVAL_DAYS;
}

const CANDIDATE_SELECT = {
  reservationId: true,
  eventType: true,
  eventDate: true,
  totalAmount: true,
  reservationStatus: true,
  notes: true,
  clientId: true,
  client: { select: { firstName: true, lastName: true, email: true } },
  venue: { select: { venue: true } },
  bookings: { select: { bookingId: true, payments: { select: { amountPaid: true } } } },
};

function fetchUnpaidCandidates() {
  return prisma.reservation.findMany({
    where: {
      reservationStatus: { notIn: REMOVABLE_EXCLUDED_STATUSES },
      totalAmount: { gt: 0 },
    },
    select: CANDIDATE_SELECT,
  });
}

function reservationClientName(reservation) {
  if (reservation.client) {
    const name = `${reservation.client.firstName || ""} ${reservation.client.lastName || ""}`.trim();
    if (name) return name;
  }
  return walkInDisplayName(reservation.notes);
}

/**
 * Send the "no payment yet" reminder for every unpaid reservation whose event
 * is {@link UNPAID_REMINDER_DAYS} days away: a client inbox notification, an
 * email to the client's address, and an inbox notification to the PDA
 * (provincial agency accounts). Each reservation is reminded only once - the
 * marker embedded in the first notification blocks repeats.
 *
 * @returns {Promise<{ remindedIds: number[] }>}
 */
export async function sendUnpaidReminderNotifications({ now = new Date() } = {}) {
  const candidates = (await fetchUnpaidCandidates()).filter((r) =>
    isReminderDueUnpaidReservation(r, now)
  );
  if (candidates.length === 0) return { remindedIds: [] };

  const pdaClients = await prisma.client.findMany({
    where: { clientRoleId: "PROV" },
    select: { clientId: true },
  });

  const remindedIds = [];

  for (const reservation of candidates) {
    const marker = unpaidReminderMarker(reservation.reservationId);

    const alreadySent = await prisma.notification.findFirst({
      where: { message: { contains: marker } },
      select: { notificationId: true },
    });
    if (alreadySent) continue;

    const eventDateKey = formatDbDate(reservation.eventDate);
    const removalDateKey = formatDbDate(addDays(reservation.eventDate, -UNPAID_REMOVAL_DAYS));
    const venueName = reservation.venue?.venue || "the venue";
    const clientName = reservationClientName(reservation);
    const eventType = reservation.eventType || "your scheduled event";
    const minimumDue = roundMoney(Number(reservation.totalAmount) * 0.6);

    // Client inbox notification (also the reminder marker for this reservation).
    if (reservation.clientId != null) {
      await prisma.notification.create({
        data: {
          clientId: reservation.clientId,
          staffId: SYSTEM_NOTIFICATION_STAFF_ID,
          type: "payment",
          message:
            `Reminder ${marker}: your reservation for "${eventType}" at ${venueName} ` +
            `on ${eventDateKey} still has no payment. Please settle at least ` +
            `the 50% down payment and 10% deposit before ${removalDateKey}; ` +
            `otherwise the reservation will be automatically cancelled and removed 2 days before the event.`,
          link: CLIENT_RESERVATIONS_LINK,
          sentAt: new Date(),
        },
      });
    }

    // PDA (provincial agency accounts) inbox notifications.
    if (pdaClients.length > 0) {
      await prisma.notification.createMany({
        data: pdaClients.map((pc) => ({
          clientId: pc.clientId,
          staffId: SYSTEM_NOTIFICATION_STAFF_ID,
          type: "payment",
          message:
            `Payment reminder ${marker}: reservation "${eventType}" at ${venueName} on ` +
            `${eventDateKey} (${clientName}) still has no payment recorded. It will be ` +
            `automatically cancelled if unpaid before ${removalDateKey}.`,
          link: PDA_CALENDAR_LINK,
          sentAt: new Date(),
        })),
      });
    }

    // Email to the client (registered account, or walk-in contact on file).
    const email = reservation.client?.email || parseWalkInClient(reservation.notes).email;
    if (email) {
      await sendUnpaidReservationReminderEmail(email, {
        clientName,
        eventType,
        venue: venueName,
        eventDate: eventDateKey,
        removalDate: removalDateKey,
        reservationRef: `RES-${reservation.reservationId}`,
        amountDue: minimumDue,
      });
    }

    remindedIds.push(reservation.reservationId);
  }

  return { remindedIds };
}

/**
 * Remove every unpaid reservation whose event is within {@link UNPAID_REMOVAL_DAYS}
 * days. Deletes children first so referential integrity holds, and records an
 * audit log per removed reservation.
 *
 * @returns {Promise<{ removedIds: number[], removedCount: number }>}
 */
export async function removeUnpaidReservationsDueSoon({ now = new Date() } = {}) {
  const candidates = (await fetchUnpaidCandidates()).filter((r) =>
    isRemovableUnpaidReservation(r, now)
  );
  if (candidates.length === 0) return { removedIds: [], removedCount: 0 };

  const reservationIds = candidates.map((r) => r.reservationId);
  const bookingIds = candidates.flatMap((r) => r.bookings.map((b) => b.bookingId));

  await prisma.$transaction(async (tx) => {
    await tx.schedule.deleteMany({
      where: {
        OR: [
          { reservationId: { in: reservationIds } },
          ...(bookingIds.length > 0 ? [{ bookingId: { in: bookingIds } }] : []),
        ],
      },
    });
    await tx.rescheduleRequest.deleteMany({
      where: { reservationId: { in: reservationIds } },
    });
    await tx.letterStatus.deleteMany({
      where: { reservationId: { in: reservationIds } },
    });
    if (bookingIds.length > 0) {
      // Deposit and DepositDeduction cascade from Booking.
      await tx.booking.deleteMany({ where: { bookingId: { in: bookingIds } } });
    }
    // ReservationDate and ReservedParticular cascade from Reservation.
    const deleteResult = await tx.reservation.deleteMany({
      where: { reservationId: { in: reservationIds } },
    });

    // Guards against a concurrent cleanup removing the same rows first.
    if (deleteResult.count === reservationIds.length) {
      await tx.auditLog.createMany({
        data: candidates.map((r) => ({
          action: "RESERVATION_REMOVED_UNPAID",
          targetUserId: `RES-${r.reservationId}`,
          targetName: `Reservation #${r.reservationId}`,
          performedById: "SYSTEM",
          performedByName: "System",
          details:
            `Reservation #${r.reservationId} for "${r.eventType}" at ` +
            `${r.venue?.venue || "venue"} on ${formatDbDate(r.eventDate)} was removed: ` +
            `no payment was recorded within ${UNPAID_REMOVAL_DAYS} days of the event.`,
        })),
      });
    }
  });

  return { removedIds: reservationIds, removedCount: reservationIds.length };
}

/**
 * Apply the full unpaid-reservation rule: remind reservations due in
 * {@link UNPAID_REMINDER_DAYS} days, then remove reservations due in
 * {@link UNPAID_REMOVAL_DAYS} days.
 */
export async function processUnpaidReservationRule({ now = new Date() } = {}) {
  const reminders = await sendUnpaidReminderNotifications({ now });
  const removed = await removeUnpaidReservationsDueSoon({ now });
  return { ...reminders, ...removed };
}
