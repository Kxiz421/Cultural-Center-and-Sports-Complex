"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Bell, FileText, History } from "lucide-react";

export default function ProvincialAgencyDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // In production, pass the actual clientId from auth context
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
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome, Provincial Agency
          </h1>
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome, Provincial Agency
        </h1>
        <p className="text-muted-foreground text-sm">
          Live data from database — Provincial Department Agency Portal
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reservations</CardTitle>
            <Calendar className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.totalReservations}</p>
            <p className="text-xs text-muted-foreground">
              {stats.confirmedReservations} confirmed · {stats.pendingReservations} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
            <Calendar className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{stats.confirmedReservations}</p>
            <p className="text-xs text-muted-foreground">
              Approved and scheduled events
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notifications</CardTitle>
            <Bell className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{stats.unreadNotifications}</p>
            <p className="text-xs text-muted-foreground">
              Unread notifications
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <FileText className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.totalDocuments}</p>
            <p className="text-xs text-muted-foreground">
              Uploaded documents
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Events */}
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
    </div>
  );
}