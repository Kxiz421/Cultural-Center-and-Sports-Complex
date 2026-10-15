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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, X } from "lucide-react";

function formatPeso(value) {
  return `₱${(Number(value) || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function statusLabel(p) {
  return p.statusName || (Number(p.statusId) === 1 ? "Available" : "Archived");
}

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Start of today in Philippine Time, as a timestamp. */
function startOfTodayPHT() {
  const PHT_MS = 8 * 60 * 60 * 1000;
  const shifted = new Date(Date.now() + PHT_MS);
  return new Date(
    Date.UTC(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth(),
      shifted.getUTCDate()
    ) - PHT_MS
  ).getTime();
}

export default function AmenitiesPage() {
  const [particulars, setParticulars] = React.useState([]);
  const [movements, setMovements] = React.useState({ restocked: 0, damaged: 0 });
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [details, setDetails] = React.useState(null);
  const [detailsTransactions, setDetailsTransactions] = React.useState([]);
  const [detailsLoading, setDetailsLoading] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [particularsRes, movementsRes] = await Promise.all([
          fetch("/api/particulars", { cache: "no-store" }),
          fetch("/api/particulars?movementSummary=day", { cache: "no-store" }),
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

  const statusOptions = React.useMemo(() => {
    const set = new Set(particulars.map((p) => statusLabel(p)));
    return [...set].sort();
  }, [particulars]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return particulars.filter((p) => {
      if (statusFilter !== "all" && statusLabel(p) !== statusFilter) {
        return false;
      }
      if (!q) return true;
      const hay = [p.particularName, p.description, p.category]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [particulars, query, statusFilter]);

  const hasActiveFilters = query.trim() !== "" || statusFilter !== "all";

  const openDetails = React.useCallback(async (particular) => {
    setDetails(particular);
    setDetailsTransactions([]);
    setDetailsLoading(true);
    try {
      const res = await fetch(
        `/api/particulars?transactionsFor=${particular.particularId}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      setDetailsTransactions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load particular movements:", err);
    } finally {
      setDetailsLoading(false);
    }
  }, []);

  /** This particular's restock / damage totals for today (Philippine Time). */
  const todayMovements = React.useMemo(() => {
    const since = startOfTodayPHT();
    const total = (type) =>
      detailsTransactions
        .filter(
          (t) =>
            t.transactionType === type &&
            new Date(t.createdAt).getTime() >= since
        )
        .reduce((sum, t) => sum + (Number(t.quantity) || 0), 0);
    return { restock: total("RESTOCK"), damage: total("DAMAGE") };
  }, [detailsTransactions]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Amenities overview
        </h2>
        <p className="text-muted-foreground text-sm">
          Live Cultural Center particulars — search them, see on-hand
          quantities and current status, and open any row for its details.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
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
            <CardDescription>Restocked today</CardDescription>
            <CardTitle className="text-3xl tabular-nums text-green-600">
              {loading ? "—" : movements.restocked}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-xs">
            Units added today.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Damaged today</CardDescription>
            <CardTitle className="text-3xl tabular-nums text-red-600">
              {loading ? "—" : movements.damaged}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-xs">
            Units reported damaged today.
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-3 space-y-0">
          <CardTitle>Particulars details</CardTitle>
          <CardDescription>
            Cultural Center particulars and their current stock.
          </CardDescription>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="relative min-w-[200px] max-w-md flex-1">
              <Search className="text-muted-foreground absolute top-2.5 left-2 size-4" />
              <Input
                className="pl-8"
                placeholder="Search particular or description…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="w-[190px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {statusOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setQuery("");
                  setStatusFilter("all");
                }}
              >
                <X className="mr-1 size-3" />
                Clear
              </Button>
            )}
            <span className="text-muted-foreground text-xs">
              {filtered.length} of {particulars.length}
            </span>
          </div>
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
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    {particulars.length === 0
                      ? "No particulars found"
                      : "No particulars match your search"}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => {
                  const label = statusLabel(p);
                  return (
                    <TableRow
                      key={p.particularId}
                      onClick={() => openDetails(p)}
                      className="cursor-pointer hover:bg-muted/50"
                    >
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

      {/* Particular details + today's movements */}
      <Dialog
        open={!!details}
        onOpenChange={(open) => {
          if (!open) setDetails(null);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2 pr-6">
              {details?.particularName || "Particular"}
              {details && (
                <Badge
                  variant={
                    statusLabel(details) === "Available" ? "outline" : "secondary"
                  }
                  className={
                    statusLabel(details) === "Available"
                      ? "text-green-600 border-green-300"
                      : ""
                  }
                >
                  {statusLabel(details)}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {details?.category
                ? `Category: ${details.category}`
                : "Details and stock movements for this particular."}
            </DialogDescription>
          </DialogHeader>

          {details && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div>
                  <p className="text-muted-foreground text-xs font-medium">
                    On hand
                  </p>
                  <p className="font-medium tabular-nums">
                    {Number(details.totalQuantity) || 0}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-medium">
                    Unit cost
                  </p>
                  <p className="font-medium tabular-nums">
                    {formatPeso(details.unitCost)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-medium">
                    Inventory item
                  </p>
                  <p className="font-medium">{details.inventoryName || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-medium">
                    Category
                  </p>
                  <p className="font-medium">{details.category || "—"}</p>
                </div>
              </div>

              {details.description && (
                <div>
                  <p className="text-muted-foreground mb-1 text-xs font-medium">
                    Description
                  </p>
                  <p className="leading-relaxed">{details.description}</p>
                </div>
              )}

              <div className="bg-muted/30 space-y-1.5 rounded-md border p-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Restocked today</span>
                  <span className="font-medium tabular-nums text-green-600">
                    +{todayMovements.restock}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Damaged today</span>
                  <span className="font-medium tabular-nums text-red-600">
                    −{todayMovements.damage}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-muted-foreground mb-2 text-xs font-medium">
                  Recent movements
                </p>
                {detailsLoading ? (
                  <p className="text-muted-foreground">Loading movements…</p>
                ) : detailsTransactions.length === 0 ? (
                  <p className="text-muted-foreground">
                    No restock or damage recorded for this particular yet.
                  </p>
                ) : (
                  <div className="divide-y rounded-md border">
                    {detailsTransactions.slice(0, 10).map((t) => (
                      <div
                        key={t.transactionId}
                        className="flex items-start justify-between gap-3 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="font-medium">
                            {t.transactionType === "RESTOCK" ? "Restocked" : "Damaged"}{" "}
                            {t.quantity} unit(s)
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {formatDateTime(t.createdAt)} · {t.performedByName || "—"}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            t.transactionType === "RESTOCK"
                              ? "shrink-0 border-green-300 text-green-600"
                              : "shrink-0 border-red-300 text-red-600"
                          }
                        >
                          {t.transactionType}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
