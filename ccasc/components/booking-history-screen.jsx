"use client";

import * as React from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  History,
  Calendar,
  CreditCard,
  Clock,
  ChevronRight,
  MapPin,
  Printer,
} from "lucide-react";
import { buildPaymentLines } from "@/lib/reservation-payment-lines";
import {
  formatPeso,
  formatDisplayDate,
} from "@/components/order-of-payment-document";

/**
 * Booking & Reservation history, shown as a **stack** of records with the most
 * recent activity (the last change) on top.
 *
 * Both client-role panels use this one screen:
 *   - client             -> /panel/client/history (+ its Order of Payment page)
 *   - provincial agency  -> /panel/provincial-agency/history
 *
 * Reservations come from `/api/reservations` and bookings from `/api/bookings`;
 * a client-role session is pinned to its own records by the API, so the screens
 * only ever show the caller's own history.
 *
 * @param {object} props
 * @param {string} [props.title]
 * @param {string} [props.description]
 * @param {(item: object) => string|null} [props.orderOfPaymentHref] optional
 *   "View & Print Order of Payment" target for a history record
 */

function statusBadge(status) {
  const s = (status || "").toLowerCase();
  let className = "";
  if (s === "confirmed" || s === "approved")
    className = "text-green-600 border-green-300";
  else if (s === "pending")
    className = "text-yellow-600 border-yellow-300 bg-yellow-50";
  else if (s === "completed") className = "text-blue-600 border-blue-300";
  else if (s === "cancelled" || s === "declined")
    className = "text-red-600 border-red-300";
  else if (s === "ongoing") className = "text-purple-600 border-purple-300";
  return (
    <Badge variant="outline" className={className}>
      {status || "Unknown"}
    </Badge>
  );
}

function typeBadge(type) {
  return type === "booking" ? (
    <Badge variant="default">Booking</Badge>
  ) : (
    <Badge variant="secondary">Reservation</Badge>
  );
}

/** Timestamp of the newest activity on a record (ms). */
function activityTime(item) {
  const value = item.activityAt || item.eventDate;
  const time = value ? new Date(value).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

export function BookingHistoryScreen({
  title = "Booking & Reservation History",
  description = "Your reservations and bookings, stacked with the latest change on top. Click a record to view its details.",
  orderOfPaymentHref,
}) {
  const [reservations, setReservations] = React.useState([]);
  const [bookings, setBookings] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState("all");
  const [selected, setSelected] = React.useState(null);

  React.useEffect(() => {
    let cancelled = false;

    async function fetchHistory() {
      const rawId =
        typeof window === "undefined"
          ? ""
          : localStorage.getItem("user_id") || "";
      const clientId = rawId.replace(/^CLT-/i, "");
      if (!clientId) {
        setLoading(false);
        return;
      }

      try {
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
    return () => {
      cancelled = true;
    };
  }, []);

  // Stack every record, newest activity first (the last change sits on top).
  const allHistory = React.useMemo(() => {
    const items = [];

    reservations.forEach((r) => {
      items.push({
        key: `reservation-${r.id}`,
        type: "reservation",
        eventType: r.eventType,
        venue: r.venue,
        eventDate: r.eventDate,
        eventDates: r.eventDates || [r.eventDate],
        timeSlot: r.timeSlot || "—",
        status: r.status,
        amount: r.amountPaid || 0,
        packageName: r.packageName || null,
        reservationId: r.id,
        activityAt: r.submittedAt || r.eventDate,
        activityLabel: r.submittedAt ? "Submitted" : "Event date",
        source: r,
      });
    });

    bookings.forEach((b) => {
      items.push({
        key: `booking-${b.id}`,
        type: "booking",
        eventType: b.eventType,
        venue: b.venue,
        eventDate: b.eventDate,
        eventDates: [b.eventDate],
        timeSlot: b.timeSlot || "—",
        status: b.status,
        amount: b.amountPaid || 0,
        packageName: b.packageName || null,
        reservationId: b.reservationId,
        activityAt: b.confirmationDate || b.eventDate,
        activityLabel: b.confirmationDate ? "Confirmed" : "Event date",
        source: b,
      });
    });

    return items.sort(
      (a, b) =>
        activityTime(b) - activityTime(a) ||
        String(b.eventDate || "").localeCompare(String(a.eventDate || "")) ||
        a.key.localeCompare(b.key)
    );
  }, [reservations, bookings]);

  const filteredHistory = React.useMemo(() => {
    if (activeTab === "all") return allHistory;
    return allHistory.filter((item) => item.type === activeTab);
  }, [allHistory, activeTab]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          <p className="text-muted-foreground text-sm">
            Loading your history...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>History Stack</CardTitle>
          <CardDescription>
            {allHistory.length} record(s), newest change first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            defaultValue="all"
            value={activeTab}
            onValueChange={setActiveTab}
            className="mb-4"
          >
            <TabsList>
              <TabsTrigger value="all">All ({allHistory.length})</TabsTrigger>
              <TabsTrigger value="reservation">
                Reservations ({reservations.length})
              </TabsTrigger>
              <TabsTrigger value="booking">
                Bookings ({bookings.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <History className="size-8 text-muted-foreground" />
              <p className="text-muted-foreground">No history found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredHistory.map((item, index) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setSelected(item)}
                  className={`group w-full rounded-lg border p-4 text-left transition hover:bg-muted/40 hover:border-foreground/20 focus:outline-none focus:ring-2 focus:ring-ring ${
                    index === 0 ? "border-foreground/30 shadow-sm" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium">{item.eventType}</p>
                        {index === 0 && (
                          <Badge variant="default" className="text-[10px]">
                            Latest change
                          </Badge>
                        )}
                        {typeBadge(item.type)}
                        {statusBadge(item.status)}
                      </div>
                      <div className="text-muted-foreground flex flex-wrap items-center gap-4 text-xs">
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3" />
                          {formatDisplayDate(item.eventDate) || "—"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          {item.timeSlot}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3" />
                          {item.venue}
                        </span>
                      </div>
                      <div className="text-muted-foreground flex flex-wrap items-center gap-4 text-xs">
                        {item.packageName && (
                          <span>Package: {item.packageName}</span>
                        )}
                        {item.amount > 0 && (
                          <span className="flex items-center gap-1">
                            <CreditCard className="size-3" />₱
                            {formatPeso(item.amount)}
                          </span>
                        )}
                        <span>
                          {item.activityLabel}:{" "}
                          {formatDisplayDate(item.activityAt) || "—"}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="text-muted-foreground group-hover:text-foreground mt-1 size-4 shrink-0 transition group-hover:translate-x-0.5" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <HistoryDetailDialog
        item={selected}
        orderOfPaymentHref={orderOfPaymentHref}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </div>
  );
}

export default BookingHistoryScreen;

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs font-medium">{label}</p>
      <p className="font-medium">{value || "—"}</p>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

function HistoryDetailDialog({ item, onOpenChange, orderOfPaymentHref }) {
  const open = !!item;

  // Reservations carry the full charge breakdown; bookings link back to theirs.
  const isReservation = item?.type === "reservation";
  const src = item?.source || {};
  const dateList = isReservation
    ? [...(src.eventDates || [src.eventDate])].filter(Boolean).sort()
    : [src.eventDate].filter(Boolean);
  const lines = isReservation && item ? buildPaymentLines(src, dateList) : [];
  const totalAmount = isReservation ? Number(src.totalAmount) || 0 : 0;
  const amountPaid = Number(src.amountPaid ?? item?.amount ?? 0);
  const oopHref = item && orderOfPaymentHref ? orderOfPaymentHref(item) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        {item && (
          <>
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center gap-2 pr-6">
                {item.eventType || "Reservation"}
                {statusBadge(item.status)}
              </DialogTitle>
              <DialogDescription>
                Reference: {item.reservationId}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <Detail label="Venue" value={item.venue} />
                <Detail label="Time Slot" value={item.timeSlot} />
                <Detail label="Package" value={item.packageName || "—"} />
                <Detail
                  label={isReservation ? "Submitted" : "Confirmed"}
                  value={formatDisplayDate(
                    isReservation ? src.submittedAt : src.confirmationDate
                  )}
                />
              </div>

              <div>
                <p className="text-muted-foreground mb-1 text-xs font-medium">
                  Event Date(s)
                </p>
                <ul className="list-inside list-disc space-y-0.5">
                  {dateList.map((d) => (
                    <li key={d}>{formatDisplayDate(d)}</li>
                  ))}
                </ul>
                {dateList.length > 1 && (
                  <p className="text-muted-foreground mt-1 text-xs">
                    {dateList.length} day(s)
                  </p>
                )}
              </div>

              {isReservation && lines.length > 0 && (
                <div>
                  <p className="text-muted-foreground mb-1 text-xs font-medium">
                    Charges
                  </p>
                  <div className="divide-y rounded-md border">
                    {lines.map((line, i) => (
                      <div
                        key={i}
                        className="flex items-start justify-between gap-3 px-3 py-1.5"
                      >
                        <span className="min-w-0">
                          {line.date && (
                            <span className="text-muted-foreground block text-xs">
                              {formatDisplayDate(line.date)}
                            </span>
                          )}
                          {line.label}
                        </span>
                        <span className="shrink-0 tabular-nums">
                          ₱{formatPeso(line.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-muted/30 space-y-1.5 rounded-md border p-3">
                <SummaryRow
                  label="Total Amount"
                  value={totalAmount ? `₱${formatPeso(totalAmount)}` : "—"}
                />
                <SummaryRow
                  label="Amount Paid"
                  value={`₱${formatPeso(amountPaid)}`}
                />
                {isReservation && src.requiredDeposit != null && (
                  <SummaryRow
                    label="10% Deposit (Required)"
                    value={`₱${formatPeso(src.requiredDeposit)}`}
                  />
                )}
                <SummaryRow
                  label="Balance"
                  value={`₱${formatPeso(Math.max(0, totalAmount - amountPaid))}`}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              {oopHref && (
                <Link href={oopHref}>
                  <Button>
                    <Printer className="mr-2 size-4" />
                    View &amp; Print Order of Payment
                  </Button>
                </Link>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
