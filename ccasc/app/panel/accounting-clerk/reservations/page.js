"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Search, Eye, FileText, Printer } from "lucide-react";
import { formatPhp } from "@/lib/data/accounting-mock";
import { buildPaymentLines } from "@/lib/reservation-payment-lines";
import OrderOfPaymentDocument from "@/components/order-of-payment-document";

function formatActivityDate(dateStr) {
  if (!dateStr) return "";
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** Build the Order of Payment props for a reservation row from GET /api/reservations. */
function buildOrderOfPayment(reservation) {
  if (!reservation) return null;
  const dateList = [
    ...(reservation.eventDates || [reservation.eventDate]),
  ]
    .filter(Boolean)
    .sort();

  return {
    controlNumber: reservation.id,
    date: new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
    clientName: reservation.clientName,
    address: "",
    contactNumber: "",
    activityName: reservation.eventType,
    activityDate: dateList.map(formatActivityDate).join(", "),
    participants: "",
    chargeLines: buildPaymentLines(reservation, dateList),
    totalAmount: Number(reservation.totalAmount) || 0,
    eventDates: dateList,
    venueName: reservation.venue,
  };
}

export default function AccountingReservationsPage() {
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [venueFilter, setVenueFilter] = React.useState("all");
  const [selectedRes, setSelectedRes] = React.useState(null);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [orderOfPayment, setOrderOfPayment] = React.useState(null);
  const [reservations, setReservations] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/reservations");
        const data = await res.json();
        setReservations(data);
      } catch (err) {
        console.error("Failed to load reservations:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const rows = reservations.filter((r) => {
    if (status !== "all" && r.status !== status) return false;
    if (venueFilter !== "all" && r.venueId !== parseInt(venueFilter)) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const match =
        r.clientName.toLowerCase().includes(q) ||
        r.venue.toLowerCase().includes(q) ||
        r.eventType.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Reservations
        </h2>
        <p className="text-muted-foreground text-sm">
          View reservation records — search, filter, and inspect booking details.
        </p>
      </div>

      {orderOfPayment && (
        <div className="flex flex-col gap-4">
          <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 p-4">
            <div>
              <p className="font-medium">
                Order of Payment ready — {orderOfPayment.controlNumber}
              </p>
              <p className="text-muted-foreground text-sm">
                Print this and hand it to the client for payment at the
                Accounting Office.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setOrderOfPayment(null)}
              >
                Close
              </Button>
              <Button onClick={() => window.print()}>
                <Printer className="mr-2 size-4" />
                Print Order of Payment
              </Button>
            </div>
          </div>

          <OrderOfPaymentDocument
            controlNumber={orderOfPayment.controlNumber}
            date={orderOfPayment.date}
            clientName={orderOfPayment.clientName}
            address={orderOfPayment.address}
            contactNumber={orderOfPayment.contactNumber}
            activityName={orderOfPayment.activityName}
            activityDate={orderOfPayment.activityDate}
            participants={orderOfPayment.participants}
            chargeLines={orderOfPayment.chargeLines}
            totalAmount={orderOfPayment.totalAmount}
            eventDates={orderOfPayment.eventDates}
            venueName={orderOfPayment.venueName}
          />
        </div>
      )}

      <Card>
        <CardHeader className="gap-4 space-y-0 md:flex-row md:items-end md:justify-between">
          <div>
            <CardTitle>Reservation Records</CardTitle>
            <CardDescription>
              Complete reservation details including client info, venue,
              schedule, resources, and payment status.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search & Filters */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
              <Input
                placeholder="Search by client, venue, or event..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Booking status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="Confirmed">Confirmed</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Select value={venueFilter} onValueChange={setVenueFilter}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="All venues" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All venues</SelectItem>
                <SelectItem value="1">Cultural Center</SelectItem>
                <SelectItem value="2">Sports Complex</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Venue</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{r.clientName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {r.venue}
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {r.eventType}
                  </TableCell>
                  <TableCell className="text-sm">{r.eventDate}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{r.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {r.bookingStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    <div className="tabular-nums">{formatPhp(r.amountPaid)}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        title="View details"
                        onClick={() => {
                          setSelectedRes(r);
                          setDetailOpen(true);
                        }}
                      >
                        <Eye className="size-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="whitespace-nowrap"
                        title="Generate Order of Payment"
                        onClick={() =>
                          setOrderOfPayment(buildOrderOfPayment(r))
                        }
                      >
                        <FileText className="mr-2 size-4" />
                        Order of Payment
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-muted-foreground py-8 text-center"
                  >
                    No reservations match your search criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Reservation Details</DialogTitle>
            <DialogDescription>
              Complete information for {selectedRes?.id}
            </DialogDescription>
          </DialogHeader>
          {selectedRes && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground text-xs font-medium">
                    CLIENT
                  </p>
                  <p className="font-medium">{selectedRes.clientName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-medium">
                    VENUE
                  </p>
                  <p className="text-sm">{selectedRes.venue}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-medium">
                    EVENT
                  </p>
                  <p className="text-sm">{selectedRes.eventType}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-medium">
                    DATE
                  </p>
                  <p className="text-sm">{selectedRes.eventDate}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-medium">
                    TIME
                  </p>
                  <p className="text-sm">{selectedRes.timeSlot}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-medium">
                    STATUS
                  </p>
                  <Badge variant="outline">{selectedRes.status}</Badge>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-medium">
                    PAYMENT
                  </p>
                  <Badge variant="outline">{selectedRes.bookingStatus}</Badge>
                </div>
              </div>

              <div className="border-t pt-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Amount Paid</span>
                  <span className="font-medium tabular-nums">
                    {formatPhp(selectedRes.amountPaid)}
                  </span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                setOrderOfPayment(buildOrderOfPayment(selectedRes));
                setDetailOpen(false);
              }}
            >
              <FileText className="mr-2 size-4" />
              Generate Order of Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}