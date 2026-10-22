"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Plus,
  Printer,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  FileText,
  CreditCard,
  ChevronRight,
} from "lucide-react";
import { cn, formatPhp } from "@/lib/utils";
import { buildPaymentLines } from "@/lib/reservation-payment-lines";
import { formatDisplayDate } from "@/components/order-of-payment-document";
import { computeReservationProgress } from "@/lib/reservation-progress";

const VENUE_LABEL = { 1: "Cultural Center", 2: "Sports Complex" };

function getClientId() {
  return localStorage.getItem("user_id")?.replace("CLT-", "") || "";
}

/** A reservation becomes a "booking" once a booking row exists for it. */
function recordTypeOf(reservation) {
  return reservation?.bookingStatus && reservation.bookingStatus !== "Unbooked"
    ? "booking"
    : "reservation";
}

function statusBadgeClass(status) {
  const s = String(status || "").toLowerCase();
  if (s === "confirmed" || s === "approved")
    return "text-green-600 border-green-300 bg-green-50";
  if (s === "pending")
    return "text-yellow-700 border-yellow-300 bg-yellow-50";
  if (s === "completed") return "text-blue-600 border-blue-300";
  if (s === "cancelled" || s === "declined")
    return "text-red-600 border-red-300 bg-red-50";
  return "text-muted-foreground border-border";
}

/* ---------------------------------------------------------------- progress */

const TONE_FILL = {
  yellow: "bg-gradient-to-b from-amber-300 via-yellow-400 to-amber-600",
  red: "bg-gradient-to-b from-red-400 via-red-500 to-red-700",
  green: "bg-gradient-to-b from-emerald-300 via-green-500 to-emerald-700",
  cancelled: "bg-gradient-to-b from-zinc-300 via-zinc-400 to-zinc-600",
};

const TONE_GLOW = {
  yellow: "shadow-[0_8px_18px_-6px_rgba(234,179,8,0.75)]",
  red: "shadow-[0_8px_18px_-6px_rgba(239,68,68,0.75)]",
  green: "shadow-[0_8px_18px_-6px_rgba(16,185,129,0.75)]",
  cancelled: "shadow-[0_8px_18px_-6px_rgba(113,113,122,0.6)]",
};

const TONE_BANNER = {
  yellow: {
    wrap: "border-yellow-300 bg-yellow-50 text-yellow-900",
    icon: AlertTriangle,
    label: "In progress",
  },
  red: {
    wrap: "border-red-300 bg-red-50 text-red-900",
    icon: AlertTriangle,
    label: "Action needed",
  },
  green: {
    wrap: "border-emerald-300 bg-emerald-50 text-emerald-900",
    icon: CheckCircle2,
    label: "All set",
  },
  cancelled: {
    wrap: "border-zinc-300 bg-zinc-100 text-zinc-700",
    icon: XCircle,
    label: "Cancelled",
  },
};

/** Big, dimensional, colour-coded process bar. */
function ProgressBar({ progress }) {
  const { steps, tone, isComplete } = progress;

  return (
    <div className="space-y-3">
      <div className="relative rounded-full bg-muted p-1.5 shadow-[inset_0_2px_6px_rgba(0,0,0,0.18)] ring-1 ring-black/5">
        <div className="flex gap-1.5">
          {steps.map((step) => {
            const state = step.done ? "done" : step.current ? "current" : "todo";
            const fillTone = step.done ? "green" : tone;
            return (
              <div
                key={step.key}
                title={step.title}
                className={cn(
                  "relative h-7 flex-1 overflow-hidden rounded-full transition-all duration-700",
                  state === "todo" && "bg-black/5",
                  state !== "todo" && [
                    TONE_FILL[fillTone],
                    "border border-white/30",
                  ],
                  state === "current" && TONE_GLOW[tone]
                )}
              >
                {state !== "todo" && (
                  <>
                    {/* Glassy top highlight — the "3D" bevel. */}
                    <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-full bg-white/30" />
                    {state === "current" && !isComplete && (
                      <span className="progress-sheen pointer-events-none" />
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-1.5">
        {steps.map((step) => (
          <p
            key={step.key}
            title={step.title}
            className={cn(
              "min-w-0 flex-1 text-center text-[11px] leading-tight",
              step.done
                ? "text-emerald-700"
                : step.current
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground"
            )}
          >
            {step.title}
          </p>
        ))}
      </div>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

function DeadlineCell({ label, date }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-muted-foreground text-xs font-medium">{label}</p>
      <p className="font-medium">{formatDisplayDate(date) || "—"}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ detail */

function ReservationDetail({ reservation }) {
  const [docState, setDocState] = React.useState({ id: null, phase: null });

  React.useEffect(() => {
    if (!reservation?.id) return;
    let cancelled = false;
    const numericId = String(reservation.id).replace(/^RES-/i, "");
    const params = new URLSearchParams({ reservationId: numericId });
    const clientId = getClientId();
    if (clientId) params.set("clientId", clientId);

    fetch(`/api/documents?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const phase =
          data && !Array.isArray(data) ? data.phase || null : null;
        setDocState({ id: reservation.id, phase });
      })
      .catch(() => {
        if (!cancelled) setDocState({ id: reservation.id, phase: null });
      });

    return () => {
      cancelled = true;
    };
  }, [reservation?.id]);

  // Only trust the loaded phase once it matches the reservation on screen.
  const documentsPhase =
    docState.id === reservation?.id ? docState.phase : null;
  const progress = computeReservationProgress({ reservation, documentsPhase });
  const { totals } = progress;
  const banner = TONE_BANNER[progress.tone];
  const BannerIcon = banner.icon;

  const dateList = [...(reservation.eventDates || [reservation.eventDate])]
    .filter(Boolean)
    .sort();
  const lines = buildPaymentLines(reservation, dateList);
  const facilities = reservation.facilities || [];
  const particulars = reservation.particulars || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-xl">{reservation.eventType}</CardTitle>
            <CardDescription>Reference: {reservation.id}</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={statusBadgeClass(reservation.status)}>
              {reservation.status || "Unknown"}
            </Badge>
            <Badge variant="secondary">
              {recordTypeOf(reservation) === "booking" ? "Booking" : "Reservation"}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <ProgressBar progress={progress} />

        <div className={cn("rounded-lg border p-4", banner.wrap)}>
          <div className="flex items-center gap-2">
            <BannerIcon className="size-5 shrink-0" />
            <p className="font-semibold">{progress.headline}</p>
            <Badge variant="outline" className="ml-auto border-current">
              {banner.label}
            </Badge>
          </div>
          {progress.instruction && (
            <p className="mt-1.5 text-sm opacity-90">{progress.instruction}</p>
          )}
          {progress.urgency && (
            <p className="mt-1.5 text-sm font-medium">{progress.urgency}</p>
          )}
        </div>

        {/* Quick facts */}
        <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="text-muted-foreground size-4 shrink-0" />
            <span className="text-muted-foreground">Venue</span>
            <span className="ml-auto font-medium">
              {reservation.venue || VENUE_LABEL[reservation.venueId] || "—"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="text-muted-foreground size-4 shrink-0" />
            <span className="text-muted-foreground">Time Slot</span>
            <span className="ml-auto font-medium">{reservation.timeSlot || "—"}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="text-muted-foreground size-4 shrink-0" />
            <span className="text-muted-foreground">Event Date(s)</span>
            <span className="ml-auto text-right font-medium">
              {dateList.length
                ? dateList.map(formatDisplayDate).join(", ")
                : "—"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CreditCard className="text-muted-foreground size-4 shrink-0" />
            <span className="text-muted-foreground">Payment</span>
            <span className="ml-auto font-medium">
              {reservation.paymentStatus || "Pending"}
            </span>
          </div>
        </div>

        <Separator />

        {/* Charges */}
        <div>
          <p className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wider">
            Booking Details
          </p>
          {lines.length > 0 ? (
            <div className="divide-y rounded-md border">
              {lines.map((line, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between gap-3 px-3 py-1.5 text-sm"
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
                    {formatPhp(line.amount)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No charges recorded.</p>
          )}
        </div>

        {(facilities.length > 0 || particulars.length > 0) && (
          <div className="grid gap-4 sm:grid-cols-2">
            {facilities.length > 0 && (
              <div>
                <p className="text-muted-foreground mb-1 text-xs font-medium">
                  Facilities
                </p>
                <ul className="list-inside list-disc space-y-0.5 text-sm">
                  {facilities.map((f) => (
                    <li key={f.facilityId}>
                      {f.name}
                      {Number(f.quantity) > 1 ? ` × ${f.quantity}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {particulars.length > 0 && (
              <div>
                <p className="text-muted-foreground mb-1 text-xs font-medium">
                  Particulars
                </p>
                <ul className="list-inside list-disc space-y-0.5 text-sm">
                  {particulars.map((p) => (
                    <li key={p.particularId}>
                      {p.name} × {p.quantity}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Totals */}
        <div className="bg-muted/30 space-y-1.5 rounded-md border p-3 text-sm">
          <SummaryRow label="Total Amount" value={formatPhp(totals.totalAmount)} />
          <SummaryRow label="Amount Paid" value={formatPhp(totals.amountPaid)} />
          <SummaryRow
            label="Required 50% Down Payment"
            value={formatPhp(totals.requiredDownPayment)}
          />
          <SummaryRow
            label="Required 10% Deposit"
            value={formatPhp(totals.requiredDeposit)}
          />
          <Separator />
          <div className="flex justify-between gap-3 font-bold">
            <span>Balance</span>
            <span className="tabular-nums">{formatPhp(totals.balance)}</span>
          </div>
        </div>

        {/* Deadlines */}
        <div>
          <p className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wider">
            Deadlines
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            <DeadlineCell
              label="Down Payment"
              date={reservation.downPaymentDeadline}
            />
            <DeadlineCell label="Balance" date={reservation.balanceDeadline} />
            <DeadlineCell
              label="Cancellation"
              date={reservation.cancellationDeadline}
            />
          </div>
        </div>

        {reservation.remarks && (
          <div>
            <p className="text-muted-foreground mb-1 text-xs font-medium">Notes</p>
            <p className="text-sm">{reservation.remarks}</p>
          </div>
        )}

        <Separator />

        <div className="flex flex-wrap gap-2">
          <Link href={`/panel/client/order-of-payment?id=${reservation.id}`}>
            <Button>
              <Printer className="mr-2 size-4" />
              View &amp; Print Order of Payment
            </Button>
          </Link>
          <Link href="/panel/client/documents">
            <Button variant="outline">
              <FileText className="mr-2 size-4" />
              Documents
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

/* ----------------------------------------------------------------- tracker */

function ReservationsTracker() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramId = searchParams?.get("id") || null;

  const [reservations, setReservations] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const [venueFilter, setVenueFilter] = React.useState("all");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [selectedId, setSelectedId] = React.useState(null);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const clientId = getClientId();
        const res = await fetch(
          `/api/reservations${clientId ? `?clientId=${clientId}` : ""}`
        );
        const data = await res.json();
        if (!cancelled) setReservations(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) console.error("Failed to load reservations:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Selected row: an explicit click, else the ?id= target (post-create
  // redirect), else the first record — so the detail pane is never empty
  // without needing an effect.
  const effectiveSelectedId =
    selectedId ??
    (paramId && reservations.some((r) => r.id === paramId)
      ? paramId
      : reservations[0]?.id ?? null);
  const selected =
    reservations.find((r) => r.id === effectiveSelectedId) || null;

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return reservations.filter((r) => {
      if (venueFilter !== "all" && String(r.venueId) !== venueFilter) return false;
      if (typeFilter !== "all" && recordTypeOf(r) !== typeFilter) return false;
      if (statusFilter !== "all" && String(r.status) !== statusFilter) return false;
      if (!q) return true;
      const hay = [
        r.id,
        r.eventType,
        r.venue,
        r.status,
        r.bookingStatus,
        r.paymentStatus,
        r.eventDate,
        ...(r.eventDates || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [reservations, query, venueFilter, typeFilter, statusFilter]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">My Reservations</h2>
          <p className="text-muted-foreground text-sm">
            Search and track your reservations. Select one to see its status and
            what to do next.
          </p>
        </div>
        <Button onClick={() => router.push("/panel/client/reservations/new")}>
          <Plus className="mr-2 size-4" />
          New Reservation
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
        {/* List */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Reservations</CardTitle>
            <CardDescription>
              {filtered.length} of {reservations.length} shown
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="text-muted-foreground pointer-events-none absolute left-2.5 top-2.5 size-4" />
              <Input
                placeholder="Search by venue, event, ID, status..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-8"
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Select value={venueFilter} onValueChange={setVenueFilter}>
                <SelectTrigger className="w-full min-w-0" aria-label="Filter by venue">
                  <SelectValue placeholder="Venue" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All venues</SelectItem>
                  <SelectItem value="1">Cultural Center</SelectItem>
                  <SelectItem value="2">Sports Complex</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full min-w-0" aria-label="Filter by type">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="reservation">Reservation</SelectItem>
                  <SelectItem value="booking">Booking</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="col-span-2 w-full min-w-0" aria-label="Filter by status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Confirmed">Confirmed</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                  <SelectItem value="Declined">Declined</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="text-muted-foreground flex items-center justify-center gap-2 py-10">
                <Loader2 className="size-4 animate-spin" />
                Loading reservations...
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-muted-foreground py-10 text-center text-sm">
                {reservations.length === 0
                  ? "You have no reservations yet."
                  : "No reservations match your search or filters."}
              </div>
            ) : (
              <ul className="max-h-[32rem] space-y-2 overflow-y-auto pr-1">
                {filtered.map((r) => {
                  const isSelected = r.id === effectiveSelectedId;
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(r.id)}
                        className={cn(
                          "group w-full rounded-lg border p-3 text-left transition hover:bg-muted/50",
                          isSelected && "border-primary/50 bg-muted shadow-sm"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="min-w-0 truncate font-medium">
                            {r.eventType}
                          </p>
                          <ChevronRight className="text-muted-foreground mt-0.5 size-4 shrink-0 transition group-hover:translate-x-0.5" />
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <Badge
                            variant="outline"
                            className={statusBadgeClass(r.status)}
                          >
                            {r.status || "Unknown"}
                          </Badge>
                          <Badge variant="secondary">
                            {recordTypeOf(r) === "booking" ? "Booking" : "Reservation"}
                          </Badge>
                        </div>
                        <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-3 text-xs">
                          <span className="flex items-center gap-1">
                            <MapPin className="size-3" />
                            {r.venue || VENUE_LABEL[r.venueId] || "—"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="size-3" />
                            {formatDisplayDate(r.eventDate) || "—"}
                          </span>
                        </div>
                        <p className="text-muted-foreground mt-1 text-xs">
                          {r.id} · {r.paymentStatus || "Pending"}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Detail */}
        {selected ? (
          <ReservationDetail reservation={selected} />
        ) : (
          <Card className="flex items-center justify-center py-16">
            <CardContent className="text-muted-foreground text-center text-sm">
              {loading
                ? "Loading..."
                : "Select a reservation to view its status and booking details."}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
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
      <ReservationsTracker />
    </Suspense>
  );
}
