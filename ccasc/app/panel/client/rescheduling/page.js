"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
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

  const selected = React.useMemo(
    () => reservations.find((r) => r.id === selectedReservation) || null,
    [reservations, selectedReservation]
  );

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
                  {reservations
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
            </form>
          )}
        </CardContent>
      </Card>

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
