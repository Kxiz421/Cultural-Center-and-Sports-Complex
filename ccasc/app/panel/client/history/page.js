"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { History, Calendar, CreditCard, Clock } from "lucide-react";

export default function ClientHistoryPage() {
  const [reservations, setReservations] = React.useState([]);
  const [bookings, setBookings] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState("all");

  React.useEffect(() => {
    let cancelled = false;
    async function fetchHistory() {
      const clientId = localStorage.getItem("user_id")?.replace("CLT-", "");
      if (!clientId) return;
      try {
        // Fetch both reservations and bookings
        const [resRes, bkRes] = await Promise.all([
          fetch(`/api/reservations?clientId=${clientId}`),
          fetch(`/api/bookings?clientId=${clientId}`),
        ]);
        const resData = await resRes.json();
        const bkData = await bkRes.json();
        if (!cancelled) {
          setReservations(Array.isArray(resData) ? resData : []);
          setBookings(Array.isArray(bkData) ? bkData : []);
        }
      } catch (err) {
        if (!cancelled) console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchHistory();
    return () => { cancelled = true; };
  }, []);

  // Combine and sort by date (most recent first)
  const allHistory = React.useMemo(() => {
    const items = [];

    // Add reservations
    reservations.forEach((r) => {
      items.push({
        id: `RES-${r.id}`,
        type: "reservation",
        eventType: r.eventType,
        venue: r.venue,
        eventDate: r.eventDate,
        timeSlot: r.timeSlot || "—",
        status: r.reservationStatus || r.status,
        amount: r.amountPaid || 0,
        packageName: r.packageName || null,
        submittedAt: r.submittedAt || r.eventDate,
      });
    });

    // Add bookings
    bookings.forEach((b) => {
      items.push({
        id: b.id,
        type: "booking",
        eventType: b.eventType,
        venue: b.venue,
        eventDate: b.eventDate,
        timeSlot: b.timeSlot || "—",
        status: b.status,
        amount: b.amountPaid || 0,
        packageName: b.packageName || null,
        submittedAt: b.confirmationDate || b.eventDate,
      });
    });

    // Sort by date descending
    items.sort((a, b) => new Date(b.eventDate) - new Date(a.eventDate));
    return items;
  }, [reservations, bookings]);

  const filteredHistory = React.useMemo(() => {
    if (activeTab === "all") return allHistory;
    return allHistory.filter((item) => item.type === activeTab);
  }, [allHistory, activeTab]);

  const getStatusBadge = (status) => {
    const s = (status || "").toLowerCase();
    let className = "";
    if (s === "confirmed" || s === "approved") className = "text-green-600 border-green-300";
    else if (s === "pending") className = "text-yellow-600 border-yellow-300";
    else if (s === "completed") className = "text-blue-600 border-blue-300";
    else if (s === "cancelled" || s === "declined") className = "text-red-600 border-red-300";
    else if (s === "ongoing") className = "text-purple-600 border-purple-300";
    return <Badge variant="outline" className={className}>{status || "N/A"}</Badge>;
  };

  const getTypeBadge = (type) => {
    if (type === "reservation") {
      return <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50">Reservation</Badge>;
    }
    return <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50">Booking</Badge>;
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Booking & Reservation History</h2>
          <p className="text-muted-foreground text-sm">Loading your history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Booking & Reservation History</h2>
        <p className="text-muted-foreground text-sm">
          View all your past and current reservations and bookings.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your History</CardTitle>
              <CardDescription>
                Complete record of all your reservations and bookings.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mb-4">
            <TabsList>
              <TabsTrigger value="all">All ({allHistory.length})</TabsTrigger>
              <TabsTrigger value="reservation">Reservations ({reservations.length})</TabsTrigger>
              <TabsTrigger value="booking">Bookings ({bookings.length})</TabsTrigger>
            </TabsList>
          </Tabs>

          {filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <History className="size-8 text-muted-foreground" />
              <p className="text-muted-foreground">No history found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredHistory.map((item) => (
                <div key={`${item.type}-${item.id}`} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">{item.eventType}</p>
                        {getTypeBadge(item.type)}
                        {getStatusBadge(item.status)}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3" />
                          {item.eventDate ? new Date(item.eventDate).toLocaleDateString() : "—"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          {item.timeSlot}
                        </span>
                        <span>Venue: {item.venue}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                        {item.packageName && <span>Package: {item.packageName}</span>}
                        {item.amount > 0 && (
                          <span className="flex items-center gap-1">
                            <CreditCard className="size-3" />
                            ₱{Number(item.amount).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}