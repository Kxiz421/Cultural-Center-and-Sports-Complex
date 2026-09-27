"use client";

import * as React from "react";
import { BookingHistoryScreen } from "@/components/booking-history-screen";

/**
 * Client history: reservations and bookings stacked with the latest change on
 * top, each reservation linking to its Order of Payment.
 */
export default function ClientHistoryPage() {
  return (
    <BookingHistoryScreen
      title="Booking & Reservation History"
      description="Your reservations and bookings in one stack — the latest change is on top. Click any record to view its details and print its Order of Payment."
      orderOfPaymentHref={(item) =>
        item?.type === "reservation"
          ? `/panel/client/order-of-payment?id=${item.reservationId}`
          : null
      }
    />
  );
}
