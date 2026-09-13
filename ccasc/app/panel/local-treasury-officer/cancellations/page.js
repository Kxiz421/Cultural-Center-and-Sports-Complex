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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  XCircle,
  AlertTriangle,
  User,
  Building2,
  CalendarDays,
  Clock,
  CreditCard,
  Filter,
} from "lucide-react";

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "Confirmed", label: "Confirmed" },
  { value: "Cancelled", label: "Cancelled" },
  { value: "Pending", label: "Pending" },
];

function getStatusStyle(status) {
  switch (status) {
    case "Confirmed":
      return "bg-blue-100 text-blue-800";
    case "Cancelled":
      return "bg-red-100 text-red-800";
    case "Pending":
      return "bg-yellow-100 text-yellow-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function getPaymentBadgeProps(paymentStatus) {
  if (paymentStatus === "Fully Paid") {
    return { variant: "default", className: "bg-green-100 text-green-800 hover:bg-green-100" };
  }
  if (paymentStatus === "Partially Paid") {
    return { variant: "secondary", className: "" };
  }
  return { variant: "outline", className: "" };
}

export default function LTOOCancellationsPage() {
  const [bookings, setBookings] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [venueFilter, setVenueFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [selectedBooking, setSelectedBooking] = React.useState(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    async function loadBookings() {
      try {
        const res = await fetch("/api/ltoo/cancellations");
        const data = await res.json();
        setBookings(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load bookings:", err);
        toast.error("Failed to load bookings");
      } finally {
        setLoading(false);
      }
    }
    loadBookings();
  }, []);

  const handleCancelBooking = async () => {
    if (!selectedBooking) return;
    setSaving(true);
    try {
      const performedBy = typeof window !== "undefined" ? localStorage.getItem("user_id") || "" : "";
      const performedByName = typeof window !== "undefined" ? localStorage.getItem("user_name") || "" : "";

      const res = await fetch("/api/ltoo/cancellations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: selectedBooking.bookingId || selectedBooking.id,
          performedBy,
          performedByName,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to cancel booking");
      }

      toast.success("Booking cancelled successfully");
      setConfirmOpen(false);
      setDetailOpen(false);
      setSelectedBooking(null);
      // Refresh
      const refreshRes = await fetch("/api/ltoo/cancellations");
      const refreshData = await refreshRes.json();
      setBookings(Array.isArray(refreshData) ? refreshData : []);
    } catch (err) {
      toast.error(err.message || "Failed to cancel booking");
    } finally {
      setSaving(false);
    }
  };

  const canCancel = (booking) => {
    if (booking.clientType === "provincial") return false;
    if (booking.paymentStatus === "Fully Paid") return false;
    if (booking.bookingStatus !== "Confirmed") return false;

    const eventDate = new Date(booking.eventDate);
    const today = new Date();
    const diffDays = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
    return diffDays >= 2;
  };

  const filteredBookings = bookings.filter((b) => {
    if (venueFilter !== "all" && b.venueId !== parseInt(venueFilter) && b.venue !== venueFilter) return false;
    if (statusFilter !== "all" && b.bookingStatus !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        b.clientName?.toLowerCase().includes(q) ||
        b.activityName?.toLowerCase().includes(q) ||
        b.venue?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const openDetail = (booking) => {
    setSelectedBooking(booking);
    setDetailOpen(true);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setTimeout(() => setSelectedBooking(null), 200);
  };

  const closeConfirm = () => {
    setConfirmOpen(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Booking Cancellation</h2>
        <p className="text-muted-foreground text-sm">
          Click a row to view full booking details. Cancel private/walk-in bookings when payment is not completed at least 2 days before the event.
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>All Bookings</CardTitle>
          <CardDescription>
            Overview of bookings with client details, payment status, and cancellation options.
          </CardDescription>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="text-muted-foreground absolute top-2.5 left-2 size-4" />
              <Input
                className="pl-8"
                placeholder="Search by client, activity, venue..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-[180px]">
              <Select value={venueFilter} onValueChange={setVenueFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All venues" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Venues</SelectItem>
                  <SelectItem value="1">Cultural Center</SelectItem>
                  <SelectItem value="2">Sports Complex</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-[180px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <Filter className="size-3.5 mr-1 text-muted-foreground" />
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                <TableHead>Venue</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time Slot</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-muted-foreground py-8 text-center">
                    Loading bookings...
                  </TableCell>
                </TableRow>
              ) : filteredBookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-muted-foreground py-8 text-center">
                    No bookings match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredBookings.map((b) => {
                  const badge = getPaymentBadgeProps(b.paymentStatus);
                  return (
                    <TableRow
                      key={b.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => openDetail(b)}
                    >
                      <TableCell className="font-medium">{b.clientName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs whitespace-nowrap">
                          {b.clientType === "provincial" ? (
                            <><Building2 className="size-3 mr-1 inline" />Provincial</>
                          ) : (
                            <><User className="size-3 mr-1 inline" />Client</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[160px] truncate" title={b.activityName || ""}>
                        {b.activityName || "—"}
                      </TableCell>
                      <TableCell>{b.venue || "—"}</TableCell>
                      <TableCell className="whitespace-nowrap">{b.eventDate || "—"}</TableCell>
                      <TableCell className="whitespace-nowrap">{b.timeSlot || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={badge.variant} className={`text-xs ${badge.className}`}>
                          {b.paymentStatus || "No Payment"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusStyle(b.bookingStatus)}`}>
                          {b.bookingStatus || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {b.bookingStatus === "Confirmed" && canCancel(b) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBooking(b);
                              setConfirmOpen(true);
                            }}
                            title="Cancel this booking"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <XCircle className="size-4" />
                          </Button>
                        )}
                        {b.bookingStatus === "Confirmed" && !canCancel(b) && (
                          <span className="text-xs text-muted-foreground">
                            {b.paymentStatus === "Fully Paid" ? "Paid" : b.clientType === "provincial" ? "Provincial" : "Locked"}
                          </span>
                        )}
                        {b.bookingStatus !== "Confirmed" && (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Booking Detail Dialog ── */}
      <Dialog open={detailOpen} onOpenChange={(open) => { if (!open) closeDetail(); }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="size-5 text-primary" />
              Booking Details
              <span className={`ml-auto inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusStyle(selectedBooking?.bookingStatus || "")}`}>
                {selectedBooking?.bookingStatus || "—"}
              </span>
            </DialogTitle>
            <DialogDescription>
              Full booking information. Press the Cancel button below to proceed.
            </DialogDescription>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-4">
              {/* Info badges */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {selectedBooking.clientType === "provincial" ? "Provincial Agency" : "Private / Walk-in"}
                </Badge>
                {selectedBooking.isWithin30Days && selectedBooking.paymentStatus !== "No Payment" && (
                  <span className="inline-flex items-center rounded-full bg-orange-100 text-orange-800 px-2.5 py-0.5 text-xs font-medium">
                    <AlertTriangle className="size-3 mr-1" />
                    Within 30-day window
                  </span>
                )}
                {selectedBooking.daysUntilEvent !== null && selectedBooking.daysUntilEvent !== undefined && selectedBooking.daysUntilEvent >= 0 && (
                  <span className="inline-flex items-center rounded-full bg-purple-100 text-purple-800 px-2.5 py-0.5 text-xs font-medium">
                    <CalendarDays className="size-3 mr-1" />
                    {selectedBooking.daysUntilEvent} day(s) away
                  </span>
                )}
                {selectedBooking.daysUntilEvent !== null && selectedBooking.daysUntilEvent < 0 && (
                  <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-600 px-2.5 py-0.5 text-xs font-medium">
                    Event passed
                  </span>
                )}
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg border bg-muted/30 p-4 text-sm">
                <div>
                  <span className="text-muted-foreground block text-xs">Booking ID</span>
                  <span className="font-medium">#{selectedBooking.bookingId || selectedBooking.id}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Client Name</span>
                  <span className="font-medium">{selectedBooking.clientName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Activity / Event</span>
                  <span className="font-medium">{selectedBooking.activityName || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Package</span>
                  <span className="font-medium">{selectedBooking.packageName || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Venue</span>
                  <span className="font-medium">{selectedBooking.venue || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Time Slot</span>
                  <span className="font-medium flex items-center gap-1">
                    <Clock className="size-3 text-muted-foreground" />
                    {selectedBooking.timeSlot || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Event Date</span>
                  <span className="font-medium flex items-center gap-1">
                    <CalendarDays className="size-3 text-muted-foreground" />
                    {selectedBooking.eventDate || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Days Until Event</span>
                  <span className="font-medium">
                    {selectedBooking.daysUntilEvent !== null && selectedBooking.daysUntilEvent !== undefined
                      ? selectedBooking.daysUntilEvent < 0
                        ? "Event already passed"
                        : `${selectedBooking.daysUntilEvent} day(s)`
                      : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Payment Status</span>
                  <Badge
                    variant={getPaymentBadgeProps(selectedBooking.paymentStatus).variant}
                    className={`text-xs ${getPaymentBadgeProps(selectedBooking.paymentStatus).className}`}
                  >
                    <CreditCard className="size-3 mr-1" />
                    {selectedBooking.paymentStatus || "No Payment"}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Client Type</span>
                  <span className="font-medium">
                    {selectedBooking.clientType === "provincial" ? "Provincial Agency" : "Private / Walk-in"}
                  </span>
                </div>
              </div>
{/* Forfeiture warning */}
              {selectedBooking.forfeitureWarning && (
                <div className="flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <span>{selectedBooking.forfeitureWarning}</span>
                </div>
              )}

              {/* Status-specific info boxes */}
              {selectedBooking.bookingStatus === "Cancelled" && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  This booking has already been <strong>cancelled</strong>. No further action is available.
                </div>
              )}

              {selectedBooking.bookingStatus === "Pending" && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
                  This booking is currently <strong>Pending</strong>. It must be confirmed by the Program Coordinator before cancellation can be processed.
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="outline" onClick={closeDetail}>
              Close
            </Button>
            <div className="flex items-center gap-2">
              {selectedBooking?.bookingStatus === "Confirmed" && canCancel(selectedBooking) && (
                <Button
                  variant="destructive"
                  onClick={() => { setConfirmOpen(true); }}
                >
                  <XCircle className="size-4 mr-1.5" />
                  Cancel Booking
                </Button>
              )}
              {selectedBooking?.bookingStatus === "Confirmed" && !canCancel(selectedBooking) && (
                <span className="text-xs text-muted-foreground max-w-[200px] text-right leading-tight">
                  {selectedBooking?.paymentStatus === "Fully Paid"
                    ? "Fully paid bookings cannot be cancelled"
                    : selectedBooking?.clientType === "provincial"
                    ? "Provincial bookings cannot be cancelled"
                    : "Event too soon to cancel (needs ≥2 days)"}
                </span>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirmation Dialog ── */}
      <Dialog open={confirmOpen} onOpenChange={(open) => { if (!open) closeConfirm(); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-red-500" />
              Confirm Cancellation
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel the booking for <strong>{selectedBooking?.clientName}</strong>? This action <strong>cannot be undone</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Booking ID:</span>
              <span className="font-medium">#{selectedBooking?.bookingId || selectedBooking?.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Client:</span>
              <span className="font-medium">{selectedBooking?.clientName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Activity:</span>
              <span className="font-medium">{selectedBooking?.activityName || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Event Date:</span>
              <span className="font-medium">{selectedBooking?.eventDate || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Venue:</span>
              <span className="font-medium">{selectedBooking?.venue || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment Status:</span>
              <span className="font-medium">{selectedBooking?.paymentStatus || "No Payment"}</span>
            </div>
            {selectedBooking?.forfeitureWarning && (
              <div className="flex items-start gap-2 rounded border border-orange-200 bg-orange-50 p-2 text-xs text-orange-700">
                <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                <span>{selectedBooking.forfeitureWarning}</span>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeConfirm}>
              Go Back
            </Button>
            <Button variant="destructive" onClick={handleCancelBooking} disabled={saving}>
              {saving ? "Cancelling..." : "Confirm Cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}