"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History } from "lucide-react";

export default function BookingHistoryPage() {
  const [bookings, setBookings] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  const fetchBookings = React.useCallback(async () => {
    try {
      const userId = localStorage.getItem("user_id");
      if (!userId) return;
      const res = await fetch(`/api/bookings?clientId=${userId}`);
      const data = await res.json();
      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load bookings:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Booking History</h1>
        <p className="text-muted-foreground text-sm">
          View your past and current booking records
        </p>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-8">Loading bookings...</div>
      ) : bookings.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <History className="size-8 text-muted-foreground" />
          <p className="text-muted-foreground">No booking records found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <Card key={booking.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {booking.eventType || "Event"}
                      </span>
                      <Badge
                        variant={booking.status === "Confirmed" ? "outline" : "secondary"}
                        className={
                          booking.status === "Confirmed"
                            ? "text-green-600 border-green-300"
                            : booking.status === "Pending"
                              ? "text-yellow-600 border-yellow-300 bg-yellow-50"
                              : "text-gray-600"
                        }
                      >
                        {booking.status || "Pending"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Date: {booking.eventDate ? new Date(booking.eventDate).toLocaleDateString() : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Venue: {booking.venue || "—"}
                    </p>
                    {booking.amount && (
                      <p className="text-xs text-muted-foreground">
                        Amount: ₱{booking.amount}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    {booking.createdAt && (
                      <div>Booked: {new Date(booking.createdAt).toLocaleDateString()}</div>
                    )}
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