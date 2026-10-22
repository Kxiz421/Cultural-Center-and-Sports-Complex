"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import ReservationsTracker from "@/components/reservations-tracker";

function ClientReservationsContent() {
  const searchParams = useSearchParams();
  const selectedId = searchParams?.get("id") || null;

  return (
    <ReservationsTracker
      title="My Reservations"
      initialSelectedId={selectedId}
      orderOfPaymentHref={(r) => `/panel/client/order-of-payment?id=${r.id}`}
      documentsHref="/panel/client/documents"
    />
  );
}

export default function ClientReservationsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="text-muted-foreground size-5 animate-spin" />
        </div>
      }
    >
      <ClientReservationsContent />
    </Suspense>
  );
}
