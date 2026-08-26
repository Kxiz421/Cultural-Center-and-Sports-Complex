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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "lucide-react";
import { formatPhp, formatMoneyInput, roundMoney, sanitizeMoneyInput } from "@/lib/utils";
import { computePaymentBreakdown, suggestNextPayment, getPaymentTypeMax, isPaymentTypeAllowed, getPaymentTypeBlockReason, isFixedPaymentAmount } from "@/lib/payment-utils";

function generateORNumber() {
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `OR-${year}-${random}`;
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
  const [orNumber, setOrNumber] = React.useState(generateORNumber());
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [historyReservation, setHistoryReservation] = React.useState(null);
  const [historyTransactions, setHistoryTransactions] = React.useState([]);
  const [historyLoading, setHistoryLoading] = React.useState(false);

  React.useEffect(() => {
    loadReservations();
  }, []);

  async function loadReservations() {
    setLoading(true);
    try {
      // Get all reservations with payment info from the bookings endpoint
      const res = await fetch("/api/ltoo/payments?bookings=true");
      const data = await res.json();
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
      const breakdown = computePaymentBreakdown(r.totalAmount, r.totalPaid);
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

  const currentBreakdown = React.useMemo(() => {
    if (!selectedReservation) return null;
    return computePaymentBreakdown(
      selectedReservation.totalAmount,
      selectedReservation.totalPaid
    );
  }, [selectedReservation]);

  const projectedBreakdown = React.useMemo(() => {
    if (!selectedReservation || !paymentAmount) return null;
    const add = roundMoney(paymentAmount);
    if (add <= 0) return null;
    return computePaymentBreakdown(
      selectedReservation.totalAmount,
      roundMoney((selectedReservation.totalPaid || 0) + add)
    );
  }, [selectedReservation, paymentAmount]);

  const paymentTypeMax = React.useMemo(() => {
    if (!currentBreakdown) return 0;
    return getPaymentTypeMax(currentBreakdown, paymentType);
  }, [currentBreakdown, paymentType]);

  const paymentTypeBlockReason = React.useMemo(() => {
    if (!currentBreakdown) return null;
    return getPaymentTypeBlockReason(currentBreakdown, paymentType);
  }, [currentBreakdown, paymentType]);

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
    const breakdown = computePaymentBreakdown(
      reservation.totalAmount,
      reservation.totalPaid
    );
    const next = suggestNextPayment(breakdown);
    const max = getPaymentTypeMax(breakdown, next.paymentType);
    setSelectedReservation(reservation);
    setPaymentType(next.paymentType);
    setPaymentAmount(
      next.paymentType === "balance"
        ? ""
        : max > 0
          ? formatMoneyInput(max)
          : ""
    );
    setOrNumber(generateORNumber());
    setRecordOpen(true);
  };

  const openPaymentHistory = async (reservation) => {
    setHistoryReservation(reservation);
    setHistoryOpen(true);
    setHistoryLoading(true);
    setHistoryTransactions([]);
    try {
      const res = await fetch(
        `/api/ltoo/payments?history=true&reservationId=${reservation.reservationId}`
      );
      if (!res.ok) throw new Error("Failed to load payment history");
      const data = await res.json();
      setHistoryTransactions(Array.isArray(data.transactions) ? data.transactions : []);
    } catch (err) {
      toast.error(err.message || "Failed to load payment history");
    } finally {
      setHistoryLoading(false);
    }
  };

  const handlePaymentTypeChange = (value) => {
    if (!currentBreakdown) return;
    if (!isPaymentTypeAllowed(currentBreakdown, value)) {
      toast.error(getPaymentTypeBlockReason(currentBreakdown, value) || "This payment type is not available.");
      return;
    }
    const max = getPaymentTypeMax(currentBreakdown, value);
    setPaymentType(value);
    if (value === "balance") {
      setPaymentAmount("");
    } else {
      setPaymentAmount(max > 0 ? formatMoneyInput(max) : "");
    }
  };

  React.useEffect(() => {
    if (!recordOpen || !currentBreakdown) return;
    if (!isPaymentTypeAllowed(currentBreakdown, paymentType)) {
      const next = suggestNextPayment(currentBreakdown);
      const max = getPaymentTypeMax(currentBreakdown, next.paymentType);
      setPaymentType(next.paymentType);
      setPaymentAmount(
        next.paymentType === "balance"
          ? ""
          : max > 0
            ? formatMoneyInput(max)
            : ""
      );
      return;
    }
    const max = getPaymentTypeMax(currentBreakdown, paymentType);
    if (isFixedPaymentAmount(paymentType) && max > 0) {
      setPaymentAmount(formatMoneyInput(max));
    }
  }, [recordOpen, currentBreakdown, paymentType]);

  const handlePaymentAmountChange = (e) => {
    if (isFixedPaymentAmount(paymentType)) return;
    setPaymentAmount(sanitizeMoneyInput(e.target.value, paymentTypeMax));
  };

  const handlePaymentAmountBlur = () => {
    if (isFixedPaymentAmount(paymentType)) return;
    if (!paymentAmount) return;
    const numeric = roundMoney(paymentAmount);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      setPaymentAmount("");
      return;
    }
    const clamped = Math.min(numeric, paymentTypeMax);
    setPaymentAmount(formatMoneyInput(clamped));
  };

  const handleRecordPayment = async () => {
    if (!selectedReservation || !paymentAmount || !orNumber) return;

    const amount = roundMoney(paymentAmount);
    const {
      totalAmount = 0,
      totalPaid = 0,
      remainingBalance = 0,
    } = selectedReservation;

    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid positive payment amount.");
      return;
    }

    const current = computePaymentBreakdown(totalAmount, totalPaid);
    const typeMax = getPaymentTypeMax(current, paymentType);

    if (!isPaymentTypeAllowed(current, paymentType)) {
      const label =
        paymentType === "deposit" ? "10% deposit"
        : paymentType === "downpayment" ? "50% down payment"
        : "remaining balance";
      toast.error(`The ${label} has already been recorded or is not available yet.`);
      return;
    }

    if (amount > remainingBalance || amount > typeMax) {
      toast.error(`Amount cannot exceed ${formatPhp(typeMax)} for this payment.`);
      return;
    }

    if (isFixedPaymentAmount(paymentType) && roundMoney(amount) !== roundMoney(typeMax)) {
      toast.error(`You must pay the full amount of ${formatPhp(typeMax)}.`);
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
          paymentType,
          amountPaid: amount,
          orNumber,
          clientType: selectedReservation.clientType === "provincial" ? "provincial" : "client",
          clientName: selectedReservation.clientName,
          activityName: selectedReservation.eventType || "",
          performedBy,
          performedByName,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to record payment");
      }

      toast.success("Payment recorded successfully");
      setRecordOpen(false);
      setSelectedReservation(null);
      await loadReservations();
    } catch (err) {
      toast.error(err.message || "Failed to record payment");
    } finally {
      setSaving(false);
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
          Browse reservations and record payments. Each reservation shows once with its aggregated payment status. Click on unpaid/partial reservations to record a payment.
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
                    className={r.computedStatus !== "Fully Paid" ? "cursor-pointer hover:bg-muted/50" : ""}
                    onClick={() => r.computedStatus !== "Fully Paid" && openRecordPayment(r)}
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
                        {hasPaymentHistory(r.computedStatus) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); openPaymentHistory(r); }}
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
      <Dialog open={recordOpen} onOpenChange={(open) => { setRecordOpen(open); if (!open) setSelectedReservation(null); }}>
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
                  <span className="text-muted-foreground">Base amount</span>
                  <span className="tabular-nums font-medium text-right">{formatPhp(currentBreakdown.base)}</span>
                  <span className="text-muted-foreground">10% deposit</span>
                  <span className="tabular-nums font-medium text-right">{formatPhp(currentBreakdown.requiredDeposit)}</span>
                  <span className="text-muted-foreground">Total payable</span>
                  <span className="tabular-nums font-medium text-right">{formatPhp(currentBreakdown.totalPayable)}</span>
                  <span className="text-muted-foreground">Already paid</span>
                  <span className="tabular-nums font-medium text-right">{formatPhp(currentBreakdown.paid)}</span>
                  <span className="text-muted-foreground font-medium">Remaining</span>
                  <span className="tabular-nums font-semibold text-right">{formatPhp(currentBreakdown.remainingBalance)}</span>
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

            <div className="rounded-lg border bg-card p-4 space-y-4 shadow-sm">
              <div className="space-y-2">
                <Label htmlFor="pay-type">Record What?</Label>
                <Select
                  value={paymentType}
                  onValueChange={handlePaymentTypeChange}
                  disabled={currentBreakdown?.balanceSettled}
                >
                  <SelectTrigger id="pay-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      value="downpayment"
                      disabled={currentBreakdown?.downPaymentMet}
                    >
                      50% Down Payment
                      {currentBreakdown?.downPaymentMet ? " (Paid)" : ""}
                    </SelectItem>
                    <SelectItem
                      value="deposit"
                      disabled={currentBreakdown?.depositMet}
                    >
                      10% Deposit
                      {currentBreakdown?.depositMet ? " (Paid)" : ""}
                    </SelectItem>
                    {currentBreakdown?.requirementsMet && !currentBreakdown?.balanceSettled && (
                      <SelectItem value="balance">
                        Remaining Balance
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {currentBreakdown?.balanceSettled
                    ? "All payment requirements are satisfied."
                    : paymentTypeBlockReason
                      ? paymentTypeBlockReason
                      : paymentType === "deposit"
                        ? `Required: ${formatPhp(paymentTypeMax)} (10% of base)`
                        : paymentType === "downpayment"
                          ? `Required: ${formatPhp(paymentTypeMax)} (50% of base)`
                          : `Up to ${formatPhp(paymentTypeMax)} remaining`}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
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
                    readOnly={isFixedPaymentAmount(paymentType)}
                    className={`tabular-nums ${isFixedPaymentAmount(paymentType) ? "bg-muted" : ""}`}
                  />
                  {isFixedPaymentAmount(paymentType) && (
                    <p className="text-xs text-muted-foreground">
                      Fixed installment amount.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pay-or">OR Number</Label>
                  <Input id="pay-or" value={orNumber} readOnly className="bg-muted font-mono text-sm" />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2">
                <span className="text-xs text-muted-foreground">Status after this entry</span>
                <div className="text-right">
                  {getStatusBadge(currentBreakdown?.status)}
                  <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                    Remaining: {formatPhp(currentBreakdown?.remainingBalance ?? 0)}
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
                  onClick={() => openPaymentHistory(selectedReservation)}
                >
                  <History className="size-4 mr-1" />
                  History
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { setRecordOpen(false); setSelectedReservation(null); }}>Cancel</Button>
              <Button size="sm" onClick={() => setConfirmOpen(true)} disabled={saving || !currentBreakdown || currentBreakdown.balanceSettled || !isPaymentTypeAllowed(currentBreakdown, paymentType) || !paymentAmount || roundMoney(paymentAmount || 0) <= 0 || roundMoney(paymentAmount || 0) > paymentTypeMax}>
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
          if (!open) setHistoryReservation(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="size-5" />
              Payment History
            </DialogTitle>
            <DialogDescription>
              {historyReservation?.clientName} — {historyReservation?.eventType}
              {historyReservation?.eventDate ? ` · ${historyReservation.eventDate}` : ""}
            </DialogDescription>
          </DialogHeader>
          {historyLoading ? (
            <p className="text-muted-foreground text-sm py-8 text-center">Loading history...</p>
          ) : historyTransactions.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">No payments recorded yet.</p>
          ) : (
            <div className="rounded-md border max-h-[min(60vh,400px)] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>OR Number</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Recorded by</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyTransactions.map((t) => (
                    <TableRow key={t.transactionId}>
                      <TableCell className="text-sm tabular-nums whitespace-nowrap">
                        {formatDateTime(t.paymentDate)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{t.orNumber}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatPhp(t.amountPaid)}
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
                {historyTransactions.length} transaction(s)
              </span>
              <span className="font-medium tabular-nums">
                Total: {formatPhp(
                  historyTransactions.reduce((sum, t) => sum + (t.amountPaid || 0), 0)
                )}
              </span>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Wallet className="size-5" />Confirm Payment</DialogTitle>
            <DialogDescription>Recording payment for {selectedReservation?.clientName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="flex justify-between"><span className="text-foreground/70">Client:</span><span className="font-medium text-foreground">{selectedReservation?.clientName}</span></div>
            <div className="flex justify-between"><span className="text-foreground/70">Event:</span><span className="font-medium text-foreground">{selectedReservation?.eventType}</span></div>
            <div className="flex justify-between"><span className="text-foreground/70">Date:</span><span className="font-medium text-foreground">{selectedReservation?.eventDate}</span></div>
            <div className="flex justify-between"><span className="text-foreground/70">Amount:</span><span className="font-medium tabular-nums text-foreground">{formatPhp(paymentAmount)}</span></div>
            <div className="flex justify-between"><span className="text-foreground/70">OR:</span><span className="font-medium text-foreground">{orNumber}</span></div>
            <div className="flex justify-between"><span className="text-foreground/70">Status after payment:</span><span className="font-medium text-foreground">{getStatusLabel(projectedBreakdown?.status ?? currentBreakdown?.status)}</span></div>
            <div className="flex justify-between"><span className="text-foreground/70">Remaining after:</span><span className="font-medium tabular-nums text-foreground">{formatPhp(projectedBreakdown?.remainingBalance ?? currentBreakdown?.remainingBalance ?? 0)}</span></div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button onClick={() => { setConfirmOpen(false); handleRecordPayment(); }} disabled={saving}>
              {saving ? "Saving..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}