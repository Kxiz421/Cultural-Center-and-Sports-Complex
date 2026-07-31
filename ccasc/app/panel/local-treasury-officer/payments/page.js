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
  Plus,
  Search,
  User,
  Building2,
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

const PAYMENT_STATUS_OPTIONS = [
  { id: "Partially Paid", name: "Partially Paid" },
  { id: "Fully Paid", name: "Fully Paid" },
];

export default function LTOOPaymentsPage() {
  const [payments, setPayments] = React.useState([]);
  const [bookings, setBookings] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
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
    orNumber: "",
    selectedBookingId: "",
    paymentStatus: "",
  });
  const [selectedReservation, setSelectedReservation] = React.useState(null);
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [selectedPayment, setSelectedPayment] = React.useState(null);

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
      orNumber: "",
      selectedBookingId: "",
      paymentStatus: "",
    });
    setSelectedReservation(null);
  };

  // Filter bookings based on client type
  const getFilteredBookings = React.useCallback(() => {
    return bookings.filter((b) => {
      if (!addForm.clientType) return true;
      if (addForm.clientType === "client") return b.clientType === "client" || b.clientType === "walk-in";
      if (addForm.clientType === "provincial") return b.clientType === "provincial-agency";
      return true;
    });
  }, [bookings, addForm.clientType]);

  const handleClientTypeChange = (value) => {
    setAddForm((f) => ({ ...f, clientType: value, selectedBookingId: "", paymentStatus: value === "provincial" ? "Fully Paid" : "" }));
    setSelectedReservation(null);
  };

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

  const handleTotalAmountChange = (value) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 5);
    setAddForm((f) => ({ ...f, totalAmount: cleaned }));

    // Auto-set to Fully Paid if amount >= package rate
    if (selectedReservation) {
      const pkgRate = selectedReservation.packageDayRate || selectedReservation.packageNightRate;
      if (pkgRate && parseInt(cleaned) >= pkgRate) {
        setAddForm((prev) => ({ ...prev, totalAmount: cleaned, paymentStatus: "Fully Paid" }));
      }
    }
  };

  const handleAddPayment = async () => {
    if (!addForm.clientType || !addForm.clientName || !addForm.totalAmount || !addForm.orNumber) {
      toast.error("Client type, name, total amount, and OR number are required");
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

  const filteredPayments = payments.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.clientName?.toLowerCase().includes(q) ||
      p.orNumber?.toLowerCase().includes(q) ||
      p.activityName?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Payment Recording</h2>
          <p className="text-muted-foreground text-sm">
            Record payments from clients and provincial department agencies.
          </p>
        </div>
        <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) resetAddForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 size-4" />Record Payment</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Record New Payment</DialogTitle>
              <DialogDescription>Enter payment details for client or provincial department agency.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="client-type">Client Type *</Label>
                <Select value={addForm.clientType} onValueChange={handleClientTypeChange}>
                  <SelectTrigger id="client-type">
                    <SelectValue placeholder="Select client type" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLIENT_TYPES.map((ct) => (
                      <SelectItem key={ct.id} value={ct.id}>{ct.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Select Reservation</Label>
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
                          {b.clientName} — {b.eventType} ({b.eventDate}) {b.hasBooking ? "✓ Booked" : ""}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {selectedReservation && selectedReservation.packageName && (
                <div className="rounded-lg border bg-blue-50 p-3 text-sm">
                  <p className="text-blue-700 font-medium">Package: {selectedReservation.packageName}</p>
                  {selectedReservation.packageDayRate && (
                    <p className="text-blue-600 text-xs">Day Rate: {formatPHP(selectedReservation.packageDayRate)}</p>
                  )}
                  {selectedReservation.packageNightRate && (
                    <p className="text-blue-600 text-xs">Night Rate: {formatPHP(selectedReservation.packageNightRate)}</p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="client-name">Client Name / Company *</Label>
                <Input id="client-name" placeholder="e.g. Juan Dela Cruz" value={addForm.clientName} onChange={(e) => setAddForm((f) => ({ ...f, clientName: e.target.value }))} />
              </div>

              {addForm.clientType === "client" && (
                <div className="space-y-2">
                  <Label htmlFor="company">Company (Optional)</Label>
                  <Input id="company" placeholder="e.g. ABC Corporation" value={addForm.company} onChange={(e) => setAddForm((f) => ({ ...f, company: e.target.value }))} />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea id="address" rows={2} placeholder="Client address..." value={addForm.address} onChange={(e) => setAddForm((f) => ({ ...f, address: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact">Contact Number</Label>
                <Input id="contact" placeholder="e.g. +63 9XX XXX XXXX" value={addForm.contactNumber} onChange={(e) => setAddForm((f) => ({ ...f, contactNumber: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="activity">Activity Name</Label>
                <Input id="activity" placeholder="e.g. Annual Conference" value={addForm.activityName} onChange={(e) => setAddForm((f) => ({ ...f, activityName: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="activity-date">Activity Date</Label>
                <Input id="activity-date" type="date" value={addForm.activityDate} onChange={(e) => setAddForm((f) => ({ ...f, activityDate: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="total-amount">Total Amount (₱) *</Label>
                <Input id="total-amount" type="text" inputMode="numeric" placeholder="e.g. 50000" value={addForm.totalAmount} onChange={handleTotalAmountChange} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="or-number">Official Receipt (OR) Number *</Label>
                <Input id="or-number" placeholder="e.g. OR-2024-001" value={addForm.orNumber} onChange={(e) => setAddForm((f) => ({ ...f, orNumber: e.target.value }))} />
              </div>

              {addForm.clientType === "client" && (
                <div className="space-y-2">
                  <Label htmlFor="payment-status">Payment Status</Label>
                  <Select value={addForm.paymentStatus} onValueChange={(v) => setAddForm((f) => ({ ...f, paymentStatus: v }))}>
                    <SelectTrigger id="payment-status">
                      <SelectValue placeholder="Select payment status" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_STATUS_OPTIONS.map((ps) => (
                        <SelectItem key={ps.id} value={ps.id}>{ps.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {addForm.clientType === "provincial" && (
                <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                  <p className="text-muted-foreground">Payment status will be automatically set to <span className="font-medium text-foreground">Fully Paid</span> for provincial department agencies.</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { resetAddForm(); setAddOpen(false); }}>Cancel</Button>
              <Button onClick={() => setConfirmOpen(true)} disabled={saving || !addForm.clientType}>
                {saving ? "Saving..." : "Save Payment"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Payment Records</CardTitle>
          <CardDescription>Search payments by client name, OR number, or activity.</CardDescription>
          <div className="relative flex-1 max-w-sm pt-2">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search payments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
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
                <TableHead>Payment Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-muted-foreground py-8 text-center">Loading...</TableCell>
                </TableRow>
              ) : filteredPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-muted-foreground py-8 text-center">No payments found. Record a payment to get started.</TableCell>
                </TableRow>
              ) : (
                filteredPayments.map((p) => (
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
                      <Badge variant={p.paymentStatus === "Fully Paid" ? "outline" : "secondary"} className={p.paymentStatus === "Fully Paid" ? "text-green-600 border-green-300" : "text-amber-600 border-amber-300"}>
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
              <span className="font-medium text-right">{addForm.clientName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-medium text-right">{formatPHP(addForm.totalAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">OR Number:</span>
              <span className="font-medium text-right">{addForm.orNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <span className="font-medium text-right">{addForm.paymentStatus || "Fully Paid"}</span>
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
    </div>
  );
}