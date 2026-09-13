"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { AlertTriangle, XCircle } from "lucide-react";
import {
  getMinEventDateKey,
  MIN_ADVANCE_BOOKING_DAYS,
} from "@/lib/reservation-advance-booking";
import { RescheduleEventDatesPanel } from "@/components/reschedule-event-dates-panel";

export default function ClientReschedulingPage() {
  const [reservations, setReservations] = React.useState([]);
  const [selectedReservation, setSelectedReservation] = React.useState("");
  const [dateDrafts, setDateDrafts] = React.useState({});
  const [reason, setReason] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [requests, setRequests] = React.useState([]);
  const minDate = getMinEventDateKey();

  // ── Cancellation state ──
  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState("");
  const [cancelling, setCancelling] = React.useState(false);

  const selected = React.useMemo(
    () => reservations.find((r) => r.id === selectedReservation) || null,
    [reservations, selectedReservation]
  );

  /** Check if the selected reservation is eligible for cancellation (≥30 days away, not already cancelled). */
  const canCancelSelected = React.useMemo(() => {
    if (!selected || !selected.eventDate) return false;
    if (selected.status === "Cancelled") return false;
    const eventDate = new Date(selected.eventDate + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysUntil = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
    return daysUntil >= 30;
  }, [selected]);

  /** Check if the selected reservation is eligible for rescheduling (≥7 days away, not already cancelled). */
  const canRescheduleSelected = React.useMemo(() => {
    if (!selected || !selected.eventDate) return false;
    if (selected.status === "Cancelled") return false;
    const eventDate = new Date(selected.eventDate + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysUntil = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
    return daysUntil >= 7;
  }, [selected]);

  /** Reservations eligible for rescheduling (event date ≥7 days away, not cancelled). */
  const rescheduleEligible = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return reservations.filter((r) => {
      if (r.status === "Cancelled") return false;
      if (!r.eventDate) return false;
      const ed = new Date(r.eventDate + "T00:00:00");
      const daysUntil = Math.ceil((ed - today) / (1000 * 60 * 60 * 24));
      return daysUntil >= 7;
    });
  }, [reservations]);

  const eventEntries = React.useMemo(() => {
    if (!selected) return [];
    if (Array.isArray(selected.eventDateEntries) && selected.eventDateEntries.length > 0) {
      return selected.eventDateEntries;
    }
    const dates = selected.eventDates?.length
      ? selected.eventDates
      : selected.eventDate
        ? [selected.eventDate]
        : [];
    return dates.map((date, idx) => ({
      date,
      reservationDateId: idx === 0 ? null : undefined,
      isPrimary: idx === 0,
    }));
  }, [selected]);

  React.useEffect(() => {
    async function load() {
      const clientId = localStorage.getItem("user_id")?.replace("CLT-", "");
      if (!clientId) {
        setLoading(false);
        return;
      }
      try {
        const [resRes, reqRes] = await Promise.all([
          fetch(`/api/reservations?clientId=${clientId}`),
          fetch(`/api/rescheduling?clientId=${clientId}`),
        ]);
        const resData = await resRes.json();
        const reqData = await reqRes.json();
        setReservations(Array.isArray(resData) ? resData : []);
        setRequests(Array.isArray(reqData) ? reqData : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  React.useEffect(() => {
    if (!selected) {
      setDateDrafts({});
      return;
    }
    const next = {};
    for (const entry of eventEntries) {
      const key = entry.isPrimary
        ? "primary"
        : `rd-${entry.reservationDateId ?? entry.date}`;
      next[key] = entry.date;
    }
    setDateDrafts(next);
  }, [selectedReservation, eventEntries]);

  function entryKey(entry) {
    return entry.isPrimary
      ? "primary"
      : `rd-${entry.reservationDateId ?? entry.date}`;
  }

  const handleDateDraftChange = (key, dateStr) => {
    setDateDrafts((prev) => ({ ...prev, [key]: dateStr }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selected || !reason.trim()) {
      toast.error("Please select a reservation and provide a reason");
      return;
    }

    const dateChanges = [];
    for (const entry of eventEntries) {
      const key = entryKey(entry);
      const requestedDate = dateDrafts[key];
      if (!requestedDate || requestedDate === entry.date) continue;
      dateChanges.push({
        originalDate: entry.date,
        requestedDate,
        reservationDateId: entry.isPrimary ? null : entry.reservationDateId ?? null,
        isPrimary: Boolean(entry.isPrimary),
      });
    }

    if (dateChanges.length === 0) {
      toast.error("Change at least one event date before submitting");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/rescheduling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reservationId: parseInt(String(selected.id).replace("RES-", ""), 10),
          reason: reason.trim(),
          dateChanges,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        const msg = errData.error || "Failed to submit rescheduling request";
        if (errData.conflictDates?.length) {
          const next = { ...dateDrafts };
          for (const entry of eventEntries) {
            const key = entryKey(entry);
            if (errData.conflictDates.includes(dateDrafts[key])) {
              next[key] = entry.date;
            }
          }
          setDateDrafts(next);
        }
        throw new Error(msg);
      }

      toast.success("Rescheduling request submitted successfully!");
      setSelectedReservation("");
      setReason("");
      setDateDrafts({});

      const clientId = localStorage.getItem("user_id")?.replace("CLT-", "");
      if (clientId) {
        const reqRes = await fetch(`/api/rescheduling?clientId=${clientId}`);
        const reqData = await reqRes.json();
        setRequests(Array.isArray(reqData) ? reqData : []);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Cancel booking handler ──
  const handleCancelBooking = async () => {
    if (!selected || !canCancelSelected) return;
    setCancelling(true);
    try {
      const userId = localStorage.getItem("user_id") || "";
      const reservationNum = parseInt(String(selected.id).replace("RES-", ""), 10);

      const res = await fetch("/api/cancellations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reservationId: reservationNum,
          reason: cancelReason.trim() || undefined,
          performedBy: userId,
          performedByName: localStorage.getItem("user_name") || "",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to cancel booking");
      }

      toast.success(data.message || "Booking cancelled successfully");
      setCancelDialogOpen(false);
      setCancelReason("");
      setSelectedReservation("");
      setDateDrafts({});

      // Reload data
      const clientId = localStorage.getItem("user_id")?.replace("CLT-", "");
      if (clientId) {
        const [resRes, reqRes] = await Promise.all([
          fetch(`/api/reservations?clientId=${clientId}`),
          fetch(`/api/rescheduling?clientId=${clientId}`),
        ]);
        const resData = await resRes.json();
        const reqData = await reqRes.json();
        setReservations(Array.isArray(resData) ? resData : []);
        setRequests(Array.isArray(reqData) ? reqData : []);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCancelling(false);
    }
  };

  const todayKey = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Rescheduling Request</h2>
        <p className="text-muted-foreground text-sm">
          Request to reschedule one or more event dates. Use the calendar to pick available
          dates only — at least {MIN_ADVANCE_BOOKING_DAYS} days from today (earliest: {minDate}).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submit Rescheduling Request</CardTitle>
          <CardDescription>
            Select a reservation, then choose new dates from the availability calendar for each
            scheduled event day.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading reservations...</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reservation">Select Reservation</Label>
                <select
                  id="reservation"
                  value={selectedReservation}
                  onChange={(e) => setSelectedReservation(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select a reservation</option>
                  {rescheduleEligible.length === 0 && (
                    <option disabled>No eligible events (must be at least 7 days away)</option>
                  )}
                  {rescheduleEligible
                    .filter((r) => r.eventDate >= todayKey)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.eventType} — {r.venue} ({(r.eventDates || [r.eventDate]).join(", ")})
                      </option>
                    ))}
                </select>
              </div>

              {selected && (
                <RescheduleEventDatesPanel
                  reservation={selected}
                  eventEntries={eventEntries}
                  dateDrafts={dateDrafts}
                  onDateDraftChange={handleDateDraftChange}
                  entryKey={entryKey}
                />
              )}

              <div className="space-y-2">
                <Label htmlFor="reason">
                  Reason for Rescheduling <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="reason"
                  placeholder="Explain why you need to reschedule..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={submitting || !selected || !reason.trim()}
              >
                {submitting ? "Submitting..." : "Submit Request"}
              </Button>

              {selected && (
                <div className="border-t pt-4 mt-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className={`text-sm font-medium flex items-center gap-2 ${canCancelSelected ? "text-destructive" : "text-muted-foreground"}`}>
                        <XCircle className="size-4" />
                        Cancel this booking
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {canCancelSelected
                          ? "Only available for events at least 30 days away. This action cannot be undone."
                          : "Cancellation requires the event to be at least 30 days away."}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!canCancelSelected}
                      className={`${canCancelSelected ? "text-destructive border-destructive/40 hover:bg-destructive/10" : ""}`}
                      onClick={() => setCancelDialogOpen(true)}
                    >
                      <XCircle className="mr-2 size-4" />
                      Cancel Booking
                    </Button>
                  </div>
                </div>
              )}
            </form>
          )}
        </CardContent>
      </Card>

      {/* ── Cancel Booking Confirmation Dialog ── */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-red-500" />
              Confirm Cancellation
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel the booking for{" "}
              <strong>{selected?.eventType || "this event"}</strong>? This action{" "}
              <strong>cannot be undone</strong>. Any payments made will be eligible for refund
              since the cancellation is at least 30 days before the event.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Event:</span>
              <span className="font-medium">{selected?.eventType || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Venue:</span>
              <span className="font-medium">{selected?.venue || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Event Date:</span>
              <span className="font-medium">
                {selected?.eventDate
                  ? new Date(selected.eventDate + "T00:00:00").toLocaleDateString("en-PH", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                  : "—"}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cancel-reason">
              Reason for Cancellation <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Textarea
              id="cancel-reason"
              placeholder="Tell us why you're cancelling..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setCancelDialogOpen(false);
                setCancelReason("");
              }}
            >
              Go Back
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelBooking}
              disabled={cancelling}
            >
              {cancelling ? "Cancelling..." : "Confirm Cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Your Requests</CardTitle>
          <CardDescription>Recent reschedule requests for your reservations.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No reschedule requests yet.
            </p>
          ) : (
            requests.map((req) => (
              <div key={req.id} className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">
                    {req.eventType || `Reservation #${req.reservationId}`}
                  </p>
                  <Badge variant="outline">{req.status}</Badge>
                </div>
                <div className="space-y-1">
                  {(req.dateChanges || []).map((c, idx) => (
                    <p key={idx} className="text-xs text-muted-foreground">
                      {c.originalDate} → {c.requestedDate}
                      {c.isPrimary ? " (primary)" : ""}
                    </p>
                  ))}
                </div>
                {req.reason && (
                  <p className="text-xs text-muted-foreground">Reason: {req.reason}</p>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
