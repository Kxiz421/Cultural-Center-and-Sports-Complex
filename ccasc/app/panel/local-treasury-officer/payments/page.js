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

export default function LTOOPaymentsPage() {
  const [reservations, setReservations] = React.useState([]);
  const [payments, setPayments] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [paymentFilter, setPaymentFilter] = React.useState("all");
  const [recordOpen, setRecordOpen] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [selectedReservation, setSelectedReservation] = React.useState(null);
  const [paymentAmount, setPaymentAmount] = React.useState("");
  const [paymentStatus, setPaymentStatus] = React.useState("Partially Paid");
  const [orNumber, setOrNumber] = React.useState(generateORNumber());
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [selectedPayment, setSelectedPayment] = React.useState(null);

  React.useEffect(() => {
    async function loadData() {
      try {
        const [payRes, bookRes] = await Promise.all([
          fetch("/api/ltoo/payments"),        // Payment records
          fetch("/api/ltoo/payments?bookings=true"), // Reservations with payment status
        ]);
        const payData = await payRes.json();
        const bookData = await bookRes.json();
        setPayments(Array.isArray(payData) ? payData : []);
        setReservations(Array.isArray(bookData) ? bookData : []);
      } catch (err) {
        console.error("Failed to load data:", err);
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Merge reservations into the display list
  const displayItems = React.useMemo(() => {
    const items = [];

    // Add payment records (for Paid/Partially Paid history)
    payments.forEach((p) => {
      items.push({
        type: "payment",
        id: p.paymentId || p.id,
        key: `pay-${p.paymentId || p.id}`,
        clientName: p.clientName,
        clientType: p.clientType,
        activityName: p.activityName || "",
        orNumber: p.orNumber,
        amount: p.totalAmount || p.amountPaid || 0,
        paymentStatus: p.paymentStatus || "Partially Paid",
        createdAt: p.createdAt,
        reservationId: null,
        canRecord: false,
      });
    });

    // Add reservations with no payments (Unpaid)
    reservations
      .filter((r) => {
        // Only show if no payment records exist yet (or totalPaid is 0)
        const hasPaymentRecord = payments.some(
          (p) => String(p.booking?.reservationId || p.reservationId) === String(r.reservationId)
        );
        return !hasPaymentRecord || r.totalPaid <= 0;
      })
      .forEach((r) => {
        items.push({
          type: "reservation",
          id: r.reservationId,
          key: `res-${r.reservationId}`,
          clientName: r.clientName,
          clientType: r.clientType === "provincial-agency" ? "provincial" : r.clientType,
          activityName: r.eventType || "",
          orNumber: "",
          amount: r.totalPaid || 0,
          paymentStatus: r.totalPaid <= 0 ? "No Payment" : (r.paymentStatus || "Pending"),
          createdAt: null,
          reservationId: r.reservationId,
          canRecord: true,
          totalAmount: r.totalAmount,
          totalPaid: r.totalPaid,
          reservationData: r,
        });
      });

    return items;
  }, [payments, reservations]);

  // Filter by status
  const filteredItems = React.useMemo(() => {
    let items = displayItems;
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (i) =>
          i.clientName?.toLowerCase().includes(q) ||
          i.activityName?.toLowerCase().includes(q) ||
          i.orNumber?.toLowerCase().includes(q)
      );
    }
    if (paymentFilter === "paid") {
      return items.filter((i) => i.paymentStatus === "Fully Paid");
    }
    if (paymentFilter === "partial") {
      return items.filter(
        (i) =>
          i.paymentStatus === "Partially Paid" ||
          i.paymentStatus === "DownPaymentPaid" ||
          i.paymentStatus === "DepositPaid" ||
          i.paymentStatus === "IncompletePayment"
      );
    }
    if (paymentFilter === "unpaid") {
      return items.filter(
        (i) =>
          i.paymentStatus === "No Payment" ||
          i.paymentStatus === "Pending"
      );
    }
    return items;
  }, [displayItems, search, paymentFilter]);

  const countByStatus = React.useMemo(() => ({
    all: displayItems.length,
    paid: displayItems.filter((i) => i.paymentStatus === "Fully Paid").length,
    partial: displayItems.filter((i) =>
      ["Partially Paid", "DownPaymentPaid", "DepositPaid", "IncompletePayment"].includes(i.paymentStatus)
    ).length,
    unpaid: displayItems.filter((i) =>
      ["No Payment", "Pending"].includes(i.paymentStatus)
    ).length,
  }), [displayItems]);

  const openRecordPayment = (item) => {
    setSelectedReservation(item);
    setPaymentAmount("");
    setPaymentStatus(item.clientType === "provincial" ? "Fully Paid" : "Partially Paid");
    setOrNumber(generateORNumber());
    setRecordOpen(true);
  };

  const handleRecordPayment = async () => {
    if (!selectedReservation || !paymentAmount || !orNumber) return;

    setSaving(true);
    try {
      const performedBy = typeof window !== "undefined" ? localStorage.getItem("user_id") || "" : "";
      const performedByName = typeof window !== "undefined" ? localStorage.getItem("user_name") || "" : "";

      const res = await fetch("/api/ltoo/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedBookingId: String(selectedReservation.reservationId),
          totalAmount: paymentAmount,
          orNumber,
          clientType: selectedReservation.clientType === "provincial" ? "provincial" : "client",
          clientName: selectedReservation.clientName,
          activityName: selectedReservation.activityName,
          paymentStatus,
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

      // Refresh data
      const [payRes, bookRes] = await Promise.all([
        fetch("/api/ltoo/payments"),
        fetch("/api/ltoo/payments?bookings=true"),
      ]);
      setPayments(Array.isArray(await payRes.json()) ? await payRes.json() : []);
      setReservations(Array.isArray(await bookRes.json()) ? await bookRes.json() : []);
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
    if (["partially paid", "depositpaid", "downpaymentpaid", "incompletepayment"].includes(s)) {
      return <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">{status}</Badge>;
    }
    if (s === "no payment" || s === "pending") {
      return <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50">Unpaid</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Payment Recording</h2>
        <p className="text-muted-foreground text-sm">
          Browse reservations, record payments, and view payment history. Click on an unpaid or partially paid reservation to record a payment.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Reservations & Payments</CardTitle>
          <CardDescription>Search and filter by payment status. Click on unpaid/partial reservations to record payment.</CardDescription>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="text-muted-foreground absolute top-2.5 left-2 size-4" />
              <Input
                className="pl-8"
                placeholder="Search by client, activity, or OR number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={paymentFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setPaymentFilter("all")}
              >
                All ({countByStatus.all})
              </Button>
              <Button
                variant={paymentFilter === "paid" ? "default" : "outline"}
                size="sm"
                onClick={() => setPaymentFilter("paid")}
                className={paymentFilter === "paid" ? "bg-green-600 hover:bg-green-700" : ""}
              >
                Paid ({countByStatus.paid})
              </Button>
              <Button
                variant={paymentFilter === "partial" ? "default" : "outline"}
                size="sm"
                onClick={() => setPaymentFilter("partial")}
                className={paymentFilter === "partial" ? "bg-amber-600 hover:bg-amber-700" : ""}
              >
                Partially Paid ({countByStatus.partial})
              </Button>
              <Button
                variant={paymentFilter === "unpaid" ? "default" : "outline"}
                size="sm"
                onClick={() => setPaymentFilter("unpaid")}
                className={paymentFilter === "unpaid" ? "bg-red-600 hover:bg-red-700" : ""}
              >
                Unpaid ({countByStatus.unpaid})
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
                <TableHead>Activity / OR</TableHead>
                <TableHead className="text-right">Amount / Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground py-8 text-center">Loading...</TableCell>
                </TableRow>
              ) : filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground py-8 text-center">
                    {paymentFilter === "unpaid" ? "No unpaid reservations found. All reservations have at least a partial payment."
                    : paymentFilter === "partial" ? "No partially paid reservations."
                    : paymentFilter === "paid" ? "No fully paid reservations."
                    : "No records found."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item) => (
                  <TableRow
                    key={item.key}
                    className={item.canRecord ? "cursor-pointer hover:bg-muted/50" : ""}
                    onClick={() => item.canRecord && openRecordPayment(item)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {item.clientType === "provincial" ? <Building2 className="size-4 text-muted-foreground" /> : <User className="size-4 text-muted-foreground" />}
                        <span className="font-medium">{item.clientName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {item.clientType === "provincial" ? "Provincial" : "Client"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {item.type === "reservation" ? (
                        <span>{item.activityName}</span>
                      ) : (
                        <span className="font-mono text-xs">{item.orNumber || "—"}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {item.type === "reservation" ? (
                        <div>
                          <span className="font-medium">{formatPHP(item.totalPaid)}</span>
                          <span className="text-muted-foreground text-xs"> / {formatPHP(item.totalAmount)}</span>
                        </div>
                      ) : (
                        <span className="font-medium">{formatPHP(item.amount)}</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(item.paymentStatus)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        : item.type === "reservation" ? "—" : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.canRecord ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); openRecordPayment(item); }}
                          className="text-blue-600"
                        >
                          <DollarSign className="size-4 mr-1" />
                          Pay
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPayment({
                              clientName: item.clientName,
                              clientType: item.clientType,
                              activityName: item.activityName,
                              orNumber: item.orNumber,
                              amount: item.amount,
                              paymentStatus: item.paymentStatus,
                            });
                            setDetailsOpen(true);
                          }}
                        >
                          <Wallet className="size-4" />
                        </Button>
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
              Recording payment for <strong>{selectedReservation?.clientName}</strong> — {selectedReservation?.activityName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {selectedReservation?.reservationData && (
              <div className="rounded-lg border bg-blue-50 p-3 text-sm">
                <div className="flex items-center gap-1 mb-2">
                  <Info className="size-4 text-blue-600" />
                  <span className="font-medium text-blue-800 text-xs">Reservation Summary</span>
                </div>
                <p className="text-blue-700 font-medium">{selectedReservation.clientName} — {selectedReservation.activityName}</p>
                <p className="text-blue-600 text-xs">Total Amount: {formatPHP(selectedReservation.reservationData.totalAmount)}</p>
                <p className="text-blue-600 text-xs">Already Paid: {formatPHP(selectedReservation.totalPaid)}</p>
                <p className="text-blue-600 text-xs">Remaining: {formatPHP(Math.max(0, (selectedReservation.reservationData.totalAmount || 0) - (selectedReservation.totalPaid || 0)))}</p>
                {selectedReservation.totalPaid <= 0 && (
                  <p className="text-amber-600 text-xs mt-1">
                    50% Down Payment ({formatPHP((selectedReservation.reservationData.totalAmount || 0) * 0.5)}) + 10% Deposit ({formatPHP((selectedReservation.reservationData.totalAmount || 0) * 0.1)}) required
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="pay-amount">Payment Amount (₱) *</Label>
              <Input
                id="pay-amount"
                type="number"
                placeholder="e.g. 50000"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pay-or">Official Receipt (OR) Number</Label>
              <Input id="pay-or" value={orNumber} readOnly className="bg-muted" />
            </div>

            {selectedReservation?.clientType !== "provincial" && (
              <div className="space-y-2">
                <Label htmlFor="pay-status">Payment Status</Label>
                <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                  <SelectTrigger id="pay-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Partially Paid">Partially Paid</SelectItem>
                    <SelectItem value="Fully Paid">Fully Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedReservation?.clientType === "provincial" && (
              <p className="text-xs text-muted-foreground">Payment status will be set to Fully Paid for provincial agencies.</p>
            )}
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
            <DialogDescription>
              Recording payment for {selectedReservation?.clientName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Client:</span><span className="font-medium">{selectedReservation?.clientName}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Activity:</span><span className="font-medium">{selectedReservation?.activityName}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Amount:</span><span className="font-medium">{formatPHP(paymentAmount)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">OR:</span><span className="font-medium">{orNumber}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Status:</span><span className="font-medium">{paymentStatus}</span></div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button onClick={() => { setConfirmOpen(false); handleRecordPayment(); }} disabled={saving}>
              {saving ? "Saving..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Wallet className="size-5" />Payment Details</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-3 rounded-lg border bg-muted/30 p-4 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Client:</span><span className="font-medium">{selectedPayment.clientName}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Type:</span><Badge variant="outline">{selectedPayment.clientType === "provincial" ? "Provincial" : "Client"}</Badge></div>
              <div className="flex justify-between"><span className="text-muted-foreground">OR:</span><span className="font-medium font-mono">{selectedPayment.orNumber}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Amount:</span><span className="font-medium">{formatPHP(selectedPayment.amount)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status:</span>{getStatusBadge(selectedPayment.paymentStatus)}</div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}