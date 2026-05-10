"use client";

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
import { MOCK_PARTICULARS } from "@/lib/data/admin-mock";

export default function AmenitiesPage() {
  const totalQty = MOCK_PARTICULARS.reduce((s, p) => s + p.quantityTotal, 0);
  const allocated = MOCK_PARTICULARS.reduce(
    (s, p) => s + p.quantityAllocated,
    0
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Amenities overview
        </h2>
        <p className="text-muted-foreground text-sm">
          Read-focused dashboard — monitors particulars categories, quantities,
          and allocation stress (demo metrics).
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tracked line-items</CardDescription>
            <CardTitle className="text-3xl">{MOCK_PARTICULARS.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-xs">
            Distinct inventory SKUs registered in particulars.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total units</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{totalQty}</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-xs">
            Sum of on-hand quantities across all equipment rows.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Allocated to events</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{allocated}</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-xs">
            Units reserved against upcoming bookings (example field).
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Allocation detail</CardTitle>
          <CardDescription>
            Supports identifying shortages before large provincial events.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">On hand</TableHead>
                <TableHead className="text-right">Allocated</TableHead>
                <TableHead className="text-right">Free pool</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_PARTICULARS.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {p.quantityTotal}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {p.quantityAllocated}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {p.quantityTotal - p.quantityAllocated}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        p.status === "Available" ? "outline" : "destructive"
                      }
                    >
                      {p.status}
                    </Badge>
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
