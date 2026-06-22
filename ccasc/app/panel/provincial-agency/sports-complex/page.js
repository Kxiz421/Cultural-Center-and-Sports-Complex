"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SportsComplexCalendarPage() {
  const [events, setEvents] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchSportsEvents() {
      try {
        const res = await fetch('/api/calendar?venue=sports');
        const data = await res.json();
        setEvents(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load sports events:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSportsEvents();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sports Complex Calendar</h1>
        <p className="text-muted-foreground text-sm">
          View schedules for Sports Complex facilities
        </p>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-8">Loading events...</div>
      ) : events.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">No upcoming events</div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <Card key={event.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{event.eventType}</CardTitle>
                  <Badge
                    variant={event.eventStatus === "Upcoming" ? "outline" : "secondary"}
                    className={
                      event.eventStatus === "Upcoming"
                        ? "text-blue-600 border-blue-300"
                        : event.eventStatus === "Ongoing"
                          ? "text-green-600 border-green-300"
                          : "text-gray-600"
                    }
                  >
                    {event.eventStatus || "Upcoming"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date:</span>
                    <span className="font-medium">
                      {event.eventDate ? new Date(event.eventDate).toLocaleDateString() : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time:</span>
                    <span className="font-medium">{event.timeSlot || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span className="font-medium">{event.reservationStatus}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}