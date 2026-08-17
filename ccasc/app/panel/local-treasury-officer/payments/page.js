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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
} from "lucide-react";

function formatPHP(amount) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount || 0);
}

const CLIENT_TYPES = [
  { id: "client", name: "Client" },
  { id: "provincial", name: "Provincial Department Agency" },
];

function generateORNumber() {
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `OR-${year}-${random}`;
}

export default function LTOOPaymentsPage() {
  const [payments, setPayments] = React.useState([]);
  const [bookings, setBookings] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [paymentFilter, setPaymentFilter] = React.useState("all"); // "all", "paid", "partial", "unpaid"
  const [addOpen, setAddOpen] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [addForm, setAddForm] = React.useState({
    clientType: "",
    clientName: "",
    company: "",
    address: "",
    contactNumber: "",
    activityName: "",
    activityDate: "",
    totalAmount: "",
    orNumber: generateORNumber(),
    selectedBookingId: "",
    paymentStatus: "",
  });
  const [selectedReservation, setSelectedReservation] = React.useState(null);
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [selectedPayment, setSelectedPayment] = React.useState(null);
  const [reservationSearch, setReservationSearch] = React.useState("");

  React.useEffect(() => {
    async function loadData() {
      try {
        const [payRes, bookRes] = await Promise.all([
          fetch("/api/ltoo/payments"),
          fetch("/api/ltoo/payments?bookings=true"),
        ]);
        const payData = await payRes.json();
        const bookData = await bookRes.json();
        setPayments(Array.isArray(payData) ? payData : []);
        setBookings(Array.isArray(bookData) ? bookData : []);
      } catch (err) {
        console.error("Failed to load data:", err);
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const resetAddForm = () => {
    setAddForm({
      clientType: "",
      clientName: "",
      company: "",
      address: "",
      contactNumber: "",
      activityName: "",
      activityDate: "",
      totalAmount: "",
      orNumber: generateORNumber(),
      selectedBookingId: "",
      paymentStatus: "",
    });
    setSelectedReservation(null);
    setReservationSearch("");
  };

  // Filter bookings based on search
  const getFilteredBookings = React.useCallback(() => {
    let filtered = bookings;
    if (reservationSearch.trim()) {
      const q = reservationSearch.toLowerCase();
      filtered = filtered.filter((b) =>
        b.clientName?.toLowerCase().includes(q) ||
        b.eventType?.toLowerCase().includes(q) ||
        String(b.reservationId || b.id).includes(q)
      );
    }
    return filtered;
  }, [bookings, reservationSearch]);

  const handleReservationSelect = (reservationId) => {
    const currentFiltered = getFilteredBookings();
    const selected = currentFiltered.find((b) => String(b.reservationId || b.id) === reservationId);
    if (selected) {
      const clientType = selected.clientType === "provincial-agency" ? "provincial" : "client";
      setAddForm((f) => ({
        ...f,
        selectedBookingId: reservationId,
        clientType,
        clientName: selected.clientName,
        activityName: selected.eventType || "",
        activityDate: selected.eventDate || "",
        paymentStatus: clientType === "provincial" ? "Fully Paid" : f.paymentStatus,
      }));
      setSelectedReservation(selected);
    } else {
      setAddForm((f) => ({ ...f, selectedBookingId: reservationId }));
      setSelectedReservation(null);
    }
  };

  const handleAddPayment = async () => {
    if (!addForm.selectedBookingId || !addForm.totalAmount || !addForm.orNumber) {
      toast.error("Please select a reservation and enter the amount and OR number");
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
          ...addForm,
          totalAmount: addForm.totalAmount || null,
          performedBy,
          performedByName,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to record payment");
      }

      toast.success("Payment recorded successfully");
      setAddOpen(false);
      resetAddForm();
      const refreshRes = await fetch("/api/ltoo/payments");
      const refreshData = await refreshRes.json();
      setPayments(Array.isArray(refreshData) ? refreshData : []);
    } catch (err) {
      toast.error(err.message || "Failed to record payment");
    } finally {
      setSaving(false);
    }
  };

  // Filter payments by status
  const filteredPayments = payments.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.clientName?.toLowerCase().includes(q) ||
      p.orNumber?.toLowerCase().includes(q) ||
      p.activityName?.toLowerCase().includes(q)
    );
  });

  const paidPayments = filteredPayments.filter((p) => p.paymentStatus === "Fully Paid");
  const partialPayments = filteredPayments.filter((p) => p.paymentStatus === "Partially Paid" || p.paymentStatus === "Partially Paid");
  const unpaidPayments = filteredPayments.filter((p) => p.paymentStatus === "No Payment" || p.paymentStatus === "Pending");

  const displayedPayments = paymentFilter === "paid" ? paidPayments
    : paymentFilter === "partial" ? partialPayments
    : paymentFilter === "unpaid" ? unpaidPayments
    : filteredPayments;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Payment Recording</h2>
          <p className="text-muted-foreground text-sm">
            Record payments from clients and provincial department agencies. All payments are recorded by the Local Treasury Operations Officer.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Payment Records</CardTitle>
          <CardDescription>Search and filter payments by status.</CardDescription>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="text-muted-foreground absolute top-2.5 left-2 size-4" />
              <Input
                className="pl-8"
                placeholder="Search payments..."
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
                All ({filteredPayments.length})
              </Button>
              <Button
                variant={paymentFilter === "paid" ? "default" : "outline"}
                size="sm"
                onClick={() => setPaymentFilter("paid")}
                className={paymentFilter === "paid" ? "bg-green-600 hover:bg-green-700" : ""}
              >
                Paid ({paidPayments.length})
              </Button>
              <Button
                variant={paymentFilter === "partial" ? "default" : "outline"}
                size="sm"
                onClick={() => setPaymentFilter("partial")}
                className={paymentFilter === "partial" ? "bg-amber-600 hover:bg-amber-700" : ""}
              >
                Partially Paid ({partialPayments.length})
              </Button>
              <Button
                variant={paymentFilter === "unpaid" ? "default" : "outline"}
                size="sm"
                onClick={() => setPaymentFilter("unpaid")}
                className={paymentFilter === "unpaid" ? "bg-red-600 hover:bg-red-700" : ""}
              >
                Unpaid ({unpaidPayments.length})
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
                <TableHead>Activity</TableHead>
                <TableHead>OR Number</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-muted-foreground py-8 text-center">Loading...</TableCell>
                </TableRow>
              ) : displayedPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-muted-foreground py-8 text-center">No payments found.</TableCell>
                </TableRow>
              ) : (
                displayedPayments.map((p) => (
                  <TableRow key={p.paymentId || p.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {p.clientType === "provincial" ? <Building2 className="size-4 text-muted-foreground" /> : <User className="size-4 text-muted-foreground" />}
                        <span className="font-medium">{p.clientName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{p.clientType === "provincial" ? "Provincial" : "Client"}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{p.activityName || "—"}</TableCell>
                    <TableCell className="text-sm font-mono">{p.orNumber}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{formatPHP(p.totalAmount || p.amountPaid)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={p.paymentStatus === "Fully Paid" ? "outline" : "secondary"}
                        className={p.paymentStatus === "Fully Paid" ? "text-green-600 border-green-300" : "text-amber-600 border-amber-300"}
                      >
                        {p.paymentStatus || "Partially Paid"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => { setSelectedPayment(p); setDetailsOpen(true); }}>
                        <Wallet className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Record Payment Dialog - Search & Select Reservation */}
      <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) resetAddForm(); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>Search for a reservation to record a payment against it.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Search Reservations */}
            <div className="space-y-2">
              <Label>Search Reservation</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by client name, event type, or reservation ID..."
                  value={reservationSearch}
                  onChange={(e) => setReservationSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Select Reservation */}
            <div className="space-y-2">
              <Label>Select Reservation *</Label>
              <Select value={addForm.selectedBookingId} onValueChange={handleReservationSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reservation" />
                </SelectTrigger>
                <SelectContent>
                  {getFilteredBookings().length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">No reservations found</div>
                  ) : (
                    getFilteredBookings().map((b) => (
                      <SelectItem key={b.reservationId || b.id} value={String(b.reservationId || b.id)}>
                        {b.clientName} — {b.eventType} ({b.eventDate})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedReservation && (
              <div className="rounded-lg border bg-blue-50 p-3 text-sm">
                <div className="flex items-center gap-1 mb-2">
                  <Info className="size-4 text-blue-600" />
                  <span className="font-medium text-blue-800">Reservation Details</span>
                </div>
                <p className="text-blue-700 font-medium">{selectedReservation.clientName} — {selectedReservation.eventType}</p>
                <p className="text-blue-600 text-xs">Event Date: {selectedReservation.eventDate} | Venue: {selectedReservation.venue}</p>
                {selectedReservation.totalAmount > 0 && (
                  <p className="text-blue-700 text-sm font-semibold mt-1">Total Amount: {formatPHP(selectedReservation.totalAmount)}</p>
                )}
                <p className="text-blue-600 text-xs mt-1">
                  Total Paid: {formatPHP(selectedReservation.totalPaid)} |
                  Balance: {formatPHP(selectedReservation.balanceRemaining)} |
                  Status: {selectedReservation.paymentStatus}
                </p>
                {selectedReservation.paymentStatus === "Pending" && (
                  <p className="text-amber-600 text-xs mt-1">50% Down Payment (₱{(selectedReservation.totalAmount * 0.5).toLocaleString()}) + 10% Deposit (₱{(selectedReservation.totalAmount * 0.1).toLocaleString()}) required</p>
                )}
                {selectedReservation.paymentStatus === "DownPaymentPaid" && (
                  <p className="text-amber-600 text-xs mt-1">10% Deposit (₱{(selectedReservation.totalAmount * 0.1).toLocaleString()}) still needed</p>
                )}
                {selectedReservation.paymentStatus === "DepositPaid" && (
                  <p className="text-blue-600 text-xs mt-1">Remaining Balance: ₱{Math.max(0, selectedReservation.totalAmount - selectedReservation.totalPaid).toLocaleString()}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="client-name">Client Name *</Label>
              <Input id="client-name" value={addForm.clientName} onChange={(e) => setAddForm((f) => ({ ...f, clientName: e.target.value }))} placeholder="Client name" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="total-amount">Payment Amount (₱) *</Label>
              <Input id="total-amount" type="number" placeholder="e.g. 50000" value={addForm.totalAmount} onChange={(e) => {
                const val = e.target.value;
                setAddForm((prev) => ({ ...prev, totalAmount: val }));
              }} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="or-number">Official Receipt (OR) Number</Label>
              <Input id="or-number" value={addForm.orNumber} readOnly className="bg-muted" />
            </div>

            {addForm.clientType !== "provincial" && (
              <div className="space-y-2">
                <Label htmlFor="payment-status">Payment Status</Label>
                <Select value={addForm.paymentStatus} onValueChange={(v) => setAddForm((f) => ({ ...f, paymentStatus: v }))}>
                  <SelectTrigger id="payment-status">
                    <SelectValue placeholder="Select payment status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Partially Paid">Partially Paid</SelectItem>
                    <SelectItem value="Fully Paid">Fully Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetAddForm(); setAddOpen(false); }}>Cancel</Button>
            <Button onClick={() => setConfirmOpen(true)} disabled={saving || !addForm.selectedBookingId}>
              {saving ? "Saving..." : "Save Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Wallet className="size-5" />Confirm Payment</DialogTitle>
            <DialogDescription>Are you sure you want to record this payment?</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Client:</span>
              <span className="font-medium">{addForm.clientName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Reservation:</span>
              <span className="font-medium text-right">{selectedReservation?.eventType || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-medium">{formatPHP(addForm.totalAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">OR Number:</span>
              <span className="font-medium">{addForm.orNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <span className="font-medium">{addForm.paymentStatus || (addForm.clientType === "provincial" ? "Fully Paid" : "Partially Paid")}</span>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button onClick={() => { setConfirmOpen(false); handleAddPayment(); }} disabled={saving}>
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
            <DialogDescription>Full payment record details.</DialogDescription>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-3 rounded-lg border bg-muted/30 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Client:</span>
                <span className="font-medium">{selectedPayment.clientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type:</span>
                <Badge variant="outline">{selectedPayment.clientType === "provincial" ? "Provincial" : "Client"}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Activity:</span>
                <span className="font-medium">{selectedPayment.activityName || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">OR Number:</span>
                <span className="font-medium font-mono">{selectedPayment.orNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-medium">{formatPHP(selectedPayment.totalAmount || selectedPayment.amountPaid)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={selectedPayment.paymentStatus === "Fully Paid" ? "outline" : "secondary"} className={selectedPayment.paymentStatus === "Fully Paid" ? "text-green-600 border-green-300" : "text-amber-600 border-amber-300"}>
                  {selectedPayment.paymentStatus || "Partially Paid"}
                </Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Floating button to open Record Payment dialog */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          size="lg"
          className="rounded-full shadow-lg"
          onClick={() => setAddOpen(true)}
        >
          <Wallet className="mr-2 size-4" />
          Record Payment
        </Button>
      </div>
    </div>
  );
}