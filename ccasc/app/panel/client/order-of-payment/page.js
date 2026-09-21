"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft } from "lucide-react";
import { buildPaymentLines } from "@/lib/reservation-payment-lines";
import OrderOfPaymentDocument from "@/components/order-of-payment-document";

/** Long-form date used on the form's "ACTIVITY DATE" line. */
function formatActivityDate(dateStr) {
  if (!dateStr) return "";
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function OrderOfPaymentContent() {
  const searchParams = useSearchParams();
  const reservationId = searchParams.get("id");
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(!!reservationId);

  React.useEffect(() => {
    if (!reservationId) return;
    let cancelled = false;
    async function fetchReservation() {
      try {
        const clientId = localStorage.getItem("user_id")?.replace("CLT-", "");
        const res = await fetch(`/api/reservations?clientId=${clientId}`);
        const payload = await res.json();
        // The API normally returns an array, but error responses return an
        // object (e.g. { error }) — never call .find on those.
        const reservations = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.reservations)
            ? payload.reservations
            : [];
        const found = reservations.find((r) => r.id === reservationId);
        if (!cancelled) {
          if (found) setData(found);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to load reservation:", err);
        if (!cancelled) setLoading(false);
      }
    }
    fetchReservation();
    return () => {
      cancelled = true;
    };
  }, [reservationId]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">Loading Order of Payment...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Reservation not found.</p>
        <Link href="/panel/client/reservations">
          <Button variant="outline">Back to Reservations</Button>
        </Link>
      </div>
    );
  }

  const dateList = [...(data.eventDates || [data.eventDate])].sort();
  const paymentLines = buildPaymentLines(data, dateList);
  const totalAmount = Number(data.totalAmount) || 0;

  return (
    <div className="mx-auto w-full max-w-[210mm] print:max-w-none">
      <div className="no-print mb-4 flex items-center justify-between">
        <Link href="/panel/client/reservations">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 size-4" />
            Back
          </Button>
        </Link>
        <Button onClick={() => window.print()} size="sm">
          <Printer className="mr-2 size-4" />
          Print
        </Button>
      </div>

      <OrderOfPaymentDocument
        controlNumber={data.id}
        date={new Date().toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
        clientName={data.clientName}
        address=""
        contactNumber=""
        activityName={data.eventType}
        activityDate={dateList.map(formatActivityDate).join(", ")}
        participants=""
        chargeLines={paymentLines}
        totalAmount={totalAmount}
        eventDates={dateList}
      />
    </div>
  );
}

export default function OrderOfPaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <OrderOfPaymentContent />
    </Suspense>
  );
}
