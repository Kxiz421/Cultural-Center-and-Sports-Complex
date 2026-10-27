/**
 * Report eligibility.
 *
 * A reservation only counts toward the generated reports once the client has
 * paid at least the 50% down payment (or has fully settled the balance).
 * Reservations with no payment at all are excluded as well, so a report never
 * lists an activity that has not been paid for yet.
 */
import { computePaymentBreakdown } from "@/lib/payment-utils";

export function reservationPayments(reservation) {
  return (reservation?.bookings || []).flatMap(
    (booking) => booking.payments || []
  );
}

export function isReservationReportEligible(reservation) {
  const payments = reservationPayments(reservation);
  const paid = payments.reduce(
    (sum, payment) => sum + Number(payment.amountPaid || 0),
    0
  );
  if (paid <= 0) return false;

  const originalBase = Number(reservation?.totalAmount || 0);
  if (originalBase <= 0) return true;

  const totalDiscount = payments.reduce(
    (sum, payment) => sum + Number(payment.discountAmount || 0),
    0
  );
  const breakdown = computePaymentBreakdown(originalBase, paid, null, {
    originalBase,
    totalDiscount,
  });
  return breakdown.downPaymentMet || breakdown.balanceSettled;
}
