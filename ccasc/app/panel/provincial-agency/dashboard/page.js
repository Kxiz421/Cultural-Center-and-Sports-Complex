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
import ReservationsTracker from "@/components/reservations-tracker";

export default function ProvincialAgencyDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/dashboard/provincial-agency?clientId=1");
        const json = await res.json();
        setData(json);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Welcome, Provincial Agency
          </h2>
          <p className="text-muted-foreground text-sm">
            Loading live data from database...
          </p>
        </div>
      </div>
    );
  }

  const stats = data?.stats || {
    totalReservations: 0,
    pendingReservations: 0,
    confirmedReservations: 0,
    totalDocuments: 0,
    unreadNotifications: 0,
  };
  const upcomingEvents = data?.upcomingEvents || [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Welcome, Provincial Agency
        </h2>
        <p className="text-muted-foreground text-sm">
          Reservations, documents and notifications overview.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Reservations</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {stats.totalReservations}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-xs">
            {stats.confirmedReservations} confirmed · {stats.pendingReservations} pending
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Confirmed</CardDescription>
            <CardTitle className="text-3xl text-green-600 tabular-nums">
              {stats.confirmedReservations}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-xs">
            Approved and scheduled events.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Notifications</CardDescription>
            <CardTitle className="text-3xl text-blue-600 tabular-nums">
              {stats.unreadNotifications}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-xs">
            Unread notifications.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Documents</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {stats.totalDocuments}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-xs">
            Uploaded documents.
          </CardContent>
        </Card>
      </div>

      {upcomingEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{event.eventType}</p>
                    <p className="text-muted-foreground text-sm">
                      {event.venue} · {event.eventDate} · {event.timeSlot}
                    </p>
                  </div>
                  <Badge variant={event.status === "Confirmed" ? "default" : "secondary"}>
                    {event.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <ReservationsTracker
        showNewReservation={false}
        title="My Reservations"
        description="Track your reservations and what to do next. Select one to see its status."
        documentsHref="/panel/provincial-agency/documents"
      />
    </div>
  );
}
