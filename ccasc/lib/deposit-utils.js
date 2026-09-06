import { formatPhp, roundMoney } from "@/lib/utils";

/** Status names that mean the deposit obligation is satisfied (no longer unpaid). */
export const DEPOSIT_SATISFIED_STATUSES = [
  "Held",
  "Refunded",
  "Forfeited",
  "Deducted",
  "Fully Deducted",
  "Pulled Out",
];

export const DEPOSIT_CONSUMABLE_STATUSES = ["Held", "Deducted"];
export const DEPOSIT_PULLOUT_STATUSES = ["Held", "Deducted"];

/** Deduction reasons may contain letters and spaces only. */
export function sanitizeDeductionReason(raw) {
  return String(raw ?? "").replace(/[^\p{L}\s]/gu, "");
}

export function validateDeductionReason(reason) {
  const cleaned = sanitizeDeductionReason(reason).replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return { ok: false, error: "Enter a reason for the deduction. Letters only." };
  }
  return { ok: true, reason: cleaned };
}

/**
 * Whether a Deposit row indicates the 10% deposit has been met.
 * @param {{ amountPaid?: number|string|null, requiredAmount?: number|string|null, status?: { status?: string }|null }|null} deposit
 */
export function isDepositRecordMet(deposit) {
  if (!deposit) return false;
  const statusName =
    (typeof deposit.status === "string" ? deposit.status : deposit.status?.status) ||
    deposit.statusName ||
    null;
  if (statusName && DEPOSIT_SATISFIED_STATUSES.includes(statusName)) return true;
  const paid = roundMoney(deposit.amountPaid || 0);
  const required = roundMoney(deposit.requiredAmount || 0);
  return required > 0 && paid >= required;
}

export function getDepositRemaining(deposit) {
  if (!deposit) return 0;
  if (deposit.amountAfterDeductions != null) {
    return roundMoney(deposit.amountAfterDeductions);
  }
  return roundMoney(deposit.requiredAmount || deposit.amountPaid || 0);
}

export function mapDepositSnapshot(deposit) {
  if (!deposit) return null;
  const deductions = (deposit.deductions || []).map((row) => ({
    deductionId: row.deductionId,
    amount: roundMoney(row.amount),
    reason: row.reason || "",
    recordedAt: row.recordedAt,
  }));
  const remaining = getDepositRemaining(deposit);
  return {
    depositId: deposit.depositId,
    requiredAmount: roundMoney(deposit.requiredAmount),
    amountPaid: roundMoney(deposit.amountPaid),
    amountAfterDeductions: remaining,
    status: deposit.status?.status || deposit.statusName || null,
    notes: deposit.notes || null,
    pulledOutAt: deposit.pulledOutAt || null,
    deductions,
  };
}

async function getOrCreateDepositStatus(prisma, status) {
  let record = await prisma.depositStatus.findFirst({ where: { status } });
  if (!record) {
    record = await prisma.depositStatus.create({ data: { status } });
  }
  return record;
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
    include: { status: true, deductions: { orderBy: { recordedAt: "desc" } } },
  });
  if (existing) return existing;

  const pendingStatus = await getOrCreateDepositStatus(prisma, "Pending");

  return prisma.deposit.create({
    data: {
      bookingId,
      requiredAmount: amount,
      amountPaid: 0,
      amountAfterDeductions: amount,
      depositStatusId: pendingStatus.depositStatusId,
      staffId: staffId || null,
    },
    include: { status: true, deductions: true },
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

  const heldStatus = await getOrCreateDepositStatus(prisma, "Held");

  const existing = await prisma.deposit.findUnique({
    where: { bookingId },
    include: { status: true, deductions: true },
  });

  if (existing) {
    const alreadySatisfied = isDepositRecordMet(existing);
    return prisma.deposit.update({
      where: { depositId: existing.depositId },
      data: {
        requiredAmount: alreadySatisfied ? existing.requiredAmount : amount,
        amountPaid: alreadySatisfied ? existing.amountPaid : amount,
        amountAfterDeductions:
          existing.amountAfterDeductions != null
            ? existing.amountAfterDeductions
            : alreadySatisfied
              ? existing.requiredAmount
              : amount,
        depositStatusId: alreadySatisfied ? existing.depositStatusId : heldStatus.depositStatusId,
        paymentId: paymentId || existing.paymentId,
        staffId: staffId ?? existing.staffId,
        notes: notes ?? existing.notes,
      },
      include: { status: true, deductions: { orderBy: { recordedAt: "desc" } } },
    });
  }

  return prisma.deposit.create({
    data: {
      bookingId,
      requiredAmount: amount,
      amountPaid: amount,
      amountAfterDeductions: amount,
      depositStatusId: heldStatus.depositStatusId,
      paymentId: paymentId || null,
      staffId: staffId || null,
      notes,
    },
    include: { status: true, deductions: true },
  });
}

export function validateDepositConsume(deposit, amount) {
  if (!deposit) {
    return { ok: false, error: "No deposit has been recorded yet." };
  }
  const statusName = deposit.status?.status || deposit.statusName || "";
  if (statusName === "Pulled Out") {
    return { ok: false, error: "This deposit has already been pulled out." };
  }
  if (statusName === "Fully Deducted") {
    return { ok: false, error: "The 10% deposit has already been fully deducted." };
  }
  if (!DEPOSIT_CONSUMABLE_STATUSES.includes(statusName) && !isDepositRecordMet(deposit)) {
    return { ok: false, error: "Record the 10% deposit before consuming it." };
  }
  const remaining = getDepositRemaining(deposit);
  const deduction = roundMoney(amount);
  if (!Number.isFinite(deduction) || deduction <= 0) {
    return { ok: false, error: "Enter a deduction amount greater than zero." };
  }
  if (deduction > remaining) {
    return {
      ok: false,
      error: `Deduction cannot exceed the remaining deposit of ${formatPhp(remaining)}.`,
    };
  }
  return { ok: true, remaining, deduction };
}

export async function consumeDeposit(prisma, {
  bookingId,
  amount,
  reason,
  staffId = null,
}) {
  const deposit = await prisma.deposit.findUnique({
    where: { bookingId },
    include: { status: true, deductions: true },
  });
  const check = validateDepositConsume(deposit, amount);
  if (!check.ok) {
    return { ok: false, error: check.error };
  }
  const reasonCheck = validateDeductionReason(reason);
  if (!reasonCheck.ok) {
    return { ok: false, error: reasonCheck.error };
  }

  const nextRemaining = roundMoney(check.remaining - check.deduction);
  const nextStatusName = nextRemaining <= 0 ? "Fully Deducted" : "Deducted";
  const nextStatus = await getOrCreateDepositStatus(prisma, nextStatusName);

  const [deduction] = await prisma.$transaction([
    prisma.depositDeduction.create({
      data: {
        depositId: deposit.depositId,
        amount: check.deduction,
        reason: reasonCheck.reason,
        staffId: staffId || null,
      },
    }),
    prisma.deposit.update({
      where: { depositId: deposit.depositId },
      data: {
        amountAfterDeductions: nextRemaining,
        depositStatusId: nextStatus.depositStatusId,
        staffId: staffId ?? deposit.staffId,
      },
    }),
  ]);

  const updated = await prisma.deposit.findUnique({
    where: { depositId: deposit.depositId },
    include: { status: true, deductions: { orderBy: { recordedAt: "desc" } } },
  });

  return { ok: true, deduction, deposit: updated };
}

export function validateDepositPullout(deposit) {
  if (!deposit) {
    return { ok: false, error: "No deposit has been recorded yet." };
  }
  const statusName = deposit.status?.status || deposit.statusName || "";
  if (statusName === "Pulled Out") {
    return { ok: false, error: "This deposit has already been pulled out." };
  }
  if (statusName === "Fully Deducted" || getDepositRemaining(deposit) <= 0) {
    return { ok: false, error: "There is no remaining deposit to pull out." };
  }
  if (!DEPOSIT_PULLOUT_STATUSES.includes(statusName) && !isDepositRecordMet(deposit)) {
    return { ok: false, error: "Record the 10% deposit before pulling it out." };
  }
  return { ok: true, releaseAmount: getDepositRemaining(deposit) };
}

export async function pulloutDeposit(prisma, {
  bookingId,
  recordedBy = "LTOO",
  staffId = null,
}) {
  const deposit = await prisma.deposit.findUnique({
    where: { bookingId },
    include: { status: true, deductions: true },
  });
  const check = validateDepositPullout(deposit);
  if (!check.ok) {
    return { ok: false, error: check.error };
  }

  const pulledOutStatus = await getOrCreateDepositStatus(prisma, "Pulled Out");
  const now = new Date();

  await prisma.$transaction([
    prisma.deposit.update({
      where: { depositId: deposit.depositId },
      data: {
        depositStatusId: pulledOutStatus.depositStatusId,
        pulledOutAt: now,
        staffId: staffId ?? deposit.staffId,
      },
    }),
    prisma.transaction.create({
      data: {
        receiptNumber: "",
        paymentDate: now,
        recordedBy,
        paymentId: null,
        depositId: deposit.depositId,
        entryType: "deposit_release",
        releaseAmount: check.releaseAmount,
      },
    }),
  ]);

  const updated = await prisma.deposit.findUnique({
    where: { depositId: deposit.depositId },
    include: { status: true, deductions: { orderBy: { recordedAt: "desc" } } },
  });

  return { ok: true, deposit: updated, releaseAmount: check.releaseAmount };
}
