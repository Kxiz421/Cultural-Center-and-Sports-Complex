"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileBarChart,
  History,
  Package,
  PackageX,
  Search,
  X,
} from "lucide-react";

/** "₱1,200.00" — the particular's price (`Inventory.unitCost`). */
function formatPeso(amount) {
  return `₱${(Number(amount) || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const STATUS_LABELS = {
  1: "Available",
  2: "Unavailable",
  3: "Under Maintenance",
  4: "Archived",
};

function statusName(statusId) {
  return STATUS_LABELS[Number(statusId)] || "";
}

/** "Sep 15, 2026 · 6:53 AM" — one movement's timestamp. */
function movedAt(value) {
  if (!value) return "";
  const date = new Date(value);
  return `${date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })} · ${date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

/**
 * Program Coordinator particulars module.
 *
 * The stock half of the coordinator's job, mirroring the admin Particulars
 * Management page but narrowed to what a coordinator owns:
 *
 *   Restock          — add units back to a particular's available quantity
 *   Report Damage    — record damaged units (never more than are available)
 *   History          — the restock / damage records of one particular
 *   Generate Report  — the Particulars Stock Report behind `reportsHref`
 *
 * Every movement goes through `PATCH /api/particulars`, which writes a
 * `ParticularTransaction` row and an audit-log entry attributed to the SIGNED-IN
 * user (the browser cannot name someone else as the one who restocked).
 *
 * @param {{ reportsHref?: string, scopeNote?: string }} props
 */
export function CoordinatorParticularsScreen({
  reportsHref = "/panel/program-coordinator/particulars/reports",
  scopeNote,
}) {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [action, setAction] = React.useState(null);
  const [actionQty, setActionQty] = React.useState("");
  const [historyItem, setHistoryItem] = React.useState(null);
  const [historyLogs, setHistoryLogs] = React.useState([]);
  const [historyLoading, setHistoryLoading] = React.useState(false);

  const loadItems = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/particulars");
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load particulars:", err);
      toast.error("Failed to load particulars");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadItems();
  }, [loadItems]);

  const openAction = (type, item) => {
    setAction({ type, item });
    setActionQty("");
  };

  const closeAction = () => {
    setAction(null);
    setActionQty("");
  };

  const submitAction = async () => {
    if (!action) return;
    const qty = parseInt(actionQty, 10);
    if (!qty || qty <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/particulars", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          particularId: action.item.particularId,
          action: action.type,
          quantity: qty,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to record the movement");
      }

      toast.success(
        action.type === "RESTOCK"
          ? `Successfully restocked ${qty} unit(s)`
          : `Reported ${qty} damaged unit(s)`
      );
      closeAction();
      await loadItems();
    } catch (err) {
      toast.error(err.message || "Failed to record the movement");
    } finally {
      setSaving(false);
    }
  };

  const openHistory = async (item) => {
    setHistoryItem(item);
    setHistoryLogs([]);
    setHistoryLoading(true);
    try {
      const res = await fetch(
        `/api/particulars?transactionsFor=${item.particularId}`
      );
      const data = await res.json();
      setHistoryLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error("Failed to load history");
    } finally {
      setHistoryLoading(false);
    }
  };

  const filtered = items.filter((item) => {
    const hay = [item.particularName, item.category, item.inventoryName]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(searchQuery.toLowerCase());
  });

  const currentQty = Number(action?.item?.totalQuantity) || 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Particulars Management
          </h2>
          <p className="text-muted-foreground text-sm">
            Restock equipment and amenities, report damaged units, and generate
            the particulars stock report.
          </p>
        </div>
        <Button asChild variant="outline" className="md:ml-auto">
          <Link href={reportsHref}>
            <FileBarChart className="mr-2 size-4" />
            Generate Report
          </Link>
        </Button>
      </div>

      {scopeNote && (
        <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
          {scopeNote}
        </div>
      )}

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="relative max-w-sm flex-1">
              <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Search by name, category, or inventory item..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery("")}
              >
                <X className="mr-1 size-3" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Particulars list */}
      <Card>
        <CardHeader>
          <CardTitle>Particulars List</CardTitle>
          <CardDescription>
            {filtered.length} particular{filtered.length !== 1 ? "s" : ""} —
            restocking and damage reports are logged under your name.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Item Name</TableHead>
                <TableHead>Inventory Item</TableHead>
                <TableHead className="text-right">Qty Available</TableHead>
                <TableHead className="text-right">Price / Unit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right w-40">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-muted-foreground py-8 text-center"
                  >
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-muted-foreground py-8 text-center"
                  >
                    {searchQuery
                      ? "No particulars match your search"
                      : "No particulars found."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => {
                  const name = statusName(item.statusId);
                  return (
                    <TableRow key={item.particularId}>
                      <TableCell className="text-muted-foreground text-sm">
                        {item.particularId}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Package className="text-muted-foreground size-4 shrink-0" />
                          <span className="font-medium">
                            {item.particularName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {item.inventoryName || "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {item.totalQuantity}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {Number(item.unitCost) > 0 ? (
                          formatPeso(item.unitCost)
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            Not priced
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            name === "Available" ? "outline" : "secondary"
                          }
                          className={
                            name === "Available"
                              ? "border-green-300 text-green-600"
                              : name === "Under Maintenance"
                                ? "border-yellow-300 bg-yellow-50 text-yellow-600"
                                : ""
                          }
                        >
                          {name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openAction("RESTOCK", item)}
                            title="Restock this particular"
                          >
                            <Package className="size-4 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openAction("DAMAGE", item)}
                            title="Report damaged units"
                          >
                            <PackageX className="size-4 text-red-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openHistory(item)}
                            title="Restock / damage history"
                          >
                            <History className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Restock / report damage dialog */}
      <Dialog open={!!action} onOpenChange={(open) => !open && closeAction()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {action?.type === "RESTOCK" ? (
                <Package className="size-5 text-green-600" />
              ) : (
                <PackageX className="size-5 text-red-500" />
              )}
              {action?.type === "RESTOCK"
                ? "Restock Particular"
                : "Report Damaged Units"}
            </DialogTitle>
            <DialogDescription>
              {action?.type === "RESTOCK"
                ? `Add units back to “${action?.item?.particularName}”.`
                : `Record damaged units of “${action?.item?.particularName}”. Damage can never exceed the units available.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <span className="text-muted-foreground">Currently available</span>
              <span className="font-medium tabular-nums">{currentQty}</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="movement-qty">
                {action?.type === "RESTOCK" ? "Units to add" : "Units damaged"}
              </Label>
              <Input
                id="movement-qty"
                type="text"
                inputMode="numeric"
                placeholder="e.g. 5"
                value={actionQty}
                onChange={(e) =>
                  setActionQty(e.target.value.replace(/\D/g, "").slice(0, 5))
                }
              />
              {action?.type === "DAMAGE" &&
                actionQty &&
                parseInt(actionQty, 10) > currentQty && (
                  <p className="text-destructive text-xs">
                    Only {currentQty} unit(s) are available to report.
                  </p>
                )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeAction} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant={action?.type === "DAMAGE" ? "destructive" : "default"}
              onClick={submitAction}
              disabled={saving || !actionQty || parseInt(actionQty, 10) <= 0}
            >
              {saving
                ? "Recording..."
                : action?.type === "RESTOCK"
                  ? "Add Stock"
                  : "Report Damage"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restock / damage history of one particular */}
      <Dialog
        open={!!historyItem}
        onOpenChange={(open) => !open && setHistoryItem(null)}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="size-5" />
              Restock &amp; Damage History
            </DialogTitle>
            <DialogDescription>
              {historyItem?.particularName} — every restocking and damage record
              of this particular, with the date and the staff member behind it.
            </DialogDescription>
          </DialogHeader>
          {historyLoading ? (
            <div className="text-muted-foreground py-8 text-center">
              Loading history...
            </div>
          ) : historyLogs.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">
              No restock or damage records yet.
            </div>
          ) : (
            <div className="max-h-80 space-y-1.5 overflow-y-auto">
              {historyLogs.map((log) => (
                <div
                  key={log.transactionId}
                  className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {log.transactionType === "RESTOCK" ? (
                      <Package className="size-4 shrink-0 text-green-600" />
                    ) : (
                      <PackageX className="size-4 shrink-0 text-red-500" />
                    )}
                    <span className="truncate font-medium">
                      {log.transactionType === "RESTOCK"
                        ? "Restocked"
                        : "Damaged"}
                    </span>
                    <span className="font-bold tabular-nums">
                      {log.transactionType === "RESTOCK" ? "+" : "−"}
                      {log.quantity}
                    </span>
                  </div>
                  <div className="text-muted-foreground shrink-0 text-right text-xs">
                    <div>{movedAt(log.createdAt)}</div>
                    <div className="truncate">
                      {log.performedByName || log.performedById || "—"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
