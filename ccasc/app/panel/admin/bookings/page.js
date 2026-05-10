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
import { MOCK_BOOKINGS, formatPhp } from "@/lib/data/admin-mock";

export default function BookingsPage() {
  const [status, setStatus] = React.useState("all");
  const [pay, setPay] = React.useState("all");

  const rows = MOCK_BOOKINGS.filter((b) => {
    if (status !== "all" && b.status !== status) return false;
    if (pay !== "all" && b.payment !== pay) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Bookings</h2>
        <p className="text-muted-foreground text-sm">
          Read-only oversight — administrator monitors reservations & payment
          progress (demo list).
        </p>
      </div>

      <Card>
        <CardHeader className="gap-4 space-y-0 md:flex-row md:items-end md:justify-between">
          <div>
            <CardTitle>Reservation register</CardTitle>
            <CardDescription>
              Filter by workflow status or payment progress.
            </CardDescription>
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
            <Select value={pay} onValueChange={setPay}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All payments</SelectItem>
                <SelectItem value="Partially paid">Partially paid</SelectItem>
                <SelectItem value="Fully paid">Fully paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking ID</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Facility</TableHead>
                <TableHead>Event date</TableHead>
                <TableHead>Booking</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Totals</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-mono text-xs">{b.id}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{b.clientName}</span>
                      <span className="text-muted-foreground text-xs">
                        {b.clientType}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{b.accountId}</TableCell>
                  <TableCell className="max-w-[200px] text-sm">
                    {b.facility}
                  </TableCell>
                  <TableCell>{b.eventDate}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{b.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        b.payment === "Fully paid" ? "default" : "secondary"
                      }
                    >
                      {b.payment}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    <div>{formatPhp(b.amountPaid)} paid</div>
                    <div className="text-muted-foreground">
                      of {formatPhp(b.amountTotal)}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
