"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CalendarRange, Send } from "lucide-react";
import { toast } from "sonner";

export default function ReschedulingPage() {
  const [requests, setRequests] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [reservationId, setReservationId] = React.useState("");
  const [requestedDate, setRequestedDate] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    fetchRequests();
  }, []);

  async function fetchRequests() {
    try {
      const userId = localStorage.getItem("user_id");
      if (!userId) return;
      const res = await fetch(`/api/reservations?clientId=${userId}`);
      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load reservations:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitRequest(e) {
    e.preventDefault();
    if (!reservationId || !requestedDate || !reason) {
      toast.error("Please fill in all fields");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/rescheduling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservationId: parseInt(reservationId),
          requestedDate,
          reason
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to submit request');
      }

      toast.success("Reschedule request submitted successfully");
      setReservationId("");
      setRequestedDate("");
      setReason("");
      fetchRequests();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Rescheduling</h1>
        <p className="text-muted-foreground text-sm">
          Submit a request to change your event date, time, or particulars
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Submit Reschedule Request</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmitRequest} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reservationId">Reservation ID</Label>
              <Input
                id="reservationId"
                type="number"
                value={reservationId}
                onChange={(e) => setReservationId(e.target.value)}
                placeholder="Enter your reservation ID"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="requestedDate">New Event Date</Label>
              <Input
                id="requestedDate"
                type="date"
                value={requestedDate}
                onChange={(e) => setRequestedDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Rescheduling</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why you need to reschedule"
                rows={3}
              />
            </div>
            <Button type="submit" disabled={submitting}>
              <Send className="mr-2 size-4" />
              {submitting ? "Submitting..." : "Submit Request"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-4">Your Reschedule Requests</h2>
        {loading ? (
          <div className="text-center text-muted-foreground py-8">Loading requests...</div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <CalendarRange className="size-8 text-muted-foreground" />
            <p className="text-muted-foreground">No reschedule requests yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <Card key={req.id}>
                <CardContent className="flex items-start justify-between p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">Reservation #{req.reservationId}</span>
                      <Badge
                        variant={req.status === "Approved" ? "outline" : req.status === "Declined" ? "secondary" : "outline"}
                        className={
                          req.status === "Approved"
                            ? "text-green-600 border-green-300"
                            : req.status === "Declined"
                              ? "text-red-600"
                              : "text-yellow-600 border-yellow-300 bg-yellow-50"
                        }
                      >
                        {req.status || "Pending"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Requested Date: {req.requestedDate ? new Date(req.requestedDate).toLocaleDateString() : "—"}
                    </p>
                    {req.reason && (
                      <p className="text-xs text-muted-foreground">Reason: {req.reason}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}