"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History } from "lucide-react";

export default function ClientHistoryPage() {
  const [bookings, setBookings] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchHistory() {
      const clientId = localStorage.getItem("user_id")?.replace("CLT-", "");
      if (!clientId) return;
      try {
        const res = await fetch(`/api/bookings?clientId=${clientId}`);
        const data = await res.json();
        setBookings(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, []);

  const getStatusBadge = (status) => {
    const className =
      status === "Confirmed"
        ? "text-green-600 border-green-300"
        : status === "Pending"
          ? "text-yellow-600 border-yellow-300"
          : status === "Completed"
            ? "text-blue-600 border-blue-300"
            : status === "Cancelled"
              ? "text-red-600 border-red-300"
              : "";
    return <Badge variant="outline" className={className}>{status}</Badge>;
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Booking History</h2>
        <p className="text-muted-foreground text-sm">
          View all your past and current reservations and bookings.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Bookings</CardTitle>
          <CardDescription>
            Complete record of all your reservations across both venues.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center text-muted-foreground py-8">Loading booking history...</div>
          ) : bookings.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">No bookings found.</div>
          ) : (
            <div className="space-y-3">
              {bookings.map((booking) => (
                <div key={booking.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{booking.eventType}</p>
                        {getStatusBadge(booking.status)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Venue: {booking.venue}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Date: {booking.eventDate ? new Date(booking.eventDate).toLocaleDateString() : "—"}
                      </p>
                      {booking.amountPaid && (
                        <p className="text-xs text-muted-foreground">
                          Amount Paid: ₱{parseFloat(booking.amountPaid).toLocaleString()}
                        </p>
                      )}
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