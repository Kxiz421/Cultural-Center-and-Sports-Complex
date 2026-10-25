import { formatDbDate, formatPhp, roundMoney } from "@/lib/utils";

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

/**
 * Determine whether the event has ended by checking eventStatus
 * or by comparing the latest event date against today.
 * @param {string|null|undefined} eventDate   Primary event date (ISO date string YYYY-MM-DD)
 * @param {Array<{eventDate: string}>|Array<string>|null|undefined} additionalDates
 * @param {string|null|undefined} eventStatus "Upcoming" | "Ongoing" | "Completed"
 */
export function isEventEnded(eventDate, additionalDates, eventStatus) {
  if (eventStatus === "Completed") return true;

  const candidates = [eventDate];
  if (Array.isArray(additionalDates)) {
    for (const ad of additionalDates) {
      candidates.push(typeof ad === "string" ? ad : ad?.eventDate);
    }
  }
  const dates = candidates.map(formatDbDate).filter(Boolean);
  if (dates.length === 0) return false;

  const latestStr = dates.sort().at(-1);

  // Compare against end of the event day (23:59 UTC+8, i.e. 15:59 UTC)
  const latestEvent = new Date(`${latestStr}T15:59:59.000Z`);
  const now = new Date();
  return now > latestEvent;
}
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

/**
 * Amount the client still owes from a deposit that was over-consumed
 * (damages/overtime beyond the 10% held). Stored as a negative
 * amountAfterDeductions; the outstanding balance is its magnitude.
 */
export function getDepositOutstanding(deposit) {
  if (!deposit || deposit.amountAfterDeductions == null) return 0;
  return roundMoney(Math.max(0, -roundMoney(deposit.amountAfterDeductions)));
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
    outstandingBalance: getDepositOutstanding(deposit),
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
  if (!DEPOSIT_CONSUMABLE_STATUSES.includes(statusName) && !isDepositRecordMet(deposit)) {
    return { ok: false, error: "Record the 10% deposit before consuming it." };
  }
  const remaining = getDepositRemaining(deposit);
  const deduction = roundMoney(amount);
  if (!Number.isFinite(deduction) || deduction <= 0) {
    return { ok: false, error: "Enter a deduction amount greater than zero." };
  }
  // Deductions may exceed the remaining deposit (damages/overtime beyond the
  // amount held); the excess becomes a negative balance the client owes.
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

export function validateDepositPullout(deposit, eventDate = null, additionalDates = null, eventStatus = null) {
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
  if (!isEventEnded(eventDate, additionalDates, eventStatus)) {
    return { ok: false, error: "The 10% deposit cannot be pulled out until the event has ended." };
  }
  return { ok: true, releaseAmount: getDepositRemaining(deposit) };
}

export async function pulloutDeposit(prisma, {
  bookingId,
  recordedBy = "LTOO",
  staffId = null,
  eventDate = null,
  additionalDates = null,
  eventStatus = null,
}) {
  const deposit = await prisma.deposit.findUnique({
    where: { bookingId },
    include: { status: true, deductions: true },
  });
  const check = validateDepositPullout(deposit, eventDate, additionalDates, eventStatus);
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

export function validateDepositSettlement(deposit, amount) {
  if (!deposit) {
    return { ok: false, error: "No deposit has been recorded yet." };
  }
  const outstanding = getDepositOutstanding(deposit);
  if (outstanding <= 0) {
    return { ok: false, error: "This client has no outstanding deposit balance." };
  }
  const settle =
    amount == null || amount === "" ? outstanding : roundMoney(amount);
  if (!Number.isFinite(settle) || settle <= 0) {
    return { ok: false, error: "Enter an amount greater than zero." };
  }
  if (settle > outstanding) {
    return {
      ok: false,
      error: `Amount cannot exceed the outstanding balance of ${formatPhp(outstanding)}.`,
    };
  }
  return { ok: true, outstanding, settle };
}

export async function settleDepositBalance(prisma, {
  bookingId,
  amount = null,
  recordedBy = "LTOO",
  staffId = null,
}) {
  const deposit = await prisma.deposit.findUnique({
    where: { bookingId },
    include: { status: true, deductions: true },
  });
  const check = validateDepositSettlement(deposit, amount);
  if (!check.ok) {
    return { ok: false, error: check.error };
  }

  const remaining = getDepositRemaining(deposit);
  const nextRemaining = roundMoney(Math.min(0, remaining + check.settle));
  const now = new Date();

  await prisma.$transaction([
    prisma.deposit.update({
      where: { depositId: deposit.depositId },
      data: {
        amountAfterDeductions: nextRemaining,
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
        entryType: "deposit_settlement",
        releaseAmount: check.settle,
      },
    }),
  ]);

  const updated = await prisma.deposit.findUnique({
    where: { depositId: deposit.depositId },
    include: { status: true, deductions: { orderBy: { recordedAt: "desc" } } },
  });

  return { ok: true, deposit: updated, settledAmount: check.settle };
}
