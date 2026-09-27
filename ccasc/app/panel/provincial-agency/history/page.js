"use client";

import * as React from "react";
import { BookingHistoryScreen } from "@/components/booking-history-screen";

/**
 * Provincial agency (PDA) history: the same stacked Booking & Reservation
 * history as the client panel.
 */
export default function ProvincialAgencyHistoryPage() {
  return (
    <BookingHistoryScreen
      title="Booking & Reservation History"
      description="Your reservations and bookings in one stack — the latest change is on top. Click any record to view its details."
    />
  );
}
