import { formatPhp, roundMoney } from "@/lib/utils";
import { isDepositRecordMet } from "@/lib/deposit-utils";

export const VALID_PAYMENT_TYPES = [
  "deposit",
  "downpayment",
  "both",
  "both_plus",
  "full",
  "manual",
  "balance",
];

/** Minimum accepted amount when recording remaining balance (₱500, or full remaining if lower). */
export const BALANCE_PAYMENT_MINIMUM = 500;

/** 10% deposit portion satisfied (can be paid before or after 50% down). */
export function isDepositPortionMet(paid, requiredDownPayment, requiredDeposit) {
  const paidR = roundMoney(paid);
  const downDue = roundMoney(requiredDownPayment);
  const depositDue = roundMoney(requiredDeposit);
  if (paidR >= downDue + depositDue) return true;
  if (paidR >= depositDue && paidR < downDue) return true;
  return false;
}

/**
 * Current billed totals after discounts.
 * Regular discounts leave the 10% deposit on the original base and only shrink
 * the 50% down and remaining. A 100% waiver (discount larger than the rental)
 * can include the unpaid deposit and bring the payable to zero.
 */
export function getBilledTotals(originalBase, totalDiscount = 0) {
  const sourceBase = roundMoney(originalBase || 0);
  const requiredDeposit = roundMoney(sourceBase * 0.1);
  const originalTotalPayable = roundMoney(sourceBase * 1.1);
  const discount = roundMoney(totalDiscount || 0);
  const appliedDiscount = roundMoney(Math.min(Math.max(0, discount), originalTotalPayable));
  const totalPayable = roundMoney(Math.max(0, originalTotalPayable - appliedDiscount));

  // Split remaining payable into deposit and rental-base portions
  const remainingDeposit = roundMoney(Math.min(requiredDeposit, totalPayable));
  const remainingBase = roundMoney(Math.max(0, totalPayable - remainingDeposit));

  return {
    originalBase: sourceBase,
    originalTotalPayable,
    totalDiscount: appliedDiscount,
    totalPayable,
    requiredDeposit: remainingDeposit,
    base: remainingBase,
  };
}

export function sumPaymentDiscounts(payments) {
  return roundMoney(
    (payments || []).reduce((sum, payment) => sum + Number(payment?.discountAmount || 0), 0)
  );
}

export function computeDiscountPeso(currentTotalPayable, { mode, peso, percent, remainingBalance }) {
  if (mode === "full") {
    const remaining = remainingBalance != null
      ? roundMoney(remainingBalance)
      : roundMoney(currentTotalPayable);
    return remaining;
  }
  const current = roundMoney(currentTotalPayable);
  if (mode === "percent") {
    const value = Number(percent);
    if (!Number.isFinite(value) || value <= 0) return 0;
    return roundMoney(current * (value / 100));
  }
  return roundMoney(peso || 0);
}

export function validateDiscountAmount(
  currentTotalPayable,
  totalPaid,
  discountAmount,
  _requiredDeposit = 0
) {
  const remaining = roundMoney(Math.max(0, roundMoney(currentTotalPayable) - roundMoney(totalPaid)));
  const maxDiscount = remaining;
  const discount = roundMoney(discountAmount);
  if (!Number.isFinite(discount) || discount <= 0) {
    return { ok: false, error: "Enter a discount greater than zero." };
  }
  if (discount > maxDiscount) {
    return {
      ok: false,
      error: `Discount cannot exceed the remaining unpaid total of ${formatPhp(remaining)}.`,
    };
  }
  return { ok: true };
}

/**
 * Payment rules: 50% down + 10% deposit (both % of base); 10% deposit is on top
 * so total payable = base * 1.1. Down and deposit can be recorded in either order,
 * each as a single full installment (not partial).
 *
 * @param {number} totalAmount billed base (after discounts)
 * @param {number} totalPaid
 * @param {{ amountPaid?: number, requiredAmount?: number, status?: { status?: string } }|null} [depositRecord]
 * @param {{ originalBase?: number, totalDiscount?: number }} [billing]
 */
export function computePaymentBreakdown(totalAmount, totalPaid, depositRecord = null, billing = null) {
  const billed = billing
    ? getBilledTotals(billing.originalBase ?? totalAmount, billing.totalDiscount)
    : getBilledTotals(totalAmount, 0);
  const base = billed.base;
  const paid = roundMoney(totalPaid || 0);

  if (billed.originalBase <= 0 && billed.totalPayable <= 0) {
    return {
      ...billed,
      paid,
      requiredDownPayment: 0,
      requiredDeposit: 0,
      requiredTotal: 0,
      remainingBalance: 0,
      downPaymentMet: false,
      depositMet: false,
      requirementsMet: false,
      balanceSettled: paid <= 0,
      paidPercent: paid > 0 ? 100 : 0,
      status: paid <= 0 ? "No Payment" : "Fully Paid",
    };
  }

  const totalPayable = billed.totalPayable;
  const requiredDeposit = billed.requiredDeposit;
  const requiredDownPayment = roundMoney(base * 0.5);
  const requiredTotal = roundMoney(requiredDownPayment + requiredDeposit);
  const remainingBalance = roundMoney(Math.max(0, totalPayable - paid));
  const balanceSettled = remainingBalance <= 0;
  const downPaymentMet = paid >= requiredDownPayment;
  const depositMet = isDepositRecordMet(depositRecord)
    ? true
    : isDepositPortionMet(paid, requiredDownPayment, requiredDeposit);
  const requirementsMet = downPaymentMet && depositMet;

  let status = "Pending";
  if (balanceSettled && billed.originalTotalPayable > 0) {
    status = "Fully Paid";
  } else if (paid <= 0) {
    status = "No Payment";
  } else if (remainingBalance > 0) {
    if (requirementsMet) status = "DepositPaid";
    else if (downPaymentMet) status = "DownPaymentPaid";
    else status = "IncompletePayment";
  } else {
    status = "Fully Paid";
  }

  return {
    ...billed,
    paid,
    requiredDownPayment,
    requiredDeposit,
    requiredTotal,
    remainingBalance,
    downPaymentMet,
    depositMet,
    requirementsMet,
    balanceSettled,
    paidPercent:
      billed.totalPayable <= 0 && billed.originalTotalPayable > 0
        ? 100
        : getShareOfTotal(paid, billed.totalPayable),
    status,
  };
}

/** Percent of the 100% total payable (base + 10% deposit). */
export function getShareOfTotal(amount, totalPayable) {
  const total = roundMoney(totalPayable);
  if (total <= 0) return 0;
  const share = (roundMoney(amount) / total) * 100;
  return Math.min(100, Math.max(0, Math.round(share * 10) / 10));
}

export function getProjectedPaidPercent(breakdown, amount) {
  if (breakdown?.balanceSettled || (roundMoney(breakdown?.totalPayable) <= 0 && breakdown?.originalTotalPayable > 0)) {
    return 100;
  }
  if (!breakdown?.totalPayable) return 0;
  return getShareOfTotal(
    roundMoney((breakdown.paid || 0) + roundMoney(amount || 0)),
    breakdown.totalPayable
  );
}

/** Split a 100% waiver across unpaid 10% deposit, 50% down, and remaining. */
export function allocateFullDiscountCoverage(breakdown) {
  if (!breakdown) return { deposit: 0, downpayment: 0, balance: 0, total: 0 };
  const allocation = allocateManualPayment(breakdown, breakdown.remainingBalance);
  return {
    ...allocation,
    total: roundMoney(
      (allocation.deposit || 0) + (allocation.downpayment || 0) + (allocation.balance || 0)
    ),
  };
}

export function isValidPaymentType(paymentType) {
  return VALID_PAYMENT_TYPES.includes(String(paymentType || ""));
}

/** Exact full amount required for a payment type (0 when not applicable). */
export function getRequiredPaymentAmount(breakdown, paymentType) {
  if (paymentType === "downpayment") {
    if (breakdown.downPaymentMet) return 0;
    return roundMoney(breakdown.requiredDownPayment);
  }
  if (paymentType === "deposit") {
    if (breakdown.depositMet) return 0;
    return roundMoney(breakdown.requiredDeposit);
  }
  if (paymentType === "both" || paymentType === "both_plus") {
    if (breakdown.downPaymentMet || breakdown.depositMet) return 0;
    return roundMoney(breakdown.requiredTotal);
  }
  if (paymentType === "full" || paymentType === "manual") {
    if (breakdown.balanceSettled) return 0;
    return roundMoney(breakdown.remainingBalance);
  }
  if (paymentType === "balance") {
    if (!breakdown.requirementsMet) return 0;
    return roundMoney(breakdown.remainingBalance);
  }
  return 0;
}

/** Suggested payment type and default amount for the next payment. */
export function suggestNextPayment(breakdown) {
  if (breakdown.balanceSettled) {
    return { paymentType: "full", amount: 0 };
  }
  if (!breakdown.downPaymentMet) {
    return {
      paymentType: "downpayment",
      amount: breakdown.requiredDownPayment,
    };
  }
  if (!breakdown.depositMet) {
    return {
      paymentType: "deposit",
      amount: breakdown.requiredDeposit,
    };
  }
  return {
    paymentType: "balance",
    amount: getPaymentTypeMin(breakdown, "balance"),
  };
}

/** Max allowed amount for a payment type (capped by remaining payable). */
export function getPaymentTypeMax(breakdown, paymentType) {
  const remaining = roundMoney(breakdown.remainingBalance);
  if (remaining <= 0) return 0;

  if (paymentType === "full" || paymentType === "manual") {
    return remaining;
  }

  if (paymentType === "both_plus") {
    const required = getRequiredPaymentAmount(breakdown, "both_plus");
    if (required <= 0) return 0;
    return remaining;
  }

  const required = getRequiredPaymentAmount(breakdown, paymentType);
  if (required <= 0) return 0;
  return roundMoney(Math.min(required, remaining));
}

/**
 * Next unpaid installment used as the manual-input floor:
 * 50% down payment, then 10% deposit, then remaining-balance minimum.
 */
export function getManualMinimum(breakdown) {
  const remaining = roundMoney(breakdown.remainingBalance);
  if (remaining <= 0) return 0;
  if (!breakdown.downPaymentMet) {
    return roundMoney(Math.min(breakdown.requiredDownPayment, remaining));
  }
  if (!breakdown.depositMet) {
    return roundMoney(Math.min(breakdown.requiredDeposit, remaining));
  }
  return roundMoney(Math.min(BALANCE_PAYMENT_MINIMUM, remaining));
}

/**
 * Minimum allowed amount for a payment type.
 * Remaining balance: ₱500 minimum (or the full remaining if it is less than ₱500).
 * Fixed installments: same as the required full amount.
 */
export function getPaymentTypeMin(breakdown, paymentType) {
  const max = getPaymentTypeMax(breakdown, paymentType);
  if (max <= 0) return 0;

  if (paymentType === "manual") {
    return getManualMinimum(breakdown);
  }

  if (paymentType === "both_plus") {
    return roundMoney(Math.min(getRequiredPaymentAmount(breakdown, "both_plus"), max));
  }

  if (paymentType === "balance") {
    return roundMoney(Math.min(BALANCE_PAYMENT_MINIMUM, max));
  }

  if (isFixedPaymentAmount(paymentType)) {
    return max;
  }

  return 0;
}

/** Whether a payment type can still be recorded for this reservation. */
export function isPaymentTypeAllowed(breakdown, paymentType) {
  return getPaymentTypeMax(breakdown, paymentType) > 0;
}

/** Why a payment type cannot be selected (null when allowed). */
export function getPaymentTypeBlockReason(breakdown, paymentType) {
  if (breakdown.balanceSettled) return "Reservation is fully paid";

  if (paymentType === "downpayment") {
    if (breakdown.downPaymentMet) return "50% down payment already recorded";
    return null;
  }

  if (paymentType === "deposit") {
    if (breakdown.depositMet) return "10% deposit already recorded";
    return null;
  }

  if (paymentType === "both" || paymentType === "both_plus") {
    if (breakdown.downPaymentMet && breakdown.depositMet) {
      return "50% down payment and 10% deposit already recorded";
    }
    if (breakdown.downPaymentMet) {
      return "50% down payment already recorded — use 10% deposit instead";
    }
    if (breakdown.depositMet) {
      return "10% deposit already recorded — use 50% down payment instead";
    }
    return null;
  }

  if (paymentType === "full" || paymentType === "manual") {
    return null;
  }

  if (paymentType === "balance") {
    if (!breakdown.requirementsMet) {
      return "Record 50% down payment and 10% deposit before paying the remaining balance";
    }
    return null;
  }

  return "Invalid payment type";
}

/** Fixed installment types cannot be edited to a custom amount. */
export function isFixedPaymentAmount(paymentType) {
  return (
    paymentType === "downpayment" ||
    paymentType === "deposit" ||
    paymentType === "both" ||
    paymentType === "full"
  );
}

/** Apply a manual amount in order: 50% down payment, then 10% deposit, then remaining. */
export function allocateManualPayment(breakdown, amount) {
  let leftover = roundMoney(amount);
  const allocation = { deposit: 0, downpayment: 0, balance: 0 };

  if (!breakdown.downPaymentMet && leftover > 0) {
    const need = roundMoney(breakdown.requiredDownPayment);
    allocation.downpayment = roundMoney(Math.min(leftover, need));
    leftover = roundMoney(leftover - allocation.downpayment);
  }

  if (!breakdown.depositMet && leftover > 0) {
    const need = roundMoney(breakdown.requiredDeposit);
    allocation.deposit = roundMoney(Math.min(leftover, need));
    leftover = roundMoney(leftover - allocation.deposit);
  }

  if (leftover > 0) {
    allocation.balance = leftover;
  }

  return allocation;
}

export function getManualPaymentError(breakdown, amount) {
  const amt = roundMoney(amount);
  if (!Number.isFinite(amt) || amt <= 0) {
    return "Enter a valid positive payment amount.";
  }
  if (amt > breakdown.remainingBalance) {
    return `Amount cannot exceed the remaining balance of ${formatPhp(breakdown.remainingBalance)}.`;
  }

  const min = getManualMinimum(breakdown);
  if (min > 0 && amt < min) {
    if (!breakdown.downPaymentMet) {
      return `Manual payments must cover the 50% down payment first. Minimum is ${formatPhp(min)}.`;
    }
    if (!breakdown.depositMet) {
      return `Manual payments must cover the 10% deposit next. Minimum is ${formatPhp(min)}.`;
    }
    return `Minimum payment for remaining balance is ${formatPhp(min)}.`;
  }

  const allocation = allocateManualPayment(breakdown, amt);

  if (!breakdown.depositMet && allocation.deposit < breakdown.requiredDeposit) {
    return `Manual payments must cover the 10% deposit first (${formatPhp(breakdown.requiredDeposit)}).`;
  }

  if (
    !breakdown.downPaymentMet &&
    allocation.downpayment > 0 &&
    allocation.downpayment < breakdown.requiredDownPayment
  ) {
    const downPart = breakdown.downPaymentMet ? 0 : breakdown.requiredDownPayment;
    const fullDeposit = roundMoney(downPart + breakdown.requiredDeposit);
    return `After the 50% down payment, the 10% deposit must be paid in full (${formatPhp(breakdown.requiredDeposit)}). Pay exactly the down payment, or at least ${formatPhp(fullDeposit)}.`;
  }

  if (breakdown.requirementsMet) {
    const balanceMin = getPaymentTypeMin(breakdown, "balance");
    if (balanceMin > 0 && amt < balanceMin) {
      return `Minimum payment for remaining balance is ${formatPhp(balanceMin)}.`;
    }
  }

  return null;
}

export function paymentCoversDeposit(breakdown, paymentType, amount) {
  if (breakdown.depositMet) return false;
  if (
    paymentType === "deposit" ||
    paymentType === "both" ||
    paymentType === "both_plus" ||
    paymentType === "full"
  ) {
    return true;
  }
  if (paymentType === "manual") {
    const allocation = allocateManualPayment(breakdown, amount);
    return allocation.deposit >= roundMoney(breakdown.requiredDeposit);
  }
  return false;
}

export function getDefaultPaymentAmount(breakdown, paymentType) {
  const max = getPaymentTypeMax(breakdown, paymentType);
  const min = getPaymentTypeMin(breakdown, paymentType);
  if (max <= 0) return 0;
  if (paymentType === "both_plus" || paymentType === "balance" || paymentType === "manual") {
    return min;
  }
  return max;
}

export function validatePaymentAmount(breakdown, paymentType, amount, options = {}) {
  const amt = roundMoney(amount);
  if (options.discountSettlesRemaining && amt === 0) {
    return { ok: true };
  }
  if (!isValidPaymentType(paymentType)) {
    return { ok: false, error: "Invalid payment type." };
  }
  if (!Number.isFinite(amt) || amt <= 0) {
    return { ok: false, error: "Enter a valid positive payment amount." };
  }
  if (breakdown.balanceSettled) {
    return { ok: false, error: "Reservation is fully paid." };
  }
  if (!isPaymentTypeAllowed(breakdown, paymentType)) {
    return {
      ok: false,
      error:
        getPaymentTypeBlockReason(breakdown, paymentType) ||
        "This payment type is not available.",
    };
  }

  const max = getPaymentTypeMax(breakdown, paymentType);
  const min = getPaymentTypeMin(breakdown, paymentType);
  const label = getPaymentTypeLabel(paymentType);

  if (amt > breakdown.remainingBalance || (max > 0 && amt > max)) {
    return {
      ok: false,
      error: `Amount cannot exceed ${formatPhp(max)} for ${label}.`,
    };
  }

  if (paymentType === "manual") {
    const manualError = getManualPaymentError(breakdown, amt);
    if (manualError) return { ok: false, error: manualError };
    return { ok: true };
  }

  if (min > 0 && amt < min) {
    return {
      ok: false,
      error: `Minimum payment for ${label} is ${formatPhp(min)}.`,
    };
  }

  if (isFixedPaymentAmount(paymentType) && roundMoney(amt) !== roundMoney(max)) {
    return {
      ok: false,
      error: `You must pay the full ${label} amount of ${formatPhp(max)}.`,
    };
  }

  return { ok: true };
}

/** Human-readable label for a payment type. */
export function getPaymentTypeLabel(paymentType) {
  if (paymentType === "deposit") return "10% deposit";
  if (paymentType === "downpayment") return "50% down payment";
  if (paymentType === "both") return "60% down + deposit";
  if (paymentType === "both_plus") return "60% (down + deposit) + additional";
  if (paymentType === "full") return "100% full payment";
  if (paymentType === "manual") return "manual amount";
  if (paymentType === "balance") return "remaining balance";
  return "payment";
}

export function getPaymentTypeHint(breakdown, paymentType) {
  const max = getPaymentTypeMax(breakdown, paymentType);
  const min = getPaymentTypeMin(breakdown, paymentType);
  const blocked = getPaymentTypeBlockReason(breakdown, paymentType);
  if (blocked) return blocked;
  if (paymentType === "deposit") {
    return `Required: ${formatPhp(max)} (${getShareOfTotal(max, breakdown.totalPayable)}% of the 100% total)`;
  }
  if (paymentType === "downpayment") {
    return `Required: ${formatPhp(max)} (${getShareOfTotal(max, breakdown.totalPayable)}% of the 100% total)`;
  }
  if (paymentType === "both") {
    return `Required: ${formatPhp(max)} (60% of base · ${getShareOfTotal(max, breakdown.totalPayable)}% of the 100% total)`;
  }
  if (paymentType === "both_plus") {
    return `Minimum ${formatPhp(min)} (60% of base) · add more up to ${formatPhp(max)} (100% of remaining)`;
  }
  if (paymentType === "full") {
    return `Pays the remaining ${formatPhp(max)} and brings the reservation to 100%`;
  }
  if (paymentType === "manual") {
    return `Applied in order: 50% down payment, then 10% deposit, then remaining balance. Minimum ${formatPhp(min)}.`;
  }
  if (paymentType === "balance") {
    return `Minimum ${formatPhp(min)} · up to ${formatPhp(max)} remaining`;
  }
  return "";
}
