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
} from "lucide-react";

export default function LTOOCancellationsPage() {
  const [bookings, setBookings] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [venueFilter, setVenueFilter] = React.useState("all");
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
    // For private/walk-in clients, can cancel if event is at least 2 days away and payment not completed
    if (booking.clientType === "provincial") return false;
    if (booking.paymentStatus === "Fully Paid") return false;
    
    const eventDate = new Date(booking.eventDate);
    const today = new Date();
    const diffDays = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
    return diffDays >= 2;
  };

  const filteredBookings = bookings.filter((b) => {
    if (venueFilter !== "all" && b.venueId !== parseInt(venueFilter) && b.venue !== venueFilter) return false;
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Booking Cancellation</h2>
        <p className="text-muted-foreground text-sm">
          View all confirmed bookings. Cancel private/walk-in bookings if payment is not completed at least 2 days before the event.
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Confirmed Bookings</CardTitle>
          <CardDescription>Overview of all bookings with client details, payment status, and cancellation options.</CardDescription>
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
            <div className="w-[200px]">
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
                  <TableCell colSpan={9} className="text-muted-foreground py-8 text-center">Loading...</TableCell>
                </TableRow>
              ) : filteredBookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-muted-foreground py-8 text-center">No confirmed bookings found.</TableCell>
                </TableRow>
              ) : (
                filteredBookings.map((b) => (
                  <TableRow key={b.bookingId || b.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {b.clientType === "provincial" ? <Building2 className="size-4 text-muted-foreground" /> : <User className="size-4 text-muted-foreground" />}
                        <span className="font-medium">{b.clientName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{b.clientType === "provincial" ? "Provincial" : b.clientType === "walk-in" ? "Walk-in" : "Client"}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{b.activityName || b.eventType || "—"}</TableCell>
                    <TableCell className="text-sm">{b.venue || "—"}</TableCell>
                    <TableCell className="text-sm">{b.eventDate || "—"}</TableCell>
                    <TableCell className="text-sm">{b.timeSlot || "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={b.paymentStatus === "Fully Paid" ? "outline" : b.paymentStatus === "Partially Paid" ? "secondary" : "secondary"}
                        className={
                          b.paymentStatus === "Fully Paid"
                            ? "text-green-600 border-green-300"
                            : b.paymentStatus === "Partially Paid"
                              ? "text-amber-600 border-amber-300"
                              : "text-red-600"
                        }
                      >
                        {b.paymentStatus || "No Payment"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={b.bookingStatus === "Booked" || b.bookingStatus === "Confirmed" ? "outline" : "secondary"}>
                        {b.bookingStatus || "Confirmed"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {canCancel(b) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedBooking(b);
                            setConfirmOpen(true);
                          }}
                          title="Cancel booking"
                          className="text-red-500 hover:text-red-700"
                        >
                          <XCircle className="size-4" />
                        </Button>
                      )}
                      {!canCancel(b) && (
                        <span className="text-xs text-muted-foreground">
                          {b.paymentStatus === "Fully Paid" ? "Paid" : b.clientType === "provincial" ? "Provincial" : "Locked"}
                        </span>
                      )}
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
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-red-500" />
              Cancel Booking
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel the booking for &ldquo;{selectedBooking?.clientName}&rdquo;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Client:</span>
              <span className="font-medium">{selectedBooking?.clientName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Activity:</span>
              <span className="font-medium">{selectedBooking?.activityName || selectedBooking?.eventType || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date:</span>
              <span className="font-medium">{selectedBooking?.eventDate || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Venue:</span>
              <span className="font-medium">{selectedBooking?.venue || "—"}</span>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setConfirmOpen(false); setSelectedBooking(null); }}>Cancel</Button>
            <Button variant="destructive" onClick={handleCancelBooking} disabled={saving}>
              {saving ? "Cancelling..." : "Confirm Cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}