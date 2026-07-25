"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Search, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

function formatPhp(amount) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount);
}

export default function CoordinatorBookingsPage() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRes, setSelectedRes] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/coordinator/bookings");
        const data = await res.json();
        if (!cancelled) setReservations(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load bookings:", err);
          toast.error("Failed to load bookings");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  async function refreshBookings() {
    try {
      const res = await fetch("/api/coordinator/bookings");
      const data = await res.json();
      setReservations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load bookings:", err);
      toast.error("Failed to load bookings");
    }
  }

  async function handleConfirm(reservationId) {
    try {
      const res = await fetch("/api/coordinator/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId, action: "confirm" }),
      });
      if (!res.ok) throw new Error("Failed to confirm");
      toast.success("Booking confirmed successfully");
      refreshBookings();
      setDetailOpen(false);
    } catch (err) {
      toast.error("Failed to confirm booking");
    }
  }

  async function handleCancel(reservationId) {
    try {
      const res = await fetch("/api/coordinator/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId, action: "cancel" }),
      });
      if (!res.ok) throw new Error("Failed to cancel");
      toast.success("Booking cancelled");
      refreshBookings();
      setDetailOpen(false);
    } catch (err) {
      toast.error("Failed to cancel booking");
    }
  }

  const filtered = reservations.filter((r) => {
    const hay = [r.clientName, r.eventType, r.venue, r.id]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(searchQuery.toLowerCase());
  });

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Booking Confirmation</h2>
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Booking Confirmation</h2>
        <p className="text-muted-foreground text-sm">
          Manage bookings that have reached full payment status.
        </p>
      </div>

      {/* Search */}
      <div className="space-y-2">
        <Label>Search</Label>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by client, event, or reservation ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Bookings List */}
      <Card>
        <CardHeader>
          <CardTitle>Fully Paid Bookings</CardTitle>
          <CardDescription>
            {filtered.length} booking(s) awaiting confirmation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">
                No fully paid bookings awaiting confirmation.
              </p>
            ) : (
              filtered.map((res) => (
                <div
                  key={res.id}
                  className="flex flex-col gap-2 rounded-lg border p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => {
                    setSelectedRes(res);
                    setDetailOpen(true);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{res.clientName}</span>
                      <Badge variant="outline" className="text-xs">
                        {res.clientType}
                      </Badge>
                    </div>
                    <Badge variant="default">Fully Paid</Badge>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {res.venue} &middot; {res.eventDate} &middot; {res.eventType}
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="text-muted-foreground text-xs">
                      {res.timeSlot}
                    </p>
                    <p className="text-xs font-medium tabular-nums">
                      {formatPhp(res.amountPaid)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      {detailOpen && selectedRes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Booking Details</h3>
                <button
                  onClick={() => setDetailOpen(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <XCircle className="size-5" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-muted-foreground text-xs">Reservation ID</span>
                  <p className="font-medium">{selectedRes.id}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Client</span>
                  <p className="font-medium">{selectedRes.clientName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Venue</span>
                  <p className="font-medium">{selectedRes.venue}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Event Type</span>
                  <p className="font-medium">{selectedRes.eventType}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Event Date</span>
                  <p className="font-medium">{selectedRes.eventDate}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Time Slot</span>
                  <p className="font-medium">{selectedRes.timeSlot}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Amount Paid</span>
                  <p className="font-medium tabular-nums">{formatPhp(selectedRes.amountPaid)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Package</span>
                  <p className="font-medium">{selectedRes.packageName || "N/A"}</p>
                </div>
              </div>
              <div className="flex flex-col gap-2 pt-2 border-t">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <AlertTriangle className="size-3" />
                  Confirm only if physical copies of certification and contract of lease are verified.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
                    onClick={() => handleCancel(selectedRes.id.replace("RES-", ""))}
                  >
                    Cancel Booking
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => handleConfirm(selectedRes.id.replace("RES-", ""))}
                  >
                    <CheckCircle2 className="mr-2 size-4" />
                    Confirm Booking
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}