"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function OrderOfPaymentPage() {
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
        const reservations = await res.json();
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
    return () => { cancelled = true; };
  }, [reservationId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Loading Order of Payment...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-muted-foreground">Reservation not found.</p>
        <Link href="/panel/client/reservations">
          <Button variant="outline">Back to Reservations</Button>
        </Link>
      </div>
    );
  }

  const totalAmount = data.totalAmount || 0;
  const dateList = data.eventDates || [data.eventDate];
  const formattedDates = dateList
    .sort()
    .map((d) => new Date(d + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Print Controls - hidden when printing */}
      <div className="flex items-center justify-between no-print">
        <Link href="/panel/client/reservations">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="size-4 mr-2" />
            Back
          </Button>
        </Link>
        <Button onClick={handlePrint} size="sm">
          <Printer className="size-4 mr-2" />
          Print
        </Button>
      </div>

      {/* Order of Payment Document */}
      <Card className="print:shadow-none print:border-0">
        <CardContent className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold tracking-tight">Republic of the Philippines</h1>
            <h2 className="text-xl font-semibold mt-1">Provincial Government of South Cotabato</h2>
            <h3 className="text-lg font-medium mt-1">Cultural Center and Sports Complex</h3>
            <p className="text-sm text-muted-foreground">Koronadal City, South Cotabato</p>
            <Separator className="my-4" />
            <h4 className="text-lg font-bold uppercase tracking-wide">Order of Payment</h4>
            <p className="text-sm text-muted-foreground">Reference No: {data.id}</p>
          </div>

          {/* Client Info */}
          <div className="mb-6">
            <h5 className="font-semibold mb-2">Client Information</h5>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Name:</span>
                <span className="ml-2 font-medium">{data.clientName}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Venue:</span>
                <span className="ml-2 font-medium">{data.venue}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Event Type:</span>
                <span className="ml-2 font-medium">{data.eventType}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Time Slot:</span>
                <span className="ml-2 font-medium">{data.timeSlot}</span>
              </div>
            </div>
          </div>

          {/* Event Dates */}
          <div className="mb-6">
            <h5 className="font-semibold mb-2">Event Dates</h5>
            <ul className="list-disc list-inside text-sm space-y-1">
              {formattedDates.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
            <p className="text-sm text-muted-foreground mt-1">
              Total of {dateList.length} day(s)
            </p>
          </div>

          {/* Charges Breakdown */}
          <div className="mb-6">
            <h5 className="font-semibold mb-2">Charges Breakdown</h5>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium">Description</th>
                  <th className="text-right py-2 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.particulars && data.particulars.length > 0 ? (
                  data.particulars.map((p, i) => (
                    <tr key={i} className="border-b">
                      <td className="py-2">{p.name} × {p.quantity}</td>
                      <td className="text-right py-2 tabular-nums">
                        ₱{(p.unitCost * p.quantity).toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr className="border-b">
                    <td className="py-2">Venue / Package Rate</td>
                    <td className="text-right py-2 tabular-nums">
                      ₱{totalAmount.toLocaleString()}
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="font-bold text-base">
                  <td className="py-3">Total Amount Due</td>
                  <td className="text-right py-3 tabular-nums">
                    ₱{totalAmount.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Payment Instructions */}
          <div className="text-sm text-muted-foreground space-y-1">
            <p><strong>Payment Instructions:</strong></p>
            <p>Please present this Order of Payment to the Accounting Office to process your payment.</p>
            <p>Payment must be made at least 3 days before the first event date.</p>
            <p className="mt-4 text-xs">
              This is a system-generated document. No signature required.
            </p>
            <p className="text-xs">
              Generated on: {new Date().toLocaleString()}
            </p>
          </div>
        </CardContent>
      </Card>

      <style jsx global>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          @page { margin: 1.5cm; }
        }
      `}</style>
    </div>
  );
}