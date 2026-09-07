"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Wallet,
  Search,
  User,
  Building2,
  DollarSign,
  CalendarDays,
  CheckCircle2,
  XCircle,
  History,
  Receipt,
  Percent,
} from "lucide-react";
import { cn, formatPhp, formatMoneyInput, roundMoney, sanitizeMoneyInput } from "@/lib/utils";
import {
  computePaymentBreakdown,
  suggestNextPayment,
  getPaymentTypeMax,
  getPaymentTypeMin,
  isPaymentTypeAllowed,
  getPaymentTypeBlockReason,
  isFixedPaymentAmount,
  getPaymentTypeLabel,
  getPaymentTypeHint,
  getShareOfTotal,
  getProjectedPaidPercent,
  getDefaultPaymentAmount,
  validatePaymentAmount,
  allocateManualPayment,
  paymentCoversDeposit,
  computeDiscountPeso,
  validateDiscountAmount,
  allocateFullDiscountCoverage,
  BALANCE_PAYMENT_MINIMUM,
} from "@/lib/payment-utils";
import { isDepositRecordMet, sanitizeDeductionReason } from "@/lib/deposit-utils";

const PAYMENT_RADIO_OPTIONS = [
  { value: "deposit", title: "10% Deposit" },
  { value: "downpayment", title: "50% Down Payment" },
  { value: "both_plus", title: "60% (Down + Deposit) + additional" },
  { value: "full", title: "100% Full Payment" },
  { value: "balance", title: "Remaining Balance" },
  { value: "manual", title: "Manual amount" },
];

function breakdownFromReservation(reservation, extraDiscount = 0) {
  if (!reservation) return null;
  const originalBase = reservation.originalAmount ?? reservation.totalAmount;
  const existingDiscount = reservation.totalDiscount ?? 0;
  const depositRecord = reservation.deposit
    ? {
        amountPaid: reservation.deposit.amountPaid,
        requiredAmount: reservation.deposit.requiredAmount,
        status: { status: reservation.deposit.status },
      }
    : reservation.depositMet
      ? {
          amountPaid: reservation.requiredDeposit,
          requiredAmount: reservation.requiredDeposit,
          status: { status: "Held" },
        }
      : null;
  return computePaymentBreakdown(
    originalBase,
    reservation.totalPaid,
    depositRecord,
    { originalBase, totalDiscount: existingDiscount + extraDiscount }
  );
}

function hasPaidDeposit(deposit) {
  return isDepositRecordMet(deposit);
}

function isFullyPaidReservation(reservation) {
  return reservation?.computedStatus === "Fully Paid" || reservation?.balanceSettled === true;
}

function canConsumeDeposit(deposit) {
  return Boolean(deposit && ["Held", "Deducted"].includes(deposit.status));
}

function canPulloutDeposit(deposit) {
  return Boolean(
    deposit &&
    ["Held", "Deducted"].includes(deposit.status) &&
    roundMoney(deposit.amountAfterDeductions) > 0
  );
}

// Human-friendly label for a status token (used where a colored badge isn't wanted).
function getStatusLabel(status) {
  const map = {
    "No Payment": "No Payment",
    "Fully Paid": "Fully Paid",
    DepositPaid: "Deposit Paid",
    DownPaymentPaid: "Down Payment Paid",
    IncompletePayment: "Incomplete Payment",
  };
  return map[status] || status;
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function getRadioOptionPercent(breakdown, value, selectedAmount, isSelected) {
  if (!breakdown) return "";
  if (value === "full") return formatPercent(100);
  const amount = (value === "both_plus" || value === "manual" || value === "balance")
    ? (isSelected && selectedAmount ? roundMoney(selectedAmount) : getPaymentTypeMin(breakdown, value))
    : getPaymentTypeMax(breakdown, value);
  return formatPercent(getProjectedPaidPercent(breakdown, amount));
}

function getRadioOptionDetail(breakdown, value) {
  if (!breakdown) return "";
  const max = getPaymentTypeMax(breakdown, value);
  const min = getPaymentTypeMin(breakdown, value);
  if (max <= 0) return "";
  if (value === "both_plus") {
    return `${formatPhp(min)} (${formatPercent(getShareOfTotal(min, breakdown.totalPayable))} of total) up to ${formatPhp(max)} (100%)`;
  }
  if (value === "full") {
    return `${formatPhp(max)} · settles the remaining balance to 100%`;
  }
  if (value === "manual") {
    return `Min ${formatPhp(min)} · up to ${formatPhp(max)}`;
  }
  if (value === "balance") {
    return `${formatPhp(min)}–${formatPhp(max)} remaining`;
  }
  return `${formatPhp(max)} · ${formatPercent(getShareOfTotal(max, breakdown.totalPayable))} of total`;
}

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function hasPaymentHistory(status) {
  return status === "Fully Paid" ||
    ["DownPaymentPaid", "DepositPaid", "IncompletePayment"].includes(status);
}

export default function LTOOPaymentsPage() {
  const [reservations, setReservations] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [paymentFilter, setPaymentFilter] = React.useState("all");
  const [recordOpen, setRecordOpen] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [selectedReservation, setSelectedReservation] = React.useState(null);
  const [paymentAmount, setPaymentAmount] = React.useState("");
  const [paymentType, setPaymentType] = React.useState("deposit");
  const [amountError, setAmountError] = React.useState("");
  const [discountEnabled, setDiscountEnabled] = React.useState(false);
  const [discountMode, setDiscountMode] = React.useState("peso");
  const [discountPeso, setDiscountPeso] = React.useState("");
  const [discountPercent, setDiscountPercent] = React.useState("");
  const [discountOnlySubmission, setDiscountOnlySubmission] = React.useState(false);
  const [consumeAmount, setConsumeAmount] = React.useState("");
  const [consumeReason, setConsumeReason] = React.useState("");
  const [depositSaving, setDepositSaving] = React.useState(false);
  const [depositPanelOpen, setDepositPanelOpen] = React.useState(false);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [historyReservation, setHistoryReservation] = React.useState(null);
  const [historyTransactions, setHistoryTransactions] = React.useState([]);
  const [historyLoading, setHistoryLoading] = React.useState(false);
  const [historyViewOnly, setHistoryViewOnly] = React.useState(false);
  const [selectedTransaction, setSelectedTransaction] = React.useState(null);

  const historyBreakdown = React.useMemo(
    () => breakdownFromReservation(historyReservation),
    [historyReservation]
  );

  React.useEffect(() => {
    loadReservations();
  }, []);

  async function loadReservations() {
    setLoading(true);
    try {
      // Get all reservations with payment info from the bookings endpoint
      const res = await fetch("/api/ltoo/payments?bookings=true");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load reservations");
      }
      setReservations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load data:", err);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  // Compute payment breakdown for each reservation
  const enrichedReservations = React.useMemo(() => {
    return reservations.map((r) => {
      const breakdown = breakdownFromReservation(r);
      return {
        ...r,
        requiredDownPayment: breakdown.requiredDownPayment,
        requiredDeposit: breakdown.requiredDeposit,
        downPaymentMet: breakdown.downPaymentMet,
        depositMet: breakdown.depositMet,
        balanceSettled: breakdown.balanceSettled,
        computedStatus: breakdown.status,
        totalPayable: breakdown.totalPayable,
        remainingBalance: breakdown.remainingBalance,
        paidPercent: breakdown.paidPercent,
      };
    });
  }, [reservations]);

  // Filter
  const filteredReservations = React.useMemo(() => {
    let items = enrichedReservations;
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (r) =>
          r.clientName?.toLowerCase().includes(q) ||
          r.eventType?.toLowerCase().includes(q)
      );
    }
    if (paymentFilter === "paid") {
      return items.filter((r) => r.computedStatus === "Fully Paid");
    }
    if (paymentFilter === "partial") {
      return items.filter((r) =>
        ["DownPaymentPaid", "DepositPaid", "IncompletePayment"].includes(r.computedStatus)
      );
    }
    if (paymentFilter === "unpaid") {
      return items.filter((r) =>
        ["No Payment", "Pending"].includes(r.computedStatus)
      );
    }
    return items;
  }, [enrichedReservations, search, paymentFilter]);

  const pendingDiscount = React.useMemo(() => {
    if (!discountEnabled || !selectedReservation) return 0;
    const current = breakdownFromReservation(selectedReservation, 0);
    if (!current) return 0;
    return computeDiscountPeso(current.totalPayable, {
      mode: discountMode,
      peso: discountPeso,
      percent: discountPercent,
      remainingBalance: current.remainingBalance,
    });
  }, [discountEnabled, selectedReservation, discountMode, discountPeso, discountPercent]);

  const discountCheck = React.useMemo(() => {
    if (!discountEnabled || !selectedReservation || pendingDiscount <= 0) {
      return { ok: !discountEnabled, error: "" };
    }
    const current = breakdownFromReservation(selectedReservation, 0);
    return validateDiscountAmount(
      current.totalPayable,
      current.paid,
      pendingDiscount
    );
  }, [discountEnabled, selectedReservation, pendingDiscount, discountMode]);

  const fullDiscountCoverage = React.useMemo(() => {
    if (!discountEnabled || discountMode !== "full" || !selectedReservation) return null;
    const current = breakdownFromReservation(selectedReservation, 0);
    if (!current) return null;
    return allocateFullDiscountCoverage(current);
  }, [discountEnabled, discountMode, selectedReservation]);

  const currentBreakdown = React.useMemo(
    () => breakdownFromReservation(selectedReservation, discountCheck.ok ? pendingDiscount : 0),
    [selectedReservation, pendingDiscount, discountCheck.ok]
  );

  const projectedBreakdown = React.useMemo(() => {
    if (!selectedReservation || !currentBreakdown) return null;
    const add = roundMoney(paymentAmount || 0);
    const coversDeposit = add > 0 && paymentCoversDeposit(currentBreakdown, paymentType, add);
    const originalBase = selectedReservation.originalAmount ?? selectedReservation.totalAmount;
    const existingDiscount = selectedReservation.totalDiscount ?? 0;
    return computePaymentBreakdown(
      originalBase,
      roundMoney((selectedReservation.totalPaid || 0) + add),
      currentBreakdown.depositMet || coversDeposit
        ? {
            amountPaid: currentBreakdown.requiredDeposit,
            requiredAmount: currentBreakdown.requiredDeposit,
            status: { status: "Held" },
          }
        : selectedReservation.deposit
          ? {
              amountPaid: selectedReservation.deposit.amountPaid,
              requiredAmount: selectedReservation.deposit.requiredAmount,
              status: { status: selectedReservation.deposit.status },
            }
          : null,
      {
        originalBase,
        totalDiscount: existingDiscount + (discountCheck.ok ? pendingDiscount : 0),
      }
    );
  }, [selectedReservation, currentBreakdown, paymentAmount, paymentType, pendingDiscount, discountCheck.ok]);

  const paymentTypeMax = React.useMemo(() => {
    if (!currentBreakdown) return 0;
    return getPaymentTypeMax(currentBreakdown, paymentType);
  }, [currentBreakdown, paymentType]);

  const paymentTypeMin = React.useMemo(() => {
    if (!currentBreakdown) return 0;
    return getPaymentTypeMin(currentBreakdown, paymentType);
  }, [currentBreakdown, paymentType]);

  const paymentTypeBlockReason = React.useMemo(() => {
    if (!currentBreakdown) return null;
    return getPaymentTypeBlockReason(currentBreakdown, paymentType);
  }, [currentBreakdown, paymentType]);

  const paidPercent = currentBreakdown?.paidPercent ?? 0;
  const projectedPercent = React.useMemo(() => {
    if (!currentBreakdown) return 0;
    return getProjectedPaidPercent(currentBreakdown, paymentAmount);
  }, [currentBreakdown, paymentAmount]);

  const manualAllocation = React.useMemo(() => {
    if (!currentBreakdown || paymentType !== "manual" || !paymentAmount) return null;
    const amt = roundMoney(paymentAmount);
    if (amt <= 0) return null;
    return allocateManualPayment(currentBreakdown, amt);
  }, [currentBreakdown, paymentType, paymentAmount]);

  const bothPlusSplit = React.useMemo(() => {
    if (!currentBreakdown || paymentType !== "both_plus" || !paymentAmount) return null;
    const amt = roundMoney(paymentAmount);
    if (amt <= 0) return null;
    const installment = roundMoney(Math.min(amt, currentBreakdown.requiredTotal));
    return {
      installment,
      additional: roundMoney(Math.max(0, amt - installment)),
    };
  }, [currentBreakdown, paymentType, paymentAmount]);

  const discountSettlesRemaining =
    discountEnabled &&
    discountCheck.ok &&
    pendingDiscount > 0 &&
    !!currentBreakdown &&
    currentBreakdown.remainingBalance <= 0;

  const paymentAmountCheck = React.useMemo(() => {
    if (!currentBreakdown) return { ok: false, error: "" };
    if (discountSettlesRemaining) {
      return validatePaymentAmount(currentBreakdown, paymentType || "full", roundMoney(paymentAmount || 0), {
        discountSettlesRemaining: true,
      });
    }
    if (!paymentAmount) return { ok: false, error: "" };
    const amt = roundMoney(paymentAmount);
    if (!Number.isFinite(amt) || amt <= 0) return { ok: false, error: "" };
    return validatePaymentAmount(currentBreakdown, paymentType, amt);
  }, [currentBreakdown, paymentType, paymentAmount, discountSettlesRemaining]);

  const canSubmitPayment =
    !!currentBreakdown &&
    discountCheck.ok &&
    (discountSettlesRemaining ||
      discountEnabled || // discount-only submission – no payment required
      (!currentBreakdown.balanceSettled &&
        isPaymentTypeAllowed(currentBreakdown, paymentType) &&
        !!paymentAmount &&
        paymentAmountCheck.ok));

  const counts = React.useMemo(() => ({
    all: enrichedReservations.length,
    paid: enrichedReservations.filter((r) => r.computedStatus === "Fully Paid").length,
    partial: enrichedReservations.filter((r) =>
      ["DownPaymentPaid", "DepositPaid", "IncompletePayment"].includes(r.computedStatus)
    ).length,
    unpaid: enrichedReservations.filter((r) =>
      ["No Payment", "Pending"].includes(r.computedStatus)
    ).length,
  }), [enrichedReservations]);

  const openRecordPayment = (reservation) => {
    const breakdown = breakdownFromReservation(reservation);
    const next = suggestNextPayment(breakdown);
    const defaultAmount = getDefaultPaymentAmount(breakdown, next.paymentType);
    setSelectedReservation(reservation);
    setPaymentType(next.paymentType);
    setAmountError("");
    setPaymentAmount(defaultAmount > 0 ? formatMoneyInput(defaultAmount) : "");
    setDiscountEnabled(false);
    setDiscountMode("peso");
    setDiscountPeso("");
    setDiscountPercent("");
    setConsumeAmount("");
    setConsumeReason("");
    setDepositPanelOpen(false);
    setRecordOpen(true);
  };

  const applyDepositSnapshot = (reservationId, deposit) => {
    if (!deposit || reservationId == null) return;
    const merge = (row) =>
      row && row.reservationId === reservationId ? { ...row, deposit } : row;
    setReservations((rows) => rows.map(merge));
    setSelectedReservation((current) => merge(current));
    setHistoryReservation((current) => merge(current));
  };

  const loadHistoryTransactions = async (reservationId) => {
    const res = await fetch(
      `/api/ltoo/payments?history=true&reservationId=${reservationId}`
    );
    if (!res.ok) throw new Error("Failed to load payment history");
    const data = await res.json();
    setHistoryTransactions(Array.isArray(data.transactions) ? data.transactions : []);
  };

  const openPaymentHistory = async (reservation, viewOnly = false) => {
    setHistoryReservation(reservation);
    setHistoryViewOnly(viewOnly);
    setHistoryOpen(true);
    setSelectedTransaction(null);
    setHistoryLoading(true);
    setHistoryTransactions([]);
    setConsumeAmount("");
    setConsumeReason("");
    setDepositPanelOpen(false);
    try {
      await loadHistoryTransactions(reservation.reservationId);
    } catch (err) {
      toast.error(err.message || "Failed to load payment history");
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleRowClick = (reservation) => {
    if (reservation.computedStatus === "Fully Paid") {
      openPaymentHistory(reservation, true);
      return;
    }
    openRecordPayment(reservation);
  };

  const handlePaymentTypeChange = (value) => {
    if (!currentBreakdown) return;
    if (!isPaymentTypeAllowed(currentBreakdown, value)) {
      toast.error(getPaymentTypeBlockReason(currentBreakdown, value) || "This payment type is not available.");
      return;
    }
    setPaymentType(value);
    setAmountError("");
    const defaultAmount = getDefaultPaymentAmount(currentBreakdown, value);
    setPaymentAmount(defaultAmount > 0 ? formatMoneyInput(defaultAmount) : "");
  };

  const handlePaymentAmountChange = (e) => {
    if (isFixedPaymentAmount(paymentType)) return;
    setAmountError("");
    setPaymentAmount(sanitizeMoneyInput(e.target.value, paymentTypeMax));
  };

  const handlePaymentAmountBlur = () => {
    if (isFixedPaymentAmount(paymentType)) return;
    if (!paymentAmount) return;
    const numeric = roundMoney(paymentAmount);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      setPaymentAmount("");
      setAmountError("Enter a valid positive payment amount.");
      return;
    }
    const check = validatePaymentAmount(currentBreakdown, paymentType, numeric);
    if (!check.ok) {
      setAmountError(check.error);
      if (paymentTypeMin > 0 && numeric < paymentTypeMin) {
        setPaymentAmount(formatMoneyInput(paymentTypeMin));
      } else if (numeric > paymentTypeMax) {
        setPaymentAmount(formatMoneyInput(paymentTypeMax));
      }
      toast.error(check.error);
      return;
    }
    setAmountError("");
    setPaymentAmount(formatMoneyInput(Math.min(numeric, paymentTypeMax)));
  };

  const syncAmountToBreakdown = (reservation, extraDiscount, type) => {
    const next = breakdownFromReservation(reservation, extraDiscount);
    if (!next) return;
    const allowedType = isPaymentTypeAllowed(next, type)
      ? type
      : suggestNextPayment(next).paymentType;
    if (allowedType !== type) setPaymentType(allowedType);
    const defaultAmount = getDefaultPaymentAmount(next, allowedType);
    setPaymentAmount(defaultAmount > 0 ? formatMoneyInput(defaultAmount) : "0.00");
  };

  const handleRecordPayment = async () => {
    if (!selectedReservation) return;

    const isDiscountOnly = discountOnlySubmission; // true when "Apply Discount" was clicked
    const amount = isDiscountOnly ? 0 : roundMoney(paymentAmount || 0);
    if (discountEnabled && !discountCheck.ok) {
      toast.error(discountCheck.error || "Enter a valid discount.");
      return;
    }

    const current = breakdownFromReservation(
      selectedReservation,
      discountCheck.ok ? pendingDiscount : 0
    );
    const check = validatePaymentAmount(current, isDiscountOnly ? "full" : (paymentType || "full"), amount, {
      discountSettlesRemaining: discountSettlesRemaining || isDiscountOnly,
    });
    if (!check.ok) {
      setAmountError(check.error);
      toast.error(check.error);
      return;
    }

    if (!isDiscountOnly && amount > current.remainingBalance) {
      toast.error(`Amount cannot exceed ${formatPhp(current.remainingBalance)} remaining.`);
      return;
    }

    setSaving(true);
    try {
      const performedBy = typeof window !== "undefined" ? localStorage.getItem("user_id") || "" : "";
      const performedByName = typeof window !== "undefined" ? localStorage.getItem("user_name") || "" : "";

      const res = await fetch("/api/ltoo/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedBookingId: String(selectedReservation.reservationId),
          paymentType: isDiscountOnly || discountSettlesRemaining
            ? "full"
            : paymentType,
          amountPaid: isDiscountOnly ? 0 : amount,
          clientType: selectedReservation.clientType === "provincial" ? "provincial" : "client",
          clientName: selectedReservation.clientName,
          activityName: selectedReservation.eventType || "",
          performedBy,
          performedByName,
          applyDiscount: discountEnabled && pendingDiscount > 0,
          discountMode,
          discountPeso: discountMode === "full" ? pendingDiscount : roundMoney(discountPeso || 0),
          discountPercent: discountMode === "full" ? 100 : Number(discountPercent || 0),
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to record payment");
      }

      toast.success(isDiscountOnly ? "Discount applied successfully" : "Payment recorded successfully");
      setRecordOpen(false);
      setSelectedReservation(null);
      setDiscountOnlySubmission(false);
      await loadReservations();
    } catch (err) {
      toast.error(err.message || "Failed to record payment");
    } finally {
      setSaving(false);
    }
  };

  const refreshSelectedReservation = async () => {
    const res = await fetch("/api/ltoo/payments?bookings=true");
    const data = await res.json();
    if (!res.ok || !Array.isArray(data)) return;
    setReservations(data);
    setSelectedReservation((current) => {
      if (!current) return current;
      return data.find((row) => row.reservationId === current.reservationId) || current;
    });
    setHistoryReservation((current) => {
      if (!current) return current;
      return data.find((row) => row.reservationId === current.reservationId) || current;
    });
  };

  const handleConsumeDeposit = async () => {
    const reservation = (historyOpen && historyReservation) || selectedReservation;
    if (!reservation) return;
    setDepositSaving(true);
    try {
      const performedBy = typeof window !== "undefined" ? localStorage.getItem("user_id") || "" : "";
      const performedByName = typeof window !== "undefined" ? localStorage.getItem("user_name") || "" : "";
      const res = await fetch("/api/ltoo/deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "consume",
          reservationId: reservation.reservationId,
          amount: roundMoney(consumeAmount),
          reason: consumeReason,
          performedBy,
          performedByName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record deduction");
      toast.success("Deposit deduction recorded");
      setConsumeAmount("");
      setConsumeReason("");
      applyDepositSnapshot(reservation.reservationId, data.deposit);
      setDepositPanelOpen(true);
      await refreshSelectedReservation();
      applyDepositSnapshot(reservation.reservationId, data.deposit);
    } catch (err) {
      toast.error(err.message || "Failed to record deduction");
    } finally {
      setDepositSaving(false);
    }
  };

  const handlePulloutDeposit = async () => {
    const reservation = (historyOpen && historyReservation) || selectedReservation;
    if (!reservation) return;
    setDepositSaving(true);
    try {
      const performedBy = typeof window !== "undefined" ? localStorage.getItem("user_id") || "" : "";
      const performedByName = typeof window !== "undefined" ? localStorage.getItem("user_name") || "" : "";
      const res = await fetch("/api/ltoo/deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "pullout",
          reservationId: reservation.reservationId,
          performedBy,
          performedByName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to pull out deposit");
      toast.success(`Pulled out ${formatPhp(data.releaseAmount)}`);
      applyDepositSnapshot(reservation.reservationId, data.deposit);
      setDepositPanelOpen(true);
      await refreshSelectedReservation();
      applyDepositSnapshot(reservation.reservationId, data.deposit);
      if (historyOpen) {
        try {
          await loadHistoryTransactions(reservation.reservationId);
        } catch (err) {
          toast.error(err.message || "Failed to refresh payment history");
        }
      }
    } catch (err) {
      toast.error(err.message || "Failed to pull out deposit");
    } finally {
      setDepositSaving(false);
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "fully paid") {
      return <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">Fully Paid</Badge>;
    }
    if (s === "depositpaid") {
      return <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50">Deposit Paid</Badge>;
    }
    if (s === "downpaymentpaid") {
      return <Badge variant="outline" className="text-purple-600 border-purple-300 bg-purple-50">Down Payment Paid</Badge>;
    }
    if (s === "incompletepayment") {
      return <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">Partial</Badge>;
    }
    if (s === "no payment" || s === "pending") {
      return <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50">Unpaid</Badge>;
    }
    if (s === "held") {
      return <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50">Held</Badge>;
    }
    if (s === "deducted") {
      return <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">Deducted</Badge>;
    }
    if (s === "fully deducted") {
      return <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50">Fully Deducted</Badge>;
    }
    if (s === "pulled out") {
      return <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50">Pulled Out</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  const getPaymentCheckIcon = (met) => {
    return met
      ? <CheckCircle2 className="size-4 text-green-500 inline" />
      : <XCircle className="size-4 text-red-400 inline" />;
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Payment Recording</h2>
        <p className="text-foreground/80 text-sm leading-relaxed">
          Browse reservations and record payments. Click unpaid or partial rows to record a payment.
          Click fully paid rows to view payment details and history.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Reservations</CardTitle>
          <CardDescription>Each reservation is shown once with total payments and 3 status indicators (50% Down, 10% Deposit, Balance).</CardDescription>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="text-muted-foreground absolute top-2.5 left-2 size-4" />
              <Input
                className="pl-8"
                placeholder="Search by client name or event..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant={paymentFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setPaymentFilter("all")}>
                All ({counts.all})
              </Button>
              <Button variant={paymentFilter === "paid" ? "default" : "outline"} size="sm" onClick={() => setPaymentFilter("paid")}
                className={paymentFilter === "paid" ? "bg-green-600 hover:bg-green-700" : ""}>
                Paid ({counts.paid})
              </Button>
              <Button variant={paymentFilter === "partial" ? "default" : "outline"} size="sm" onClick={() => setPaymentFilter("partial")}
                className={paymentFilter === "partial" ? "bg-amber-600 hover:bg-amber-700" : ""}>
                Partial ({counts.partial})
              </Button>
              <Button variant={paymentFilter === "unpaid" ? "default" : "outline"} size="sm" onClick={() => setPaymentFilter("unpaid")}
                className={paymentFilter === "unpaid" ? "bg-red-600 hover:bg-red-700" : ""}>
                Unpaid ({counts.unpaid})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Event Date</TableHead>
                <TableHead>Payments (Paid / Payable)</TableHead>
                <TableHead>50% Down</TableHead>
                <TableHead>10% Deposit</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={10} className="text-muted-foreground py-8 text-center">Loading...</TableCell></TableRow>
              ) : filteredReservations.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-muted-foreground py-8 text-center">
                  {paymentFilter === "unpaid" ? "No unpaid reservations."
                  : paymentFilter === "partial" ? "No partially paid reservations."
                  : paymentFilter === "paid" ? "No fully paid reservations."
                  : "No reservations found."}
                </TableCell></TableRow>
              ) : (
                filteredReservations.map((r) => (
                  <TableRow
                    key={r.reservationId || r.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRowClick(r)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {r.clientType === "provincial" ? <Building2 className="size-4 text-muted-foreground" /> : <User className="size-4 text-muted-foreground" />}
                        <span className="font-medium">{r.clientName}</span>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{r.clientType === "provincial" ? "Provincial" : "Client"}</Badge></TableCell>
                    <TableCell className="text-sm">{r.eventType || "—"}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="size-3 text-muted-foreground" />
                        {r.eventDate || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="tabular-nums">
                      <span className="font-medium tabular-nums">{formatPhp(r.totalPaid)}</span>
                      <span className="text-foreground/70 text-xs tabular-nums"> / {formatPhp(r.totalPayable)}</span>
                      <span className="block text-xs text-muted-foreground tabular-nums">
                        {formatPercent(r.paidPercent)} of total
                      </span>
                    </TableCell>
                    <TableCell className="text-center">{getPaymentCheckIcon(r.downPaymentMet)}</TableCell>
                    <TableCell className="text-center">{getPaymentCheckIcon(r.depositMet)}</TableCell>
                    <TableCell className="text-center">{getPaymentCheckIcon(r.balanceSettled)}</TableCell>
                    <TableCell>{getStatusBadge(r.computedStatus)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {r.computedStatus !== "Fully Paid" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); openRecordPayment(r); }}
                            className="text-blue-600"
                          >
                            <DollarSign className="size-4 mr-1" />Pay
                          </Button>
                        )}
                        {r.computedStatus === "Fully Paid" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); openPaymentHistory(r, true); }}
                            className="text-green-700"
                          >
                            <Receipt className="size-4 mr-1" />View
                          </Button>
                        )}
                        {hasPaymentHistory(r.computedStatus) && r.computedStatus !== "Fully Paid" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); openPaymentHistory(r, false); }}
                            className="text-foreground/80"
                          >
                            <History className="size-4 mr-1" />History
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Record Payment Dialog */}
      <Dialog open={recordOpen} onOpenChange={(open) => {
        setRecordOpen(open);
        if (!open) {
          setSelectedReservation(null);
          setAmountError("");
        }
      }}>
        <DialogContent className="sm:max-w-lg max-h-[min(90vh,680px)] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="shrink-0 px-6 pt-6 pb-2 border-b border-border/60">
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Recording payment for <strong>{selectedReservation?.clientName}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
            {selectedReservation && currentBreakdown && (
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm space-y-3">
                <div>
                  <p className="font-medium text-foreground leading-snug">
                    {selectedReservation.clientName} — {selectedReservation.eventType}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <CalendarDays className="size-3 shrink-0" />
                    {selectedReservation.eventDate || "—"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                  <span className="text-muted-foreground">Original base</span>
                  <span className="tabular-nums font-medium text-right">{formatPhp(currentBreakdown.originalBase)}</span>
                  <span className="text-muted-foreground">100% Total base (including 10% deposit)</span>
                  <span className="tabular-nums font-medium text-right">{formatPhp(currentBreakdown.originalTotalPayable)}</span>
                  {currentBreakdown.totalDiscount > 0 && (
                    <>
                      <span className="text-muted-foreground">Discounts applied</span>
                      <span className="tabular-nums font-medium text-right text-emerald-700">-{formatPhp(currentBreakdown.totalDiscount)}</span>
                    </>
                  )}
                  <span className="text-muted-foreground">New 100% total (includes 10% deposit)</span>
                  <span className="tabular-nums font-medium text-right">{formatPhp(currentBreakdown.base)}</span>
                  <span className="text-muted-foreground">10% deposit</span>
                  <span className="tabular-nums font-medium text-right">{formatPhp(currentBreakdown.requiredDeposit)}</span>
                  <span className="text-muted-foreground">Already paid</span>
                  <span className="tabular-nums font-medium text-right">{formatPhp(currentBreakdown.paid)}</span>
                  <span className="text-muted-foreground font-medium">Remaining balance</span>
                  <span className="tabular-nums font-semibold text-right">{formatPhp(currentBreakdown.remainingBalance)}</span>
                </div>

                <div className="space-y-1.5 border-t border-border/80 pt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Paid of 100% total</span>
                    <span className="tabular-nums font-semibold">{formatPercent(paidPercent)}</span>
                  </div>
                  <div className="relative h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="absolute inset-y-0 left-0 bg-primary/30"
                      style={{ width: `${Math.min(100, projectedPercent)}%` }}
                    />
                    <div
                      className="absolute inset-y-0 left-0 bg-primary"
                      style={{ width: `${Math.min(100, paidPercent)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    After this entry:{" "}
                    <span className="tabular-nums font-medium text-foreground">
                      {formatPercent(paymentAmount ? projectedPercent : paidPercent)}
                    </span>
                    {paymentAmount ? (
                      <span className="tabular-nums">
                        {" "}
                        (+{formatPercent(getShareOfTotal(roundMoney(paymentAmount), currentBreakdown.totalPayable))})
                      </span>
                    ) : null}
                  </p>
                </div>

                <div className="border-t border-border/80 pt-2 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs">
                    {getPaymentCheckIcon(currentBreakdown.downPaymentMet)}
                    50% down {formatPhp(currentBreakdown.requiredDownPayment)}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs">
                    {getPaymentCheckIcon(currentBreakdown.depositMet)}
                    10% deposit {formatPhp(currentBreakdown.requiredDeposit)}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs">
                    {getPaymentCheckIcon(currentBreakdown.balanceSettled)}
                    Balance {currentBreakdown.balanceSettled ? "settled" : "pending"}
                  </span>
                </div>
              </div>
            )}

            {["No Payment", "Pending"].includes(selectedReservation?.computedStatus) && (
            <div className="rounded-lg border bg-card p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">Discount</p>
                  <p className="text-xs text-muted-foreground">
                    {discountEnabled
                      ? "Active - payment recording is disabled. Only the discount will be recorded."
                      : "Optional. Reduces the full total (including the 10% deposit, 50% down payment, and remaining balance)."}
                  </p>
                </div>
                <Button
                  type="button"
                  variant={discountEnabled ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    const next = !discountEnabled;
                    setDiscountEnabled(next);
                    if (!next) {
                      setDiscountMode("peso");
                      setDiscountPeso("");
                      setDiscountPercent("");
                      syncAmountToBreakdown(selectedReservation, 0, paymentType);
                    }
                  }}
                >
                  <Percent className="size-4 mr-1" />
                  {discountEnabled ? "Remove discount" : "Add discount"}
                </Button>
              </div>
              {discountEnabled && (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="discount-mode"
                        checked={discountMode === "peso"}
                        onChange={() => {
                          setDiscountMode("peso");
                          setDiscountPercent("");
                          syncAmountToBreakdown(selectedReservation, 0, paymentType);
                        }}
                      />
                      Peso
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="discount-mode"
                        checked={discountMode === "percent"}
                        onChange={() => {
                          setDiscountMode("percent");
                          setDiscountPeso("");
                          syncAmountToBreakdown(selectedReservation, 0, paymentType);
                        }}
                      />
                      Percent of 100% total
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="discount-mode"
                        checked={discountMode === "full"}
                        onChange={() => {
                          setDiscountMode("full");
                          setDiscountPeso("");
                          setDiscountPercent("100");
                          setPaymentType("full");
                          setPaymentAmount("0.00");
                          const current = breakdownFromReservation(selectedReservation, 0);
                          syncAmountToBreakdown(selectedReservation, current?.remainingBalance || 0, "full");
                        }}
                      />
                      100%
                    </label>
                  </div>
                  {discountMode === "peso" && (
                    <Input
                      inputMode="decimal"
                      placeholder="0.00"
                      value={discountPeso}
                      onChange={(e) => {
                        const current = breakdownFromReservation(selectedReservation, 0);
                        const max = current
                          ? roundMoney(Math.min(
                            current.remainingBalance,
                            Math.max(0, current.totalPayable - current.requiredDeposit)
                          ))
                          : 0;
                        const next = sanitizeMoneyInput(e.target.value, max);
                        setDiscountPeso(next);
                        syncAmountToBreakdown(selectedReservation, roundMoney(next || 0), paymentType);
                      }}
                      className="tabular-nums"
                    />
                  )}
                  {discountMode === "percent" && (
                    <Input
                      inputMode="decimal"
                      placeholder="0"
                      value={discountPercent}
                      onChange={(e) => {
                        const raw = String(e.target.value).replace(/[^\d.]/g, "");
                        const value = Math.min(100, Number(raw) || 0);
                        setDiscountPercent(raw === "" ? "" : String(value));
                        const current = breakdownFromReservation(selectedReservation, 0);
                        const peso = computeDiscountPeso(current?.totalPayable || 0, { mode: "percent", percent: value });
                        syncAmountToBreakdown(selectedReservation, peso, paymentType);
                      }}
                      className="tabular-nums"
                    />
                  )}
                  {discountMode === "full" && fullDiscountCoverage && (
                    <div className="rounded-md border bg-muted/40 p-3 space-y-1 text-xs">
                      <p className="font-medium text-foreground">This discount applies to:</p>
                      {fullDiscountCoverage.deposit > 0 && (
                        <div className="flex justify-between gap-3">
                          <span className="text-muted-foreground">10% deposit</span>
                          <span className="tabular-nums font-medium">{formatPhp(fullDiscountCoverage.deposit)}</span>
                        </div>
                      )}
                      {fullDiscountCoverage.downpayment > 0 && (
                        <div className="flex justify-between gap-3">
                          <span className="text-muted-foreground">50% down payment</span>
                          <span className="tabular-nums font-medium">{formatPhp(fullDiscountCoverage.downpayment)}</span>
                        </div>
                      )}
                      {fullDiscountCoverage.balance > 0 && (
                        <div className="flex justify-between gap-3">
                          <span className="text-muted-foreground">Remaining balance</span>
                          <span className="tabular-nums font-medium">{formatPhp(fullDiscountCoverage.balance)}</span>
                        </div>
                      )}
                      <div className="flex justify-between gap-3 border-t pt-1 font-medium">
                        <span>Total discounted</span>
                        <span className="tabular-nums">{formatPhp(fullDiscountCoverage.total)}</span>
                      </div>
                    </div>
                  )}
                  {discountCheck.error && (
                    <p className="text-xs text-destructive">{discountCheck.error}</p>
                  )}
                  {pendingDiscount > 0 && discountCheck.ok && discountMode !== "full" && (
                    <div className="rounded-md border bg-muted/40 p-3 space-y-1 text-xs">
                      <p className="font-medium text-foreground">
                        Discount: {formatPhp(pendingDiscount)}
                        {discountMode === "percent" && discountPercent ? ` (${discountPercent}%)` : ""}
                      </p>
                      <div className="flex justify-between gap-3">
                        <span className="text-muted-foreground">New 100% total</span>
                        <span className="tabular-nums font-medium">{formatPhp(currentBreakdown.totalPayable)}</span>
                      </div>
                      {currentBreakdown.requiredDeposit > 0 && (
                        <div className="flex justify-between gap-3">
                          <span className="text-muted-foreground">Remaining 10% deposit</span>
                          <span className="tabular-nums">{formatPhp(currentBreakdown.requiredDeposit)}</span>
                        </div>
                      )}
                      {currentBreakdown.requiredDownPayment > 0 && (
                        <div className="flex justify-between gap-3">
                          <span className="text-muted-foreground">New 50% down payment</span>
                          <span className="tabular-nums">{formatPhp(currentBreakdown.requiredDownPayment)}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {discountSettlesRemaining && (
                    <p className="text-xs text-emerald-700">This discount settles the remaining balance. No cash is collected.</p>
                  )}
                  {discountEnabled && discountCheck.ok && pendingDiscount > 0 && (
                    <div className="pt-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="default"
                        onClick={() => {
                          setDiscountOnlySubmission(true);
                          setConfirmOpen(true);
                        }}
                        disabled={saving || !discountCheck.ok}
                      >
                        {saving ? "Saving..." : "Apply Discount"}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
            )}

            <div className="rounded-lg border bg-card p-4 space-y-4 shadow-sm">
              <fieldset className="space-y-2" disabled={discountEnabled || (currentBreakdown?.balanceSettled && !discountSettlesRemaining)}>
                <legend className="text-sm font-medium">Record What?</legend>
                <div className="space-y-2">
                  {PAYMENT_RADIO_OPTIONS.map((option) => {
                    const allowed = currentBreakdown
                      ? isPaymentTypeAllowed(currentBreakdown, option.value)
                      : false;
                    const blocked = currentBreakdown
                      ? getPaymentTypeBlockReason(currentBreakdown, option.value)
                      : null;
                    const selected = paymentType === option.value;
                    return (
                      <label
                        key={option.value}
                        className={cn(
                          "flex items-start gap-3 rounded-md border px-3 py-2.5 text-sm transition-colors",
                          selected && allowed && !discountEnabled && "border-primary bg-primary/5",
                          allowed && !selected && !discountEnabled && "hover:bg-muted/50 cursor-pointer",
                          (!allowed || discountEnabled) && "opacity-60 cursor-not-allowed bg-muted/20"
                        )}
                      >
                        <input
                          type="radio"
                          name="payment-type"
                          value={option.value}
                          checked={selected}
                          disabled={!allowed}
                          onChange={() => handlePaymentTypeChange(option.value)}
                          className="mt-1 size-4 accent-primary"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                            <span className="font-medium">{option.title}</span>
                            {allowed ? (
                              <span className="tabular-nums text-xs text-muted-foreground">
                                {getRadioOptionPercent(
                                  currentBreakdown,
                                  option.value,
                                  paymentAmount,
                                  selected
                                )}
                              </span>
                            ) : null}
                          </span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {allowed
                              ? getRadioOptionDetail(currentBreakdown, option.value)
                              : blocked}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {discountEnabled
                    ? "Discount mode is active \u2013 no payment is collected, only the discount is recorded."
                    : currentBreakdown?.balanceSettled
                    ? "All payment requirements are satisfied."
                    : paymentTypeBlockReason || (currentBreakdown ? getPaymentTypeHint(currentBreakdown, paymentType) : "")}
                </p>
              </fieldset>

              <div className="space-y-2">
                <Label htmlFor="pay-amount">Payment Amount (₱) *</Label>
                <Input
                  id="pay-amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={paymentAmount}
                  onChange={handlePaymentAmountChange}
                  onBlur={handlePaymentAmountBlur}
                  readOnly={discountEnabled || isFixedPaymentAmount(paymentType)}
                  aria-invalid={Boolean(amountError || (paymentAmount && !paymentAmountCheck.ok))}
                  className={cn(
                    "tabular-nums",
                    (discountEnabled || isFixedPaymentAmount(paymentType)) && "bg-muted",
                    (amountError || (paymentAmount && !paymentAmountCheck.ok)) && "border-destructive"
                  )}
                />
                {isFixedPaymentAmount(paymentType) && (
                  <p className="text-xs text-muted-foreground">
                    Fixed amount for this payment type.
                  </p>
                )}
                {(amountError || (paymentAmount && !paymentAmountCheck.ok && paymentAmountCheck.error)) && (
                  <p className="text-xs text-destructive">
                    {amountError || paymentAmountCheck.error}
                  </p>
                )}
                {paymentType === "both_plus" && paymentTypeMax > 0 && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    <p>
                      <span className="font-medium">Minimum: </span>
                      <span className="tabular-nums font-semibold">{formatPhp(paymentTypeMin)}</span>
                      <span className="text-amber-800/80"> (60% down + deposit)</span>
                    </p>
                    <p className="mt-0.5 text-amber-800/80">
                      You can add more toward the remaining balance, up to{" "}
                      <span className="tabular-nums font-medium">{formatPhp(paymentTypeMax)}</span>.
                    </p>
                    {bothPlusSplit && (
                      <p className="mt-1 tabular-nums">
                        This entry: {formatPhp(bothPlusSplit.installment)} toward 60%
                        {bothPlusSplit.additional > 0
                          ? ` + ${formatPhp(bothPlusSplit.additional)} additional`
                          : ""}
                        .
                      </p>
                    )}
                  </div>
                )}
                {paymentType === "manual" && paymentTypeMax > 0 && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    <p>
                      <span className="font-medium">Minimum: </span>
                      <span className="tabular-nums font-semibold">{formatPhp(paymentTypeMin)}</span>
                      <span className="text-amber-800/80">
                        {!currentBreakdown?.depositMet
                          ? " (10% deposit first)"
                          : !currentBreakdown?.downPaymentMet
                            ? " (50% down payment next)"
                            : paymentTypeMin < BALANCE_PAYMENT_MINIMUM
                              ? " (full remaining balance)"
                              : ` (₱${BALANCE_PAYMENT_MINIMUM.toLocaleString()} remaining-balance minimum)`}
                      </span>
                    </p>
                    <p className="mt-0.5 text-amber-800/80">
                      Applied in order: unpaid 10% deposit, then unpaid 50% down, then remaining balance.
                      Maximum {formatPhp(paymentTypeMax)}. Partial down payment after the deposit is not allowed.
                    </p>
                    {manualAllocation && (
                      <p className="mt-1 tabular-nums">
                        Allocation: deposit {formatPhp(manualAllocation.deposit)}
                        {manualAllocation.downpayment > 0 ? ` · down ${formatPhp(manualAllocation.downpayment)}` : ""}
                        {manualAllocation.balance > 0 ? ` · balance ${formatPhp(manualAllocation.balance)}` : ""}
                        .
                      </p>
                    )}
                  </div>
                )}
                {paymentType === "balance" && paymentTypeMax > 0 && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    <p>
                      <span className="font-medium">Minimum payment: </span>
                      <span className="tabular-nums font-semibold">{formatPhp(paymentTypeMin)}</span>
                      {paymentTypeMin < BALANCE_PAYMENT_MINIMUM ? (
                        <span className="text-amber-800/80"> (full remaining balance)</span>
                      ) : (
                        <span className="text-amber-800/80"> (₱{BALANCE_PAYMENT_MINIMUM.toLocaleString()})</span>
                      )}
                    </p>
                    <p className="mt-0.5 text-amber-800/80">
                      Maximum for this entry:{" "}
                      <span className="tabular-nums font-medium">{formatPhp(paymentTypeMax)}</span>.
                      Amounts below the minimum will be rejected.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2">
                <span className="text-xs text-muted-foreground">Status after this entry</span>
                <div className="text-right">
                  {getStatusBadge(projectedBreakdown?.status ?? currentBreakdown?.status)}
                  <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                    Remaining: {formatPhp(projectedBreakdown?.remainingBalance ?? currentBreakdown?.remainingBalance ?? 0)}
                    {" · "}
                    {formatPercent(paymentAmount ? projectedPercent : paidPercent)} paid
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 mx-0 mb-0 rounded-none border-t bg-muted/50 px-6 py-4 gap-2 sm:justify-between">
            <div className="flex gap-2">
              {selectedReservation && hasPaymentHistory(
                computePaymentBreakdown(
                  selectedReservation.totalAmount,
                  selectedReservation.totalPaid
                ).status
              ) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => openPaymentHistory(selectedReservation, false)}
                >
                  <History className="size-4 mr-1" />
                  History
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { setRecordOpen(false); setSelectedReservation(null); }}>Cancel</Button>
              <Button
                size="sm"
                onClick={() => {
                  setDiscountOnlySubmission(false);
                  const check = validatePaymentAmount(
                    currentBreakdown,
                    paymentType || "full",
                    roundMoney(paymentAmount || 0),
                    { discountSettlesRemaining }
                  );
                  if (!check.ok) {
                    setAmountError(check.error);
                    toast.error(check.error);
                    return;
                  }
                  setConfirmOpen(true);
                }}
                disabled={saving || discountEnabled || !canSubmitPayment}
              >
                {saving ? "Saving..." : "Save Payment"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment History Dialog */}
      <Dialog
        open={historyOpen}
        onOpenChange={(open) => {
          setHistoryOpen(open);
          if (!open) {
            setHistoryReservation(null);
            setHistoryViewOnly(false);
            setSelectedTransaction(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {historyViewOnly ? (
                <Receipt className="size-5" />
              ) : (
                <History className="size-5" />
              )}
              {historyViewOnly ? "Payment Details" : "Payment History"}
            </DialogTitle>
            <DialogDescription>
              {historyReservation?.clientName} — {historyReservation?.eventType}
              {historyReservation?.eventDate ? ` · ${historyReservation.eventDate}` : ""}
            </DialogDescription>
          </DialogHeader>

          {historyReservation && historyBreakdown && (
            <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Status</span>
                {getStatusBadge(historyBreakdown.status)}
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <span className="text-muted-foreground">Original base</span>
                <span className="tabular-nums font-medium text-right">
                  {formatPhp(historyBreakdown.originalBase)}
                </span>
                <span className="text-muted-foreground">100% Total base (including 10% deposit)</span>
                <span className="tabular-nums font-medium text-right">
                  {formatPhp(historyBreakdown.originalTotalPayable)}
                </span>
                {historyBreakdown.totalDiscount > 0 && (
                  <>
                    <span className="text-muted-foreground">Discounts applied</span>
                    <span className="tabular-nums font-medium text-right text-emerald-700">
                      -{formatPhp(historyBreakdown.totalDiscount)}
                    </span>
                  </>
                )}
                <span className="text-muted-foreground">New 100% total (includes 10% deposit)</span>
                <span className="tabular-nums font-medium text-right">
                  {formatPhp(historyBreakdown.base)}
                </span>
                <span className="text-muted-foreground">Total paid</span>
                <span className="tabular-nums font-medium text-right">
                  {formatPhp(historyBreakdown.paid)}
                </span>
                <span className="text-muted-foreground">Remaining balance</span>
                <span className="tabular-nums font-medium text-right">
                  {formatPhp(historyBreakdown.remainingBalance)}
                </span>
                <span className="text-muted-foreground">Paid of 100% total</span>
                <span className="tabular-nums font-medium text-right">
                  {formatPercent(historyBreakdown.paidPercent)}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs">
                  {getPaymentCheckIcon(historyBreakdown.downPaymentMet)}
                  50% down
                </span>
                <span className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs">
                  {getPaymentCheckIcon(historyBreakdown.depositMet)}
                  10% deposit
                </span>
                <span className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs">
                  {getPaymentCheckIcon(historyBreakdown.balanceSettled)}
                  Balance
                </span>
              </div>
            </div>
          )}

          {isFullyPaidReservation(historyReservation) && hasPaidDeposit(historyReservation?.deposit) && (
            <div className="rounded-lg border bg-card p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">10% Deposit</p>
                  <p className="text-xs text-muted-foreground">
                    Consume for damages/overtime or pull out the remaining amount.
                  </p>
                </div>
                <Button
                  type="button"
                  variant={depositPanelOpen ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDepositPanelOpen((open) => !open)}
                >
                  {depositPanelOpen ? "Hide deposit" : "Manage deposit"}
                </Button>
              </div>
              {depositPanelOpen && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    {getStatusBadge(historyReservation.deposit.status)}
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <span className="text-muted-foreground">Original 10%</span>
                    <span className="tabular-nums text-right">{formatPhp(historyReservation.deposit.requiredAmount)}</span>
                    <span className="text-muted-foreground">After deductions</span>
                    <span className="tabular-nums text-right">{formatPhp(historyReservation.deposit.amountAfterDeductions)}</span>
                    <span className="text-muted-foreground">Pullout</span>
                    <span className="text-right">
                      {historyReservation.deposit.pulledOutAt
                        ? formatDateTime(historyReservation.deposit.pulledOutAt)
                        : "Not pulled out"}
                    </span>
                  </div>
                  {(historyReservation.deposit.deductions || []).length > 0 && (
                    <div className="space-y-1">
                      {historyReservation.deposit.deductions.map((row) => (
                        <p key={row.deductionId} className="text-xs text-muted-foreground">
                          {formatPhp(row.amount)} — {row.reason}
                        </p>
                      ))}
                    </div>
                  )}
                  {canConsumeDeposit(historyReservation.deposit) && (
                    <div className="space-y-2 border-t pt-2">
                      <Label>Consume (damages / overtime)</Label>
                      <Input
                        inputMode="decimal"
                        placeholder="Deduction amount"
                        value={consumeAmount}
                        onChange={(e) => setConsumeAmount(sanitizeMoneyInput(e.target.value, historyReservation.deposit.amountAfterDeductions))}
                        className="tabular-nums"
                      />
                      <Textarea
                        placeholder="Reason for deduction (letters only)"
                        value={consumeReason}
                        onChange={(e) => setConsumeReason(sanitizeDeductionReason(e.target.value))}
                        rows={2}
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={depositSaving || !consumeAmount || !consumeReason.trim()}
                          onClick={handleConsumeDeposit}
                        >
                          Record deduction
                        </Button>
                        {canPulloutDeposit(historyReservation.deposit) && (
                          <Button type="button" size="sm" disabled={depositSaving} onClick={handlePulloutDeposit}>
                            Pull out remaining {formatPhp(historyReservation.deposit.amountAfterDeductions)}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {historyLoading ? (
            <p className="text-muted-foreground text-sm py-8 text-center">Loading payments...</p>
          ) : historyTransactions.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">No payments recorded yet.</p>
          ) : (
            <div className="rounded-md border max-h-[min(50vh,360px)] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Recorded by</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyTransactions.map((t) => (
                    <TableRow
                      key={t.transactionId}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedTransaction(t)}
                    >
                      <TableCell className="text-sm tabular-nums whitespace-nowrap">
                        {formatDateTime(t.paymentDate)}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {t.entryType === "deposit_release" ? `Released ${formatPhp(t.amountPaid)}` : formatPhp(t.amountPaid)}
                        {t.discountAmount > 0 && (
                          <span className="block text-xs text-emerald-700">-{formatPhp(t.discountAmount)} discount</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(t.paymentStatus)}</TableCell>
                      <TableCell className="text-sm text-foreground/80">{t.recordedBy}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {historyTransactions.length > 0 && (
            <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2 text-sm">
              <span className="text-foreground/70 flex items-center gap-1">
                <Receipt className="size-4" />
                {historyTransactions.length} payment(s) — click a row for details
              </span>
              <span className="font-medium tabular-nums">
                Total: {formatPhp(
                  historyTransactions.reduce((sum, t) => (
                    t.entryType === "deposit_release" ? sum : sum + (t.amountPaid || 0)
                  ), 0)
                )}
              </span>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={selectedTransaction !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedTransaction(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="size-5" />
              Payment Entry
            </DialogTitle>
            <DialogDescription>
              Recorded payment for {historyReservation?.clientName || "this reservation"}
            </DialogDescription>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">
                  {selectedTransaction.entryType === "deposit_release" ? "Amount released" : "Amount paid"}
                </span>
                <span className="font-semibold tabular-nums">
                  {formatPhp(selectedTransaction.amountPaid)}
                </span>
              </div>
              {selectedTransaction.baseAmount != null && (
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Base amount</span>
                  <span className="font-medium tabular-nums">{formatPhp(selectedTransaction.baseAmount)}</span>
                </div>
              )}
              {selectedTransaction.discountAmount > 0 && (
                <>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="font-medium tabular-nums">
                      {formatPhp(selectedTransaction.discountAmount)}
                      {selectedTransaction.discountPercent != null ? ` (${selectedTransaction.discountPercent}%)` : ""}
                    </span>
                  </div>
                  {selectedTransaction.amountAfterDiscount != null && (
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Amount after discount</span>
                      <span className="font-medium tabular-nums">{formatPhp(selectedTransaction.amountAfterDiscount)}</span>
                    </div>
                  )}
                </>
              )}
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Date & time</span>
                <span className="font-medium tabular-nums">
                  {formatDateTime(selectedTransaction.paymentDate)}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Recorded by</span>
                <span className="font-medium">{selectedTransaction.recordedBy || "—"}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">
                  {selectedTransaction.entryType === "deposit_release" ? "Entry" : "Payment status"}
                </span>
                <span>{getStatusBadge(selectedTransaction.paymentStatus)}</span>
              </div>
              {selectedTransaction.orNumber && (
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">OR number</span>
                  <span className="font-medium">{selectedTransaction.orNumber}</span>
                </div>
              )}
              {(selectedTransaction.depositStatus || selectedTransaction.depositRequiredAmount != null) && (
                <>
                  {selectedTransaction.depositStatus && (
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Deposit status</span>
                      <span>{getStatusBadge(selectedTransaction.depositStatus)}</span>
                    </div>
                  )}
                  {selectedTransaction.depositRequiredAmount != null && (
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Original 10%</span>
                      <span className="font-medium tabular-nums">
                        {formatPhp(selectedTransaction.depositRequiredAmount)}
                      </span>
                    </div>
                  )}
                  {selectedTransaction.depositAmountAfterDeductions != null && (
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">After deductions</span>
                      <span className="font-medium tabular-nums">
                        {formatPhp(selectedTransaction.depositAmountAfterDeductions)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Pullout</span>
                    <span className="font-medium">
                      {selectedTransaction.depositPulledOutAt
                        ? formatDateTime(selectedTransaction.depositPulledOutAt)
                        : "Not pulled out"}
                    </span>
                  </div>
                  {(selectedTransaction.depositDeductions || []).length > 0 && (
                    <div className="space-y-1">
                      <span className="text-muted-foreground">Deductions</span>
                      {selectedTransaction.depositDeductions.map((row) => (
                        <p key={row.deductionId} className="text-sm bg-background rounded-md border p-2">
                          {formatPhp(row.amount)} — {row.reason}
                        </p>
                      ))}
                    </div>
                  )}
                  {selectedTransaction.depositNotes && (
                    <div className="space-y-1">
                      <span className="text-muted-foreground">Deposit notes</span>
                      <p className="text-sm bg-background rounded-md border p-2">
                        {selectedTransaction.depositNotes}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSelectedTransaction(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <Dialog open={confirmOpen} onOpenChange={(open) => { setConfirmOpen(open); if (!open) setDiscountOnlySubmission(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Wallet className="size-5" />{discountOnlySubmission ? "Apply Discount" : "Confirm Payment"}</DialogTitle>
            <DialogDescription>
              {discountOnlySubmission
                ? `Apply discount to ${selectedReservation?.clientName}'s reservation`
                : `Recording payment for ${selectedReservation?.clientName}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="flex justify-between"><span className="text-foreground/70">Client:</span><span className="font-medium text-foreground">{selectedReservation?.clientName}</span></div>
            <div className="flex justify-between"><span className="text-foreground/70">Event:</span><span className="font-medium text-foreground">{selectedReservation?.eventType}</span></div>
            <div className="flex justify-between"><span className="text-foreground/70">Date:</span><span className="font-medium text-foreground">{selectedReservation?.eventDate}</span></div>
            {discountOnlySubmission ? (
              <>
                <div className="flex justify-between"><span className="text-foreground/70">Discount mode:</span><span className="font-medium text-foreground capitalize">{discountMode === "full" ? "100% Full" : discountMode === "percent" ? `${discountPercent}%` : "Fixed peso"}</span></div>
                <div className="flex justify-between"><span className="text-foreground/70">Discount amount:</span><span className="font-medium tabular-nums text-foreground">{formatPhp(pendingDiscount)}</span></div>
                <div className="flex justify-between"><span className="text-foreground/70">New 100% total:</span><span className="font-medium tabular-nums text-foreground">{formatPhp(currentBreakdown?.totalPayable || 0)}</span></div>
                {discountSettlesRemaining && <p className="text-xs text-emerald-700">This discount settles the remaining balance. No cash is collected.</p>}
              </>
            ) : (
              <>
                <div className="flex justify-between"><span className="text-foreground/70">Payment type:</span><span className="font-medium text-foreground capitalize">{getPaymentTypeLabel(paymentType)}</span></div>
            {pendingDiscount > 0 && (
                  <>
                    <div className="flex justify-between"><span className="text-foreground/70">100% total before this discount:</span><span className="font-medium tabular-nums text-foreground">{formatPhp(roundMoney((currentBreakdown?.totalPayable || 0) + pendingDiscount))}</span></div>
                    <div className="flex justify-between"><span className="text-foreground/70">Discount:</span><span className="font-medium tabular-nums text-foreground">{formatPhp(pendingDiscount)}{discountMode === "full" ? " (100%)" : discountMode === "percent" && discountPercent ? ` (${discountPercent}%)` : ""}</span></div>
                    {discountMode === "full" && fullDiscountCoverage && (
                      <>
                        {fullDiscountCoverage.deposit > 0 && (
                          <div className="flex justify-between"><span className="text-foreground/70">Includes 10% deposit:</span><span className="font-medium tabular-nums text-foreground">{formatPhp(fullDiscountCoverage.deposit)}</span></div>
                        )}
                        {fullDiscountCoverage.downpayment > 0 && (
                          <div className="flex justify-between"><span className="text-foreground/70">Includes 50% down:</span><span className="font-medium tabular-nums text-foreground">{formatPhp(fullDiscountCoverage.downpayment)}</span></div>
                        )}
                        {fullDiscountCoverage.balance > 0 && (
                          <div className="flex justify-between"><span className="text-foreground/70">Includes remaining:</span><span className="font-medium tabular-nums text-foreground">{formatPhp(fullDiscountCoverage.balance)}</span></div>
                        )}
                      </>
                    )}
                    <div className="flex justify-between"><span className="text-foreground/70">Amount after discount:</span><span className="font-medium tabular-nums text-foreground">{formatPhp(currentBreakdown?.totalPayable)}</span></div>
                  </>
                )}
                <div className="flex justify-between"><span className="text-foreground/70">Amount:</span><span className="font-medium tabular-nums text-foreground">{formatPhp(paymentAmount || 0)}</span></div>
                <div className="flex justify-between"><span className="text-foreground/70">This entry:</span><span className="font-medium tabular-nums text-foreground">{`${formatPercent(getShareOfTotal(roundMoney(paymentAmount || 0), currentBreakdown?.totalPayable || 0))} of 100% total`}</span></div>
                {bothPlusSplit && (
                  <div className="flex justify-between gap-3">
                    <span className="text-foreground/70">Split:</span>
                    <span className="font-medium tabular-nums text-right text-foreground">
                      {formatPhp(bothPlusSplit.installment)} (60%)
                      {bothPlusSplit.additional > 0 ? ` + ${formatPhp(bothPlusSplit.additional)} additional` : ""}
                    </span>
                  </div>
                )}
                {manualAllocation && (
                  <div className="flex justify-between gap-3">
                    <span className="text-foreground/70">Applied as:</span>
                    <span className="font-medium tabular-nums text-right text-foreground">
                      {[
                        manualAllocation.deposit > 0 ? `deposit ${formatPhp(manualAllocation.deposit)}` : null,
                        manualAllocation.downpayment > 0 ? `down ${formatPhp(manualAllocation.downpayment)}` : null,
                        manualAllocation.balance > 0 ? `balance ${formatPhp(manualAllocation.balance)}` : null,
                      ].filter(Boolean).join(" · ") || "—"}
                    </span>
                  </div>
                )}
                <div className="flex justify-between"><span className="text-foreground/70">Paid after:</span><span className="font-medium tabular-nums text-foreground">{formatPercent(projectedPercent)}</span></div>
                <div className="flex justify-between"><span className="text-foreground/70">Status after payment:</span><span className="font-medium text-foreground">{getStatusLabel(projectedBreakdown?.status ?? currentBreakdown?.status)}</span></div>
                <div className="flex justify-between"><span className="text-foreground/70">Remaining after:</span><span className="font-medium tabular-nums text-foreground">{formatPhp(projectedBreakdown?.remainingBalance ?? currentBreakdown?.remainingBalance ?? 0)}</span></div>
              </>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setConfirmOpen(false); setDiscountOnlySubmission(false); }}>Cancel</Button>
            <Button onClick={() => { setConfirmOpen(false); handleRecordPayment(); }} disabled={saving}>
              {saving ? "Saving..." : (discountOnlySubmission ? "Confirm Discount" : "Confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
