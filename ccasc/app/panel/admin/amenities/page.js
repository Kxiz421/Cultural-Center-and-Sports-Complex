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

function formatPeso(value) {
  return `₱${(Number(value) || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function AmenitiesPage() {
  const [particulars, setParticulars] = React.useState([]);
  const [movements, setMovements] = React.useState({ restocked: 0, damaged: 0 });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [particularsRes, movementsRes] = await Promise.all([
          fetch("/api/particulars", { cache: "no-store" }),
          fetch("/api/particulars?movementSummary=month", { cache: "no-store" }),
        ]);
        const particularsData = await particularsRes.json();
        const movementsData = await movementsRes.json();
        if (cancelled) return;
        setParticulars(Array.isArray(particularsData) ? particularsData : []);
        setMovements({
          restocked: Number(movementsData?.restocked) || 0,
          damaged: Number(movementsData?.damaged) || 0,
        });
      } catch (err) {
        console.error("Failed to load amenities data:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalUnits = particulars.reduce(
    (sum, p) => sum + (Number(p.totalQuantity) || 0),
    0
  );

  const statusLabel = (p) =>
    p.statusName || (Number(p.statusId) === 1 ? "Available" : "Archived");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Amenities overview
        </h2>
        <p className="text-muted-foreground text-sm">
          Live Cultural Center particulars — on-hand quantities, restocks and
          damage this month, and current status.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tracked line-items</CardDescription>
            <CardTitle className="text-3xl">
              {loading ? "—" : particulars.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-xs">
            Distinct particulars on record.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total units on hand</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {loading ? "—" : totalUnits}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-xs">
            Sum of on-hand quantities.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Restocked this month</CardDescription>
            <CardTitle className="text-3xl tabular-nums text-green-600">
              {loading ? "—" : movements.restocked}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-xs">
            Units added this month.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Damaged this month</CardDescription>
            <CardTitle className="text-3xl tabular-nums text-red-600">
              {loading ? "—" : movements.damaged}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-xs">
            Units reported damaged this month.
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Particulars details</CardTitle>
          <CardDescription>
            Cultural Center particulars and their current stock.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Particular</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">On hand</TableHead>
                <TableHead className="text-right">Unit cost</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Loading particulars…
                  </TableCell>
                </TableRow>
              ) : particulars.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No particulars found
                  </TableCell>
                </TableRow>
              ) : (
                particulars.map((p) => {
                  const label = statusLabel(p);
                  return (
                    <TableRow key={p.particularId}>
                      <TableCell className="font-medium">
                        {p.particularName}
                      </TableCell>
                      <TableCell className="max-w-[320px] truncate text-muted-foreground">
                        {p.description || "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {Number(p.totalQuantity) || 0}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatPeso(p.unitCost)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={label === "Available" ? "outline" : "secondary"}
                          className={
                            label === "Available"
                              ? "text-green-600 border-green-300"
                              : ""
                          }
                        >
                          {label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
