"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Pencil,
  Archive,
  RotateCcw,
  X,
} from "lucide-react";

const STATUS_OPTIONS = [
  { id: 1, name: "Available" },
  { id: 2, name: "Unavailable" },
  { id: 3, name: "Under Maintenance" },
  { id: 4, name: "Archived" },
];

function getStatusName(statusId) {
  const s = STATUS_OPTIONS.find((o) => String(o.id) === String(statusId));
  return s ? s.name : "";
}

export default function ParticularsPage() {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [editOpen, setEditOpen] = React.useState(false);
  const [editItem, setEditItem] = React.useState(null);
  const [editForm, setEditForm] = React.useState({
    itemName: "",
    unitCost: "",
    quantityAvailable: "",
    statusId: "",
  });
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirmAction, setConfirmAction] = React.useState(null);
  const [saving, setSaving] = React.useState(false);

  const fetchItems = async (search) => {
    try {
      setLoading(true);
      const params = search ? `?search=${encodeURIComponent(search)}` : "";
      const res = await fetch(`/api/inventory${params}`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load inventory:", err);
      toast.error("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    const timer = setTimeout(() => {
      fetchItems(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const openEditDialog = (item) => {
    setEditItem(item);
    setEditForm({
      itemName: item.itemName,
      unitCost: String(item.unitCost),
      quantityAvailable: String(item.quantityAvailable),
      statusId: String(item.statusId || ""),
    });
    setEditOpen(true);
  };

  const handleSaveItem = async () => {
    if (!editItem) return;
    if (!editForm.itemName.trim()) {
      toast.error("Item name is required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/inventory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: editItem.itemId,
          itemName: editForm.itemName.trim(),
          unitCost: parseFloat(editForm.unitCost) || 0,
          quantityAvailable: parseInt(editForm.quantityAvailable, 10) || 0,
          statusId: editForm.statusId || "1",
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to update item");
      }

      toast.success("Item updated successfully");
      setEditOpen(false);
      setEditItem(null);
      await fetchItems(searchQuery);
    } catch (err) {
      toast.error(err.message || "Failed to update item");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleArchive = async () => {
    if (!confirmAction?.item) return;
    const item = confirmAction.item;
    const isArchived = Number(item.statusId) === 4;
    const newStatusId = isArchived ? "1" : "4";

    setSaving(true);
    try {
      const res = await fetch("/api/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: item.itemId,
          statusId: newStatusId,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to update item status");
      }

      const updated = await res.json();

      // Update local state immediately
      setItems((prev) =>
        prev.map((i) => (i.id === updated.id ? updated : i))
      );

      toast.success(
        isArchived
          ? "Item restored successfully"
          : "Item archived successfully"
      );
      setConfirmOpen(false);
      setConfirmAction(null);
    } catch (err) {
      toast.error(err.message || "Failed to update item status");
    } finally {
      setSaving(false);
    }
  };

  const filteredItems = items.filter((item) => {
    if (!searchQuery) return true;
    const term = searchQuery.toLowerCase();
    const statusLabel = getStatusName(item.statusId);
    const hay = [item.itemName, item.venue, statusLabel]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(term);
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Particulars Management
        </h2>
        <p className="text-muted-foreground text-sm">
          Rentable equipment inventory — manage quantities, details, and availability status.
        </p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search inventory items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {searchQuery && (
              <Button variant="ghost" size="sm" onClick={() => setSearchQuery("")}>
                <X className="mr-1 size-3" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Items</CardTitle>
          <CardDescription>
            Click the edit icon to update item details and status. Use archive/restore to manage availability.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead className="text-right">Qty Available</TableHead>
                <TableHead>Venue</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                    {searchQuery ? "No items match your search" : "No inventory items found"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item) => {
                  const statusName = getStatusName(item.statusId);
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium">{item.itemName}</div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        ₱{item.unitCost.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {item.quantityAvailable}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.venue}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={statusName === "Available" ? "outline" : "secondary"}
                          className={
                            statusName === "Available"
                              ? "text-green-600 border-green-300"
                              : statusName === "Under Maintenance"
                                ? "text-yellow-600 border-yellow-300 bg-yellow-50"
                                : statusName === "Unavailable"
                                  ? "text-red-600"
                                  : statusName === "Archived"
                                    ? "text-muted-foreground"
                                    : ""
                          }
                        >
                          {statusName}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(item)}
                            title="Edit item"
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setConfirmAction({
                                type: statusName === "Archived" ? "unarchive" : "archive",
                                item: item,
                              });
                              setConfirmOpen(true);
                            }}
                            title={statusName === "Archived" ? "Restore item" : "Archive item"}
                          >
                            {statusName === "Archived" ? (
                              <RotateCcw className="size-4 text-green-600" />
                            ) : (
                              <Archive className="size-4 text-amber-600" />
                            )}
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

      {/* Edit Dialog */}
      <Dialog key={editItem?.itemId || "no-edit"} open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Inventory Item</DialogTitle>
            <DialogDescription>
              Update item details, cost, quantity, and availability status.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Item Name</Label>
              <Input
                id="edit-name"
                value={editForm.itemName}
                onChange={(e) => setEditForm((f) => ({ ...f, itemName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-cost">Unit Cost (₱)</Label>
              <Input
                id="edit-cost"
                type="number"
                min="0"
                step="0.01"
                value={editForm.unitCost}
                onChange={(e) => setEditForm((f) => ({ ...f, unitCost: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-qty">Quantity Available</Label>
              <Input
                id="edit-qty"
                type="number"
                min="0"
                step="1"
                value={editForm.quantityAvailable}
                onChange={(e) => setEditForm((f) => ({ ...f, quantityAvailable: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select
                value={editForm.statusId}
                onValueChange={(v) => setEditForm((f) => ({ ...f, statusId: v }))}
              >
                <SelectTrigger id="edit-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditOpen(false); setEditItem(null); }}>
              Cancel
            </Button>
            <Button onClick={handleSaveItem} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {confirmAction?.type === "archive" && <Archive className="size-5 text-amber-600" />}
              {confirmAction?.type === "unarchive" && <RotateCcw className="size-5 text-green-600" />}
              {confirmAction?.type === "archive" ? "Archive Item" : "Restore Item"}
            </DialogTitle>
            <DialogDescription>
              {confirmAction?.type === "archive"
                ? `Are you sure you want to archive "${confirmAction?.item?.itemName}"? It will be hidden from booking selection.`
                : `Are you sure you want to restore "${confirmAction?.item?.itemName}"? It will become available for booking selection.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => { setConfirmOpen(false); setConfirmAction(null); }}
            >
              Cancel
            </Button>
            <Button
              variant={confirmAction?.type === "archive" ? "destructive" : "default"}
              onClick={handleToggleArchive}
              disabled={saving}
            >
              {saving
                ? "Processing..."
                : confirmAction?.type === "archive"
                  ? "Archive"
                  : "Restore"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}