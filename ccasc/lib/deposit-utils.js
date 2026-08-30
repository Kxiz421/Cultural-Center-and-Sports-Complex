import { roundMoney } from "@/lib/utils";

/** Status names that mean the deposit obligation is satisfied (no longer unpaid). */
export const DEPOSIT_SATISFIED_STATUSES = ["Held", "Refunded", "Forfeited"];

/**
 * Whether a Deposit row indicates the 10% deposit has been met.
 * @param {{ amountPaid?: number|string|null, requiredAmount?: number|string|null, status?: { status?: string }|null }|null} deposit
 */
export function isDepositRecordMet(deposit) {
  if (!deposit) return false;
  const statusName = deposit.status?.status || deposit.statusName || null;
  if (statusName && DEPOSIT_SATISFIED_STATUSES.includes(statusName)) return true;
  const paid = roundMoney(deposit.amountPaid || 0);
  const required = roundMoney(deposit.requiredAmount || 0);
  return required > 0 && paid >= required;
}

/** Ensure a Pending Deposit exists for a booking (idempotent upsert by bookingId). */
export async function ensurePendingDeposit(prisma, {
  bookingId,
  requiredAmount,
  staffId = null,
}) {
  const amount = roundMoney(requiredAmount || 0);
  if (!bookingId || amount <= 0) return null;

  const existing = await prisma.deposit.findUnique({
    where: { bookingId },
    include: { status: true },
  });
  if (existing) return existing;

  let pendingStatus = await prisma.depositStatus.findFirst({
    where: { status: "Pending" },
  });
  if (!pendingStatus) {
    pendingStatus = await prisma.depositStatus.create({
      data: { status: "Pending" },
    });
  }

  return prisma.deposit.create({
    data: {
      bookingId,
      requiredAmount: amount,
      amountPaid: 0,
      depositStatusId: pendingStatus.depositStatusId,
      staffId: staffId || null,
    },
    include: { status: true },
  });
}

/**
 * Mark deposit as Held when a deposit / both payment is recorded.
 * Creates the row if missing.
 */
export async function recordDepositPayment(prisma, {
  bookingId,
  requiredAmount,
  paymentId,
  staffId = null,
  notes = null,
}) {
  const amount = roundMoney(requiredAmount || 0);
  if (!bookingId || amount <= 0) return null;

  let heldStatus = await prisma.depositStatus.findFirst({
    where: { status: "Held" },
  });
  if (!heldStatus) {
    heldStatus = await prisma.depositStatus.create({
      data: { status: "Held" },
    });
  }

  const existing = await prisma.deposit.findUnique({
    where: { bookingId },
  });

  if (existing) {
    return prisma.deposit.update({
      where: { depositId: existing.depositId },
      data: {
        requiredAmount: amount,
        amountPaid: amount,
        depositStatusId: heldStatus.depositStatusId,
        paymentId: paymentId || existing.paymentId,
        staffId: staffId ?? existing.staffId,
        notes: notes ?? existing.notes,
      },
      include: { status: true },
    });
  }

  return prisma.deposit.create({
    data: {
      bookingId,
      requiredAmount: amount,
      amountPaid: amount,
      depositStatusId: heldStatus.depositStatusId,
      paymentId: paymentId || null,
      staffId: staffId || null,
      notes,
    },
    include: { status: true },
  });
}
