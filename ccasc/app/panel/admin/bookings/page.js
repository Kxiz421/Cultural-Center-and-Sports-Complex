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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarDays, Trophy } from "lucide-react";
import { formatPhp } from "@/lib/data/admin-mock";

export default function BookingsPage() {
  const [status, setStatus] = React.useState("all");
  const [bookings, setBookings] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/bookings");
        const data = await res.json();
        setBookings(data);
      } catch (err) {
        console.error("Failed to load bookings:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const cultural = bookings.filter(
    (b) => b.venueId === 1 && (status === "all" || b.status === status)
  );
  const sports = bookings.filter(
    (b) => b.venueId === 2 && (status === "all" || b.status === status)
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Bookings</h2>
        <p className="text-muted-foreground text-sm">
          Read-only oversight — administrator monitors reservations & payment
          progress across both venues.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Booking status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Confirmed">Confirmed</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
                {cultural.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-muted-foreground py-8 text-center"
                    >
                      No bookings
                    </TableCell>
                  </TableRow>
                ) : (
                  cultural.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="max-w-[160px] truncate">
                        <span className="font-medium">{b.clientName}</span>
                      </TableCell>
                      <TableCell className="max-w-[160px] truncate text-sm">
                        {b.eventType}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {b.eventDate}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{b.status}</Badge>
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
                {sports.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-muted-foreground py-8 text-center"
                    >
                      No bookings
                    </TableCell>
                  </TableRow>
                ) : (
                  sports.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="max-w-[160px] truncate">
                        <span className="font-medium">{b.clientName}</span>
                      </TableCell>
                      <TableCell className="max-w-[160px] truncate text-sm">
                        {b.eventType}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {b.eventDate}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{b.status}</Badge>
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
    </div>
  );
}