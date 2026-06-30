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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { CalendarDays, Trophy, Search, X } from "lucide-react";
import { formatPhp } from "@/lib/data/admin-mock";

function getStatusColor(status) {
  switch (status) {
    case "Confirmed": return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300";
    case "Pending": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300";
    case "Declined": return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
    default: return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }
}

export default function BookingsPage() {
  const [status, setStatus] = React.useState("all");
  const [clientType, setClientType] = React.useState("all");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [bookings, setBookings] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedBooking, setSelectedBooking] = React.useState(null);

  // Fetch bookings when filters change
  React.useEffect(() => {
    let cancelled = false;
    async function loadBookings() {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (status !== "all") params.set("status", status);
        if (clientType !== "all") params.set("clientType", clientType);
        if (dateFrom) params.set("dateFrom", dateFrom);
        if (dateTo) params.set("dateTo", dateTo);
        if (searchQuery) params.set("search", searchQuery);

        const res = await fetch(`/api/bookings?${params.toString()}`);
        const data = await res.json();
        if (!cancelled) setBookings(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) console.error("Failed to load bookings:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadBookings();
    return () => { cancelled = true; };
  }, [status, clientType, dateFrom, dateTo, searchQuery]);

  const cultural = bookings.filter((b) => b.venueId === 1);
  const sports = bookings.filter((b) => b.venueId === 2);

  const clearFilters = () => {
    setStatus("all");
    setClientType("all");
    setDateFrom("");
    setDateTo("");
    setSearchQuery("");
  };

  const hasActiveFilters = status !== "all" || clientType !== "all" || dateFrom || dateTo || searchQuery;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Bookings</h2>
        <p className="text-muted-foreground text-sm">
          Read-only oversight — administrator monitors reservations & payment
          progress across both venues.
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Search Client</Label>
              <Input
                type="text"
                placeholder="Search by client name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-[220px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Booking status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Confirmed">Confirmed</SelectItem>
                  <SelectItem value="Declined">Declined</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Client Type</Label>
              <Select value={clientType} onValueChange={setClientType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Client type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="PROV">Provincial Department Agency</SelectItem>
                  <SelectItem value="PUB">Client</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">From</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">To</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-[160px]"
              />
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="mb-0.5">
                <X className="mr-1 size-3" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Cultural Center */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-blue-100">
                <CalendarDays className="size-5 text-blue-700" />
              </div>
              <div>
                <CardTitle className="text-lg">Cultural Center</CardTitle>
                <CardDescription>
                  {cultural.length} booking{cultural.length !== 1 ? "s" : ""}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : cultural.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
                      No bookings
                    </TableCell>
                  </TableRow>
                ) : (
                  cultural.map((b) => (
                    <TableRow
                      key={b.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setSelectedBooking(b)}
                    >
                      <TableCell className="max-w-[160px] truncate">
                        <span className="font-medium">{b.clientName}</span>
                        <span className="block text-[11px] text-muted-foreground">
                          {b.clientOrg}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[160px] truncate text-sm">
                        {b.eventType}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {b.eventDate}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(b.status)}>
                          {b.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums whitespace-nowrap">
                        {formatPhp(b.amountPaid)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Sports Complex */}
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-orange-100">
                <Trophy className="size-5 text-orange-700" />
              </div>
              <div>
                <CardTitle className="text-lg">Sports Complex</CardTitle>
                <CardDescription>
                  {sports.length} booking{sports.length !== 1 ? "s" : ""}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : sports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
                      No bookings
                    </TableCell>
                  </TableRow>
                ) : (
                  sports.map((b) => (
                    <TableRow
                      key={b.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setSelectedBooking(b)}
                    >
                      <TableCell className="max-w-[160px] truncate">
                        <span className="font-medium">{b.clientName}</span>
                        <span className="block text-[11px] text-muted-foreground">
                          {b.clientOrg}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[160px] truncate text-sm">
                        {b.eventType}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {b.eventDate}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(b.status)}>
                          {b.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums whitespace-nowrap">
                        {formatPhp(b.amountPaid)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Booking Detail Dialog */}
      <Dialog open={selectedBooking !== null} onOpenChange={(open) => { if (!open) setSelectedBooking(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
            <DialogDescription>
              {selectedBooking?.id} — {selectedBooking?.eventType}
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-6 py-2">
              {/* Client Information */}
              <div>
                <h4 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Client Information
                </h4>
                <div className="grid grid-cols-2 gap-4 rounded-lg border bg-muted/30 p-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Name</Label>
                    <p className="text-sm font-medium">{selectedBooking.clientName}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Organization</Label>
                    <p className="text-sm font-medium">{selectedBooking.clientOrg}</p>
                  </div>
                </div>
              </div>

              {/* Event Details */}
              <div>
                <h4 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Event Details
                </h4>
                <div className="grid grid-cols-2 gap-4 rounded-lg border bg-muted/30 p-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Event Type</Label>
                    <p className="text-sm font-medium">{selectedBooking.eventType}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Venue</Label>
                    <p className="text-sm font-medium">{selectedBooking.venue}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Date</Label>
                    <p className="text-sm font-medium">
                      {new Date(selectedBooking.eventDate).toLocaleDateString("en-US", {
                        weekday: "long", month: "long", day: "numeric", year: "numeric",
                      })}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Time</Label>
                    <p className="text-sm font-medium">{selectedBooking.timeSlot}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Package</Label>
                    <p className="text-sm font-medium">{selectedBooking.packageName || "N/A"}</p>
                  </div>
                  {selectedBooking.packageDayRate && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Package Rate</Label>
                      <p className="text-sm font-medium">
                        Day: {formatPhp(selectedBooking.packageDayRate)}
                        {selectedBooking.packageNightRate ? ` / Night: ${formatPhp(selectedBooking.packageNightRate)}` : ""}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Booking Status */}
              <div>
                <h4 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Booking Status
                </h4>
                <div className="grid grid-cols-2 gap-4 rounded-lg border bg-muted/30 p-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <Badge variant="outline" className={`mt-1 ${getStatusColor(selectedBooking.status)}`}>
                      {selectedBooking.status}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Confirmed By</Label>
                    <p className="text-sm font-medium">{selectedBooking.staffName || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Confirmation Date</Label>
                    <p className="text-sm font-medium">{selectedBooking.confirmationDate || "Not yet confirmed"}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Amount Paid</Label>
                    <p className="text-sm font-medium">{formatPhp(selectedBooking.amountPaid)}</p>
                  </div>
                </div>
              </div>

              {/* Facilities / Schedules */}
              <div>
                <h4 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Facilities & Schedules
                </h4>
                {selectedBooking.facilities && selectedBooking.facilities.length > 0 ? (
                  <div className="space-y-2">
                    {selectedBooking.facilities.map((fac, idx) => (
                      <div key={idx} className="rounded-lg border bg-muted/30 p-4">
                        <p className="text-sm font-medium">{fac.facilityName}</p>
                        {fac.description && (
                          <p className="text-xs text-muted-foreground mt-1">{fac.description}</p>
                        )}
                        {fac.capacity && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Capacity: {fac.capacity.toLocaleString()} pax
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="text-sm text-muted-foreground">No facilities assigned yet</p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" onClick={() => setSelectedBooking(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}