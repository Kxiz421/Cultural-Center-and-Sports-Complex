"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { formatReservedParticularCharge } from "@/lib/particular-options";

function formatChargeDate(dateStr) {
  if (!dateStr) return null;
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function buildPaymentLines(data, dateList) {
  if (data.chargeLines?.length > 0) {
    return data.chargeLines.map((line) => ({
      date: line.date || null,
      label: line.label,
      amount: Number(line.amount) || 0,
    }));
  }

  if (data.particulars?.length > 0) {
    return data.particulars.map((p) => {
      const { label, amount } = formatReservedParticularCharge(
        {
          name: p.name,
          quantity: p.quantity,
          unitCost: p.unitCost,
        },
        {
          eventDayCount: dateList.length,
          allParticulars: data.particulars,
        }
      );
      return { date: null, label, amount };
    });
  }

  return [
    {
      date: null,
      label: "Venue / Package Rate",
      amount: Number(data.totalAmount) || 0,
    },
  ];
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
    return () => {
      cancelled = true;
    };
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

  const dateList = data.eventDates || [data.eventDate];
  const formattedDates = dateList
    .sort()
    .map((d) =>
      new Date(d + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    );

  const paymentLines = buildPaymentLines(data, dateList);
  const totalAmount = Number(data.totalAmount) || 0;
  const hasPerDateLines = paymentLines.some((line) => line.date);

  return (
    <div className="mx-auto w-full max-w-[210mm] print:max-w-none">
      <div className="mb-4 flex items-center justify-between no-print">
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

      <article
        className="bg-white text-foreground shadow-sm border rounded-lg p-6 sm:p-8 print:shadow-none print:border-0 print:rounded-none print:p-0"
      >
        <header className="text-center mb-6">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            Republic of the Philippines
          </h1>
          <h2 className="text-lg font-semibold mt-1 sm:text-xl">
            Provincial Government of South Cotabato
          </h2>
          <h3 className="text-base font-medium mt-1 sm:text-lg">
            Cultural Center and Sports Complex
          </h3>
          <p className="text-sm text-muted-foreground">
            Koronadal City, South Cotabato
          </p>
          <Separator className="my-4" />
          <h4 className="text-lg font-bold uppercase tracking-wide">
            Order of Payment
          </h4>
          <p className="text-sm text-muted-foreground">
            Reference No: {data.id}
          </p>
        </header>

        <section className="mb-5">
          <h5 className="font-semibold mb-2 text-sm">Client Information</h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
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
        </section>

        <section className="mb-5">
          <h5 className="font-semibold mb-2 text-sm">Event Dates</h5>
          <ul className="list-disc list-inside text-sm space-y-0.5">
            {formattedDates.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground mt-1">
            Total of {dateList.length} day(s)
          </p>
        </section>

        <section className="mb-6">
          <h5 className="font-semibold mb-2 text-sm">Charges Breakdown</h5>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-foreground/20">
                {hasPerDateLines && (
                  <th className="text-left py-2 pr-3 font-medium w-[28%]">
                    Date
                  </th>
                )}
                <th className="text-left py-2 font-medium">Description</th>
                <th className="text-right py-2 font-medium w-[28%]">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {paymentLines.map((line, i) => (
                <tr key={i} className="border-b border-foreground/10">
                  {hasPerDateLines && (
                    <td className="py-2 pr-3 align-top text-muted-foreground">
                      {line.date ? formatChargeDate(line.date) : "—"}
                    </td>
                  )}
                  <td className="py-2 align-top">{line.label}</td>
                  <td className="text-right py-2 tabular-nums align-top">
                    ₱{line.amount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-bold text-base border-t border-foreground/20">
                <td
                  className="py-3"
                  colSpan={hasPerDateLines ? 2 : 1}
                >
                  Total Amount Due
                </td>
                <td className="text-right py-3 tabular-nums">
                  ₱{totalAmount.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </section>

        {data.remarks && (
          <section className="mb-4 text-sm">
            <p className="font-semibold">Remarks</p>
            <p className="text-muted-foreground mt-1">{data.remarks}</p>
          </section>
        )}

        <footer className="text-sm text-muted-foreground space-y-1 border-t border-foreground/10 pt-4">
          <p><strong>Payment Instructions:</strong></p>
          <p>
            Please present this Order of Payment to the Accounting Office to
            process your payment.
          </p>
          <p>
            Payment must be made at least 3 days before the first event date.
          </p>
          <p className="mt-3 text-xs">
            This is a system-generated document. No signature required.
          </p>
          <p className="text-xs">
            Generated on: {new Date().toLocaleString()}
          </p>
        </footer>
      </article>

      <style jsx global>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4;
            margin: 1.5cm;
          }
        }
      `}</style>
    </div>
  );
}

export default function OrderOfPaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <OrderOfPaymentContent />
    </Suspense>
  );
}
