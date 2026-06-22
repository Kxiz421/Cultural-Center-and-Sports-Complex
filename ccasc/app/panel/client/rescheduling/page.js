"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function ClientReschedulingPage() {
  const [reservations, setReservations] = React.useState([]);
  const [selectedReservation, setSelectedReservation] = React.useState("");
  const [requestedDate, setRequestedDate] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadReservations() {
      const clientId = localStorage.getItem("user_id")?.replace("CLT-", "");
      if (!clientId) return;
      try {
        const res = await fetch(`/api/reservations?clientId=${clientId}`);
        const data = await res.json();
        setReservations(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadReservations();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReservation || !requestedDate || !reason) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const res = await fetch('/api/rescheduling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservationId: parseInt(selectedReservation),
          requestedDate,
          reason,
        }),
      });

      if (!res.ok) throw new Error("Failed to submit rescheduling request");
      toast.success("Rescheduling request submitted successfully!");
      setSelectedReservation("");
      setRequestedDate("");
      setReason("");
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Rescheduling Request</h2>
        <p className="text-muted-foreground text-sm">
          Request to reschedule an existing reservation. Must be at least 7 days before your event.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submit Rescheduling Request</CardTitle>
          <CardDescription>
            Select the reservation you wish to reschedule and provide a new date.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reservation">Select Reservation</Label>
              <select
                id="reservation"
                value={selectedReservation}
                onChange={(e) => setSelectedReservation(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select a reservation</option>
                {reservations
                  .filter(r => r.eventDate >= new Date().toISOString().split("T")[0])
                  .map(r => (
                    <option key={r.id} value={r.id}>
                      {r.eventType} - {r.venue} ({r.eventDate})
                    </option>
                  ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-date">New Requested Date</Label>
              <Input
                id="new-date"
                type="date"
                value={requestedDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setRequestedDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Rescheduling</Label>
              <Textarea
                id="reason"
                placeholder="Explain why you need to reschedule..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>

            <Button type="submit">Submit Request</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}