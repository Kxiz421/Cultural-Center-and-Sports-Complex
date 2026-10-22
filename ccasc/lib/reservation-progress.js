import { formatPhp, roundMoney } from "@/lib/utils";

/**
 * Reservation progress model.
 *
 * Turns a formatted reservation (from `/api/reservations`) plus the document
 * `phase` (from `/api/documents?reservationId=`) into the ordered steps of the
 * booking process, a colour "tone", and the instruction the client should see.
 *
 * The client process:
 *
 *   1. Reservation Submitted        (always done — the reservation exists)
 *   2. Order of Payment             pay 50% down + 10% deposit, Provincial Treasurer's Office
 *   3. Submit Documents             Certification + Contract of Lease (CC) / Official Receipt (SC)
 *   4. Booking Confirmed            coordinator confirms after documents are verified
 *   5. Final Balance Settled        settle the remaining balance before the event
 *   6. Reservation Complete         "all set"
 *
 * Tone:
 *   "yellow"    waiting on the client (default in-progress)
 *   "red"       a requirement is unmet and its deadline is within
 *               {@link DEADLINE_WARN_DAYS} days (or already past), or the
 *               reservation was cancelled/declined
 *   "green"     every step is complete
 *
 * Kept Prisma-free so the client screens (and tests) can share one rule, like
 * `lib/reschedule-scope.js`.
 */

/** A requirement counts as urgent when its deadline is this close or closer. */
export const DEADLINE_WARN_DAYS = 3;

/** Payment statuses that mean the 50% down payment at least has been recorded. */
const DOWN_PAYMENT_STATUSES = ["DownPaymentPaid", "DepositPaid", "BalanceSettled"];

const TERMINAL_STATUSES = ["Cancelled", "Declined"];

/** First 10 chars of an ISO-ish date, as a YYYY-MM-DD key. */
function dateKey(value) {
  if (!value) return null;
  const match = String(value).trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

/** Whole days from today to `value` (negative once the date has passed). */
export function daysUntil(value, from = new Date()) {
  const key = dateKey(value);
  if (!key) return null;
  const target = new Date(`${key}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date(from);
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
}

function isDeadlineNear(value) {
  const days = daysUntil(value);
  return days != null && days <= DEADLINE_WARN_DAYS;
}

/** Human label for the documents this venue requires. */
export function documentsRequiredLabel(isSportsComplex) {
  return isSportsComplex
    ? "Official Receipt"
    : "Certification & Contract of Lease";
}

/** True when every required document has been verified. */
function documentsComplete(phase) {
  if (!phase) return false;
  if (phase.isSportsComplex) return phase.receiptStatus === "Verified";
  return phase.certStatus === "Verified" && phase.leaseStatus === "Verified";
}

/** True when at least one required document is awaiting review. */
function documentsPending(phase) {
  if (!phase) return false;
  if (phase.isSportsComplex) return phase.receiptStatus === "Pending";
  return phase.certStatus === "Pending" || phase.leaseStatus === "Pending";
}

/**
 * @param {object} input
 * @param {object} input.reservation  a reservation from `/api/reservations`
 * @param {object|null} [input.documentsPhase]  the `phase` from `/api/documents`
 * @returns {{
 *   steps: { key: string, title: string, done: boolean, current: boolean }[],
 *   currentIndex: number,
 *   tone: "yellow"|"red"|"green"|"cancelled",
 *   headline: string,
 *   urgency: string,
 *   instruction: string,
 *   isComplete: boolean,
 *   documentsRequired: string,
 *   totals: object,
 * }}
 */
export function computeReservationProgress({ reservation, documentsPhase = null } = {}) {
  const r = reservation || {};
  const totalAmount = roundMoney(Number(r.totalAmount) || 0);
  const amountPaid = roundMoney(Number(r.amountPaid) || 0);
  const totalPayable = roundMoney(totalAmount * 1.1);
  const balance = roundMoney(Math.max(0, totalAmount - amountPaid));
  const remainingPayable = roundMoney(Math.max(0, totalPayable - amountPaid));
  const requiredDownPayment = roundMoney(
    Number(r.requiredDownPayment) || totalAmount * 0.5
  );
  const requiredDeposit = roundMoney(
    Number(r.requiredDeposit) || totalAmount * 0.1
  );

  const paymentStatus = r.paymentStatus || "Pending";
  const reservationStatus = String(r.status || "Pending");
  const bookingStatus = String(r.bookingStatus || "Unbooked");

  const isSportsComplex =
    documentsPhase?.isSportsComplex ?? Number(r.venueId) === 2;
  const documentsRequired = documentsRequiredLabel(isSportsComplex);

  const cancelled =
    TERMINAL_STATUSES.includes(reservationStatus) || bookingStatus === "Cancelled";

  const nothingToPay = totalAmount <= 0;
  // Sports Complex reservations are processed by the Program Coordinator, so
  // "Reservation Submitted" and "Order of Payment" are already handled for the
  // client/PDA — they show as done and the flow starts at the Official Receipt.
  const orderOfPaymentDone =
    isSportsComplex ||
    nothingToPay ||
    DOWN_PAYMENT_STATUSES.includes(paymentStatus) ||
    (requiredDownPayment > 0 && amountPaid >= requiredDownPayment);
  const documentsDone = documentsComplete(documentsPhase);
  // Only the Program Coordinator's confirmation marks this step done: recording
  // a full payment also flips the booking row to "Confirmed", which must not
  // turn this step green.
  const bookingConfirmedDone = reservationStatus === "Confirmed";
  const finalBalanceDone =
    nothingToPay ||
    paymentStatus === "BalanceSettled" ||
    (totalPayable > 0 && amountPaid >= totalPayable);

  // Venue-specific process order. Cultural Center settles the full balance
  // before uploading the Certification & Contract of Lease; Sports Complex
  // submits the Official Receipt first, then settles the balance last.
  const steps = isSportsComplex
    ? [
        { key: "submitted", title: "Reservation Submitted", done: true },
        { key: "order-of-payment", title: "Order of Payment", done: orderOfPaymentDone },
        { key: "documents", title: "Submit Documents", done: documentsDone },
        { key: "booking-confirmed", title: "Booking Confirmed", done: bookingConfirmedDone },
        { key: "final-balance", title: "Final Balance Settled", done: finalBalanceDone },
      ]
    : [
        { key: "submitted", title: "Reservation Submitted", done: true },
        { key: "order-of-payment", title: "Order of Payment", done: orderOfPaymentDone },
        { key: "final-balance", title: "Financial Balance Settled", done: finalBalanceDone },
        { key: "documents", title: "Submit Documents", done: documentsDone },
        { key: "booking-confirmed", title: "Booking Confirmed", done: bookingConfirmedDone },
      ];

  const allDone = steps.every((s) => s.done);
  const isComplete = allDone && !cancelled;

  // First unfinished step; steps.length means everything is done.
  let currentIndex = steps.findIndex((s) => !s.done);
  if (currentIndex === -1) currentIndex = steps.length;

  // Tone (colour).
  let tone = "yellow";
  if (cancelled) {
    tone = "cancelled";
  } else if (isComplete) {
    tone = "green";
  } else {
    const downUrgent = !orderOfPaymentDone && isDeadlineNear(r.downPaymentDeadline);
    const balanceUrgent =
      orderOfPaymentDone &&
      !finalBalanceDone &&
      isDeadlineNear(r.balanceDeadline);
    if (downUrgent || balanceUrgent) tone = "red";
  }

  // Copy.
  let headline;
  let instruction;
  let urgency = "";

  if (cancelled) {
    headline = "Reservation Cancelled";
    instruction = `This reservation was ${
      reservationStatus === "Declined" ? "declined" : "cancelled"
    }. If you believe this is a mistake, please contact the Provincial Treasurer's Office, or start a new reservation.`;
  } else if (isComplete) {
    headline = "Reservation Complete";
    instruction = `Your reservation is all set! All payments and requirements are complete. Present this booking summary and your Order of Payment on the event date.`;
  } else {
    headline = steps[currentIndex]?.title || "In Progress";
    const currentKey = steps[currentIndex]?.key;
    if (currentKey === "order-of-payment") {
      instruction = `Pay your Order of Payment at the cashier, Provincial Treasurer's Office. Bring a copy of your Order of Payment (Control No. ${
        r.id || ""
      }). Required: 50% down payment (${formatPhp(
        requiredDownPayment
      )}) and 10% deposit (${formatPhp(requiredDeposit)}). Due by ${
        r.downPaymentDeadline || "the down payment deadline"
      }.`;
    } else if (currentKey === "final-balance") {
      instruction = `Settle the remaining balance of ${formatPhp(
        remainingPayable
      )} at the Provincial Treasurer's Office cashier. Recording your full payment unlocks the next steps. Due by ${
        r.balanceDeadline || "the balance deadline"
      }.`;
    } else if (currentKey === "documents") {
      if (documentsPending(documentsPhase)) {
        instruction = `Your ${documentsRequired} is awaiting review by the Program Coordinator. You'll be notified once it is verified.`;
      } else if (isSportsComplex) {
        instruction = `Submit your ${documentsRequired} for review from the Documents page.`;
      } else {
        instruction = `Your payment is complete. Submit your ${documentsRequired} for review from the Documents page — the Program Coordinator verifies them before confirming your booking.`;
      }
    } else if (currentKey === "booking-confirmed") {
      instruction =
        "Your documents are verified. The Program Coordinator will confirm your booking shortly — you'll be notified once it's confirmed.";
    } else {
      instruction = "";
    }

    if (tone === "red") {
      urgency = "Deadline approaching — action needed to avoid cancellation.";
    }
  }

  return {
    steps: steps.map((s, i) => ({
      ...s,
      current: i === currentIndex && !isComplete && !cancelled,
    })),
    currentIndex,
    tone,
    headline,
    urgency,
    instruction,
    isComplete,
    documentsRequired,
    totals: {
      totalAmount,
      amountPaid,
      balance,
      totalPayable,
      remainingPayable,
      requiredDownPayment,
      requiredDeposit,
    },
  };
}
