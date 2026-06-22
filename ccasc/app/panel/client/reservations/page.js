"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, Building2, Package } from "lucide-react";
import { toast } from "sonner";

export default function ClientReservationsPage() {
  const [form, setForm] = React.useState({
    venueId: "",
    eventType: "",
    eventDate: "",
    timeSlotId: "",
    packageId: "",
    notes: "",
  });

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const clientId = localStorage.getItem("user_id")?.replace("CLT-", "");
    if (!clientId) {
      toast.error("Please log in first");
      return;
    }

    if (!form.venueId || !form.eventType || !form.eventDate || !form.timeSlotId) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          clientId: parseInt(clientId, 10),
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to create reservation");
      }

      toast.success("Reservation submitted successfully! Awaiting confirmation.");
      setForm({
        venueId: "",
        eventType: "",
        eventDate: "",
        timeSlotId: "",
        packageId: "",
        notes: "",
      });
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">New Reservation</h2>
        <p className="text-muted-foreground text-sm">
          Fill in the details below to create a new reservation request.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reservation Details</CardTitle>
          <CardDescription>
            Select your preferred venue, date, and services.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="venue">Venue <span className="text-red-500">*</span></Label>
                <Select value={form.venueId} onValueChange={(v) => handleChange("venueId", v)}>
                  <SelectTrigger id="venue">
                    <SelectValue placeholder="Select venue" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Cultural Center</SelectItem>
                    <SelectItem value="2">Sports Complex</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="event-type">Event Type <span className="text-red-500">*</span></Label>
                <Input
                  id="event-type"
                  placeholder="e.g. Seminar, Conference, Sports Event"
                  value={form.eventType}
                  onChange={(e) => handleChange("eventType", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="event-date">Event Date <span className="text-red-500">*</span></Label>
                <Input
                  id="event-date"
                  type="date"
                  value={form.eventDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => handleChange("eventDate", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeslot">Time Slot <span className="text-red-500">*</span></Label>
                <Select value={form.timeSlotId} onValueChange={(v) => handleChange("timeSlotId", v)}>
                  <SelectTrigger id="timeslot">
                    <SelectValue placeholder="Select time slot" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Day (8:00 AM - 5:00 PM)</SelectItem>
                    <SelectItem value="2">Night (5:00 PM - 10:00 PM)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="package">Package (Optional)</Label>
                <Select value={form.packageId} onValueChange={(v) => handleChange("packageId", v)}>
                  <SelectTrigger id="package">
                    <SelectValue placeholder="Select package" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">None</SelectItem>
                    <SelectItem value="1">Basic Package</SelectItem>
                    <SelectItem value="2">Premium Package</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any special requests or requirements..."
                value={form.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                rows={3}
              />
            </div>

            <Button type="submit" className="w-full md:w-auto">
              Submit Reservation
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}