import { roundMoney } from "@/lib/utils";
import { isDepositRecordMet } from "@/lib/deposit-utils";

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
 * Payment rules: 50% down + 10% deposit (both % of base); 10% deposit is on top
 * so total payable = base * 1.1. Down and deposit can be recorded in either order,
 * each as a single full installment (not partial).
 *
 * @param {number} totalAmount
 * @param {number} totalPaid
 * @param {{ amountPaid?: number, requiredAmount?: number, status?: { status?: string } }|null} [depositRecord]
 */
export function computePaymentBreakdown(totalAmount, totalPaid, depositRecord = null) {
  const base = roundMoney(totalAmount || 0);
  const paid = roundMoney(totalPaid || 0);

  if (base <= 0) {
    return {
      base,
      paid,
      totalPayable: 0,
      requiredDownPayment: 0,
      requiredDeposit: 0,
      requiredTotal: 0,
      remainingBalance: 0,
      downPaymentMet: false,
      depositMet: false,
      requirementsMet: false,
      balanceSettled: paid <= 0,
      status: paid <= 0 ? "No Payment" : "IncompletePayment",
    };
  }

  const totalPayable = roundMoney(base * 1.1);
  const requiredDownPayment = roundMoney(base * 0.5);
  const requiredDeposit = roundMoney(base * 0.1);
  const requiredTotal = roundMoney(requiredDownPayment + requiredDeposit);
  const remainingBalance = roundMoney(Math.max(0, totalPayable - paid));
  const balanceSettled = remainingBalance <= 0;
  const downPaymentMet = paid >= requiredDownPayment;
  const depositMet = isDepositRecordMet(depositRecord)
    ? true
    : isDepositPortionMet(paid, requiredDownPayment, requiredDeposit);
  const requirementsMet = downPaymentMet && depositMet;

  let status = "Pending";
  if (paid <= 0) status = "No Payment";
  else if (remainingBalance > 0) {
    if (requirementsMet) status = "DepositPaid";
    else if (downPaymentMet) status = "DownPaymentPaid";
    else status = "IncompletePayment";
  } else {
    status = "Fully Paid";
  }

  return {
    base,
    paid,
    totalPayable,
    requiredDownPayment,
    requiredDeposit,
    requiredTotal,
    remainingBalance,
    downPaymentMet,
    depositMet,
    requirementsMet,
    balanceSettled,
    status,
  };
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
  // Combined 50% down + 10% deposit in one installment (only when both are still unpaid).
  if (paymentType === "both") {
    if (breakdown.downPaymentMet || breakdown.depositMet) return 0;
    return roundMoney(breakdown.requiredTotal);
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
    return { paymentType: "balance", amount: 0 };
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
    amount: breakdown.remainingBalance,
  };
}

/** Minimum accepted amount when recording remaining balance (₱500, or full remaining if lower). */
export const BALANCE_PAYMENT_MINIMUM = 500;

/** Max allowed amount for a payment type (full installment, capped by remaining balance). */
export function getPaymentTypeMax(breakdown, paymentType) {
  const remaining = roundMoney(breakdown.remainingBalance);
  if (remaining <= 0) return 0;

  const required = getRequiredPaymentAmount(breakdown, paymentType);
  if (required <= 0) return 0;
  return roundMoney(Math.min(required, remaining));
}

/**
 * Minimum allowed amount for a payment type.
 * Remaining balance: ₱500 minimum (or the full remaining if it is less than ₱500).
 * Fixed installments: same as the required full amount.
 */
export function getPaymentTypeMin(breakdown, paymentType) {
  const max = getPaymentTypeMax(breakdown, paymentType);
  if (max <= 0) return 0;

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

  if (paymentType === "both") {
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

  if (paymentType === "balance") {
    if (!breakdown.requirementsMet) {
      return "Record 50% down payment and 10% deposit before paying the remaining balance";
    }
    return null;
  }

  return "Invalid payment type";
}

/** Down payment, deposit, and combined initial payment must be a fixed full installment. */
export function isFixedPaymentAmount(paymentType) {
  return (
    paymentType === "downpayment" ||
    paymentType === "deposit" ||
    paymentType === "both"
  );
}

/** Human-readable label for a payment type. */
export function getPaymentTypeLabel(paymentType) {
  if (paymentType === "deposit") return "10% deposit";
  if (paymentType === "downpayment") return "50% down payment";
  if (paymentType === "both") return "50% down + 10% deposit";
  if (paymentType === "balance") return "remaining balance";
  return "payment";
}
