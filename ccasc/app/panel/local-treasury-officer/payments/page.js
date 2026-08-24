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
  Info,
  DollarSign,
  CalendarDays,
  CheckCircle2,
  XCircle,
} from "lucide-react";

function formatPHP(amount) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount || 0);
}

function generateORNumber() {
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `OR-${year}-${random}`;
}

// Returns a normalized status token derived from the total amount paid so far.
function getStatusText(totalPaid, totalAmount) {
  if (!totalAmount || totalPaid <= 0) return "No Payment";
  if (totalPaid >= totalAmount) return "Fully Paid";
  const pct = totalPaid / totalAmount;
  if (pct >= 0.6) return "DepositPaid"; // 50% down payment + 10% deposit = 60%
  if (pct >= 0.5) return "DownPaymentPaid";
  return "IncompletePayment";
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
      const totalAmt = r.totalAmount || 0;
      const totalPaid = r.totalPaid || 0;
      const requiredDownPayment = totalAmt * 0.5;
      const requiredDeposit = totalAmt * 0.1;
      const requiredTotal = requiredDownPayment + requiredDeposit; // 60%

      const downPaymentMet = totalPaid >= requiredDownPayment;
      const depositMet = totalPaid >= requiredTotal; // 50% + 10%
      const balanceSettled = totalPaid >= totalAmt;

      let status = "Pending";
      if (totalPaid <= 0) status = "No Payment";
      else if (totalPaid >= totalAmt) status = "Fully Paid";
      else if (totalPaid >= requiredTotal) status = "DepositPaid";
      else if (totalPaid >= requiredDownPayment) status = "DownPaymentPaid";
      else status = "IncompletePayment";

      return {
        ...r,
        requiredDownPayment,
        requiredDeposit,
        downPaymentMet,
        depositMet,
        balanceSettled,
        computedStatus: status,
        remainingBalance: Math.max(0, totalAmt - totalPaid),
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
    setSelectedReservation(reservation);
    setPaymentType("deposit");
    setPaymentAmount(String(reservation.requiredDeposit || 0));
    setOrNumber(generateORNumber());
    setRecordOpen(true);
  };

  const handlePaymentTypeChange = (value) => {
    if (!selectedReservation) return;
    setPaymentType(value);
    if (value === "deposit") {
      setPaymentAmount(String(selectedReservation.requiredDeposit || 0));
    } else if (value === "downpayment") {
      setPaymentAmount(String(selectedReservation.requiredDownPayment || 0));
    } else {
      setPaymentAmount("");
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedReservation || !paymentAmount || !orNumber) return;

    const amount = Number(paymentAmount);
    const {
      totalAmount = 0,
      totalPaid = 0,
      requiredDeposit = 0,
      requiredDownPayment = 0,
      remainingBalance = 0,
    } = selectedReservation;

    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid positive payment amount.");
      return;
    }

    // Never allow an amount above the total balance the client still has to pay.
    if (amount > remainingBalance) {
      toast.error(`Amount cannot exceed the remaining balance of ${formatPHP(remainingBalance)}.`);
      return;
    }

    // The 10% deposit and 50% down payment must be paid in exact amounts.
    if (paymentType === "deposit" && Math.abs(amount - requiredDeposit) > 0.001) {
      toast.error(`The 10% deposit must be exactly ${formatPHP(requiredDeposit)}.`);
      return;
    }
    if (paymentType === "downpayment" && Math.abs(amount - requiredDownPayment) > 0.001) {
      toast.error(`The 50% down payment must be exactly ${formatPHP(requiredDownPayment)}.`);
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
        <h2 className="text-2xl font-semibold tracking-tight">Payment Recording</h2>
        <p className="text-muted-foreground text-sm">
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
                <TableHead>Payments (Paid / Total)</TableHead>
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
                      <span className="font-medium">{formatPHP(r.totalPaid)}</span>
                      <span className="text-muted-foreground text-xs"> / {formatPHP(r.totalAmount)}</span>
                    </TableCell>
                    <TableCell className="text-center">{getPaymentCheckIcon(r.downPaymentMet)}</TableCell>
                    <TableCell className="text-center">{getPaymentCheckIcon(r.depositMet)}</TableCell>
                    <TableCell className="text-center">{getPaymentCheckIcon(r.balanceSettled)}</TableCell>
                    <TableCell>{getStatusBadge(r.computedStatus)}</TableCell>
                    <TableCell className="text-right">
                      {r.computedStatus !== "Fully Paid" ? (
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openRecordPayment(r); }} className="text-blue-600">
                          <DollarSign className="size-4 mr-1" />Pay
                        </Button>
                      ) : (
                        <span className="text-xs text-green-600">✓</span>
                      )}
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Recording payment for <strong>{selectedReservation?.clientName}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {selectedReservation && (
              <div className="rounded-lg border bg-blue-50 p-3 text-sm space-y-2">
                <div className="flex items-center gap-1">
                  <Info className="size-4 text-blue-600" />
                  <span className="font-medium text-blue-800 text-xs">Reservation Details</span>
                </div>
                <p className="text-blue-700 font-medium">{selectedReservation.clientName} — {selectedReservation.eventType}</p>
                <p className="text-blue-600 text-xs flex items-center gap-1">
                  <CalendarDays className="size-3" /> Event Date: {selectedReservation.eventDate || "—"}
                </p>
                <p className="text-blue-600 text-xs">Total Amount: {formatPHP(selectedReservation.totalAmount)}</p>
                <p className="text-blue-600 text-xs">Already Paid: {formatPHP(selectedReservation.totalPaid)}</p>
                <p className="text-blue-600 text-xs">Remaining: {formatPHP(selectedReservation.remainingBalance)}</p>

                <div className="border-t border-blue-200 pt-2 mt-2">
                  <p className="text-xs font-medium text-blue-700 mb-1">Payment Requirements:</p>
                  <div className="flex items-center gap-1 text-xs text-blue-600">
                    {getPaymentCheckIcon(selectedReservation.downPaymentMet)}
                    <span>50% Down Payment: {formatPHP(selectedReservation.requiredDownPayment)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-blue-600">
                    {getPaymentCheckIcon(selectedReservation.depositMet)}
                    <span>10% Deposit: {formatPHP(selectedReservation.requiredDeposit)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-blue-600">
                    {getPaymentCheckIcon(selectedReservation.balanceSettled)}
                    <span>Balance: {formatPHP(selectedReservation.remainingBalance)}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="pay-type">Record What?</Label>
              <Select value={paymentType} onValueChange={handlePaymentTypeChange}>
                <SelectTrigger id="pay-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposit">10% Deposit</SelectItem>
                  <SelectItem value="downpayment">50% Down Payment</SelectItem>
                  <SelectItem value="balance">Remaining Balance</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {paymentType === "deposit"
                  ? `Fixed amount: ${formatPHP(selectedReservation?.requiredDeposit || 0)} (10% of total)`
                  : paymentType === "downpayment"
                    ? `Fixed amount: ${formatPHP(selectedReservation?.requiredDownPayment || 0)} (50% of total)`
                    : `Any amount up to the remaining balance of ${formatPHP(selectedReservation?.remainingBalance || 0)}`}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pay-amount">Payment Amount (₱) *</Label>
              <Input
                id="pay-amount"
                type="number"
                step="0.01"
                min={0}
                max={
                  paymentType === "balance"
                    ? selectedReservation?.remainingBalance || 0
                    : paymentType === "deposit"
                      ? selectedReservation?.requiredDeposit || 0
                      : selectedReservation?.requiredDownPayment || 0
                }
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                disabled={paymentType !== "balance"}
                className={paymentType !== "balance" ? "bg-muted" : ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pay-or">Official Receipt (OR) Number</Label>
              <Input id="pay-or" value={orNumber} readOnly className="bg-muted" />
            </div>

            <div className="space-y-2">
              <Label>Payment Status (auto)</Label>
              <div className="rounded-lg border bg-muted/40 p-2">
                {getStatusBadge(
                  getStatusText(
                    (selectedReservation?.totalPaid || 0) + Number(paymentAmount || 0),
                    selectedReservation?.totalAmount || 0
                  )
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Updates automatically based on the total amount paid.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRecordOpen(false); setSelectedReservation(null); }}>Cancel</Button>
            <Button onClick={() => setConfirmOpen(true)} disabled={saving || !paymentAmount}>
              {saving ? "Saving..." : "Save Payment"}
            </Button>
          </DialogFooter>
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
            <div className="flex justify-between"><span className="text-muted-foreground">Client:</span><span className="font-medium">{selectedReservation?.clientName}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Event:</span><span className="font-medium">{selectedReservation?.eventType}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Date:</span><span className="font-medium">{selectedReservation?.eventDate}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Amount:</span><span className="font-medium">{formatPHP(paymentAmount)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">OR:</span><span className="font-medium">{orNumber}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Status:</span><span className="font-medium">{getStatusLabel(getStatusText((selectedReservation?.totalPaid || 0) + Number(paymentAmount || 0), selectedReservation?.totalAmount || 0))}</span></div>
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