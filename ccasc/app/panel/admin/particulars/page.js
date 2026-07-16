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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Pencil,
  Archive,
  RotateCcw,
  Trash2,
  X,
  Package,
  History,
  User,
  ShieldCheck,
  XCircle,
  Shield,
} from "lucide-react";

const STATUS_OPTIONS = [
  { id: 1, name: "Available" },
  { id: 2, name: "Unavailable" },
  { id: 3, name: "Under Maintenance" },
  { id: 4, name: "Archived" },
];

function getStatusName(statusId) {
  const s = STATUS_OPTIONS.find((o) => o.id === Number(statusId));
  return s ? s.name : "";
}

export default function ParticularsPage() {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [editOpen, setEditOpen] = React.useState(false);
  const [editItem, setEditItem] = React.useState(null);
  const [editForm, setEditForm] = React.useState({
    particularName: "",
    description: "",
    quantityAvailable: "",
  });
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirmAction, setConfirmAction] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [addOpen, setAddOpen] = React.useState(false);
  const [addForm, setAddForm] = React.useState({
    particularName: "",
    description: "",
    quantityAvailable: "",
  });
  const [addConfirmOpen, setAddConfirmOpen] = React.useState(false);
  const [editConfirmOpen, setEditConfirmOpen] = React.useState(false);
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [detailsItem, setDetailsItem] = React.useState(null);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [historyLogs, setHistoryLogs] = React.useState([]);
  const [historyLoading, setHistoryLoading] = React.useState(false);

  const fetchItems = async (search) => {
    try {
      setLoading(true);
      const params = search ? `?search=${encodeURIComponent(search)}` : "";
      const res = await fetch(`/api/particulars${params}`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load particulars:", err);
      toast.error("Failed to load particulars");
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

  const resetAddForm = () => {
    setAddForm({ particularName: "", description: "", quantityAvailable: "" });
  };

  const openEditDialog = (item) => {
    setEditItem(item);
    setEditForm({
      particularName: item.particularName,
      description: item.description || "",
      quantityAvailable: String(item.totalQuantity || ""),
    });
    setEditOpen(true);
  };

  const handleOpenHistory = async () => {
    setHistoryOpen(true);
    setHistoryLoading(true);
    setHistoryLogs([]);
    try {
      const res = await fetch(`/api/audit-logs?targetUserIdPrefix=PART-`);
      if (!res.ok) throw new Error("Failed to fetch history");
      const data = await res.json();
      setHistoryLogs(data);
    } catch (err) {
      toast.error("Failed to load history");
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSaveItem = async () => {
    if (!editItem) return;
    if (!editForm.particularName.trim()) {
      toast.error("Particular name is required");
      return;
    }

    setSaving(true);
    try {
      const performedBy = typeof window !== "undefined" ? localStorage.getItem("user_id") || "" : "";
      const performedByName = typeof window !== "undefined" ? localStorage.getItem("user_name") || "" : "";
      const res = await fetch("/api/particulars", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          particularId: editItem.particularId,
          particularName: editForm.particularName.trim(),
          description: editForm.description.trim(),
          quantityAvailable: parseInt(editForm.quantityAvailable, 10) || 0,
          performedBy,
          performedByName,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to update particular");
      }

      toast.success("Particular updated successfully");
      setEditOpen(false);
      setEditItem(null);
      await fetchItems(searchQuery);
    } catch (err) {
      toast.error(err.message || "Failed to update particular");
    } finally {
      setSaving(false);
    }
  };

  const handleAddParticular = async () => {
    if (!addForm.particularName.trim()) {
      toast.error("Particular name is required");
      return;
    }

    setSaving(true);
    try {
      const performedBy = typeof window !== "undefined" ? localStorage.getItem("user_id") || "" : "";
      const performedByName = typeof window !== "undefined" ? localStorage.getItem("user_name") || "" : "";
      const res = await fetch("/api/particulars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          particularName: addForm.particularName.trim(),
          description: addForm.description.trim(),
          quantityAvailable: parseInt(addForm.quantityAvailable, 10) || 0,
          performedBy,
          performedByName,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to create particular");
      }

      toast.success("Particular created successfully");
      resetAddForm();
      setAddOpen(false);
      await fetchItems(searchQuery);
    } catch (err) {
      toast.error(err.message || "Failed to create particular");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleArchive = async () => {
    if (!confirmAction?.item) return;
    const item = confirmAction.item;
    const isArchived = Number(item.statusId) === 4;
    const newStatusId = isArchived ? 1 : 4;

    setSaving(true);
    try {
      const performedBy = typeof window !== "undefined" ? localStorage.getItem("user_id") || "" : "";
      const performedByName = typeof window !== "undefined" ? localStorage.getItem("user_name") || "" : "";
      const res = await fetch("/api/particulars", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          particularId: item.particularId,
          statusId: newStatusId,
          performedBy,
          performedByName,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to update status");
      }

      toast.success(
        isArchived
          ? "Particular restored successfully"
          : "Particular archived successfully"
      );
      setConfirmOpen(false);
      setConfirmAction(null);
      await fetchItems(searchQuery);
    } catch (err) {
      toast.error(err.message || "Failed to update status");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmAction?.item) return;

    setSaving(true);
    try {
      const performedBy = typeof window !== "undefined" ? localStorage.getItem("user_id") || "" : "";
      const performedByName = typeof window !== "undefined" ? localStorage.getItem("user_name") || "" : "";

      const res = await fetch(
        `/api/particulars?id=${confirmAction.item.particularId}&performedBy=${encodeURIComponent(performedBy)}&performedByName=${encodeURIComponent(performedByName)}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to delete particular");
      }

      toast.success("Particular deleted successfully");
      setConfirmOpen(false);
      setConfirmAction(null);
      await fetchItems(searchQuery);
    } catch (err) {
      toast.error(err.message || "Failed to delete particular");
    } finally {
      setSaving(false);
    }
  };

  const filteredItems = items.filter((item) => {
    if (!searchQuery) return true;
    const term = searchQuery.toLowerCase();
    const hay = [item.particularName, item.description, item.inventoryName, getStatusName(item.statusId)]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(term);
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Particulars Management
          </h2>
          <p className="text-muted-foreground text-sm">
            Manage rentable equipment and amenities — add, edit, archive, or remove particulars.
          </p>
        </div>
        <Dialog
          open={addOpen}
          onOpenChange={(open) => {
            setAddOpen(open);
            if (!open) resetAddForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 size-4" />
              Add Particular
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Particular</DialogTitle>
              <DialogDescription>
                Create a new particular item (equipment or amenity) available for booking.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="add-name">Item Name *</Label>
                <Input
                  id="add-name"
                  placeholder="e.g. Wireless Microphone"
                  value={addForm.particularName}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, particularName: e.target.value.replace(/[^a-zA-Z\s]/g, "").slice(0, 20) }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-desc">Brief Description</Label>
                <Textarea
                  id="add-desc"
                  rows={2}
                  placeholder="Brief description of the particular item..."
                  value={addForm.description}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, description: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-qty">Quantity Available</Label>
                <Input
                  id="add-qty"
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 50"
                  value={addForm.quantityAvailable}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, quantityAvailable: e.target.value.replace(/\D/g, "").slice(0, 5) }))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  resetAddForm();
                  setAddOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button onClick={() => setAddConfirmOpen(true)} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by name, description, or status..."
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

      {/* Particulars Table */}
      <Card>
        <CardHeader>
          <CardTitle>Particulars List</CardTitle>
          <CardDescription>
            {filteredItems.length} particular{filteredItems.length !== 1 ? "s" : ""} available.
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
                <TableHead>Status</TableHead>
                <TableHead className="text-right w-28">Actions</TableHead>
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
                    {searchQuery ? "No particulars match your search" : "No particulars found. Add one to get started."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item) => {
                  const statusName = getStatusName(item.statusId);
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="text-muted-foreground text-sm">
                        {item.particularId}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Package className="size-4 text-muted-foreground shrink-0" />
                          <div>
                            <button
                              className="font-medium text-left hover:underline"
                              onClick={() => { setDetailsItem(item); setDetailsOpen(true); }}
                            >
                              {item.particularName}
                            </button>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.inventoryName || "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {item.totalQuantity}
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
                            title="Edit particular"
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setConfirmAction({
                                type: statusName === "Archived" ? "unarchive" : "archive",
                                item,
                              });
                              setConfirmOpen(true);
                            }}
                            title={statusName === "Archived" ? "Restore particular" : "Archive particular"}
                          >
                            {statusName === "Archived" ? (
                              <RotateCcw className="size-4 text-green-600" />
                            ) : (
                              <Archive className="size-4 text-amber-600" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setConfirmAction({ type: "delete", item });
                              setConfirmOpen(true);
                            }}
                            title="Delete particular"
                          >
                            <Trash2 className="size-4 text-red-500" />
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
      <Dialog key={editItem?.particularId || "no-edit"} open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Particular</DialogTitle>
            <DialogDescription>
              Update the item name, description, and quantity.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Item Name</Label>
              <Input
                id="edit-name"
                value={editForm.particularName}
                onChange={(e) => setEditForm((f) => ({ ...f, particularName: e.target.value.replace(/[^a-zA-Z\s]/g, "").slice(0, 20) }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-desc">Brief Description</Label>
              <Textarea
                id="edit-desc"
                rows={2}
                value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-qty">Quantity Available</Label>
              <Input
                id="edit-qty"
                type="text"
                inputMode="numeric"
                placeholder="e.g. 50"
                value={editForm.quantityAvailable}
                onChange={(e) => setEditForm((f) => ({ ...f, quantityAvailable: e.target.value.replace(/\D/g, "").slice(0, 5) }))}
              />
              {editItem?.inventoryName && (
                <p className="text-xs text-muted-foreground mt-1">
                  Linked to Inventory: <span className="font-medium">{editItem.inventoryName}</span>
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditOpen(false); setEditItem(null); }}>
              Cancel
            </Button>
            <Button onClick={() => setEditConfirmOpen(true)} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive/Restore Confirmation Dialog */}
      <Dialog open={confirmOpen && (confirmAction?.type === "archive" || confirmAction?.type === "unarchive")} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {confirmAction?.type === "archive" ? (
                <Archive className="size-5 text-amber-600" />
              ) : (
                <RotateCcw className="size-5 text-green-600" />
              )}
              {confirmAction?.type === "archive" ? "Archive Particular" : "Restore Particular"}
            </DialogTitle>
            <DialogDescription>
              {confirmAction?.type === "archive"
                ? `Are you sure you want to archive "${confirmAction?.item?.particularName}"? It will be hidden from booking selection.`
                : `Are you sure you want to restore "${confirmAction?.item?.particularName}"? It will become available again.`}
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
              {saving ? "Processing..." : confirmAction?.type === "archive" ? "Archive" : "Restore"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Confirmation Dialog */}
      <Dialog open={addConfirmOpen} onOpenChange={setAddConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-5" />
              Confirm Add Particular
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to create this particular?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name:</span>
              <span className="font-medium text-right">{addForm.particularName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quantity:</span>
              <span className="font-medium text-right">{addForm.quantityAvailable || 0}</span>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddConfirmOpen(false)}>Cancel</Button>
            <Button onClick={() => { setAddConfirmOpen(false); handleAddParticular(); }} disabled={saving}>
              {saving ? "Saving..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Confirmation Dialog */}
      <Dialog open={editConfirmOpen} onOpenChange={setEditConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="size-5" />
              Confirm Save Changes
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to save the changes to &ldquo;{editItem?.particularName}&rdquo;?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditConfirmOpen(false)}>Cancel</Button>
            <Button onClick={() => { setEditConfirmOpen(false); handleSaveItem(); }} disabled={saving}>
              {saving ? "Saving..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="size-5" />
              {detailsItem?.particularName}
            </DialogTitle>
            <DialogDescription>
              Full details of this particular item.
            </DialogDescription>
          </DialogHeader>
          {detailsItem && (
            <div className="space-y-3 rounded-lg border bg-muted/30 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">ID:</span>
                <span className="font-medium">{detailsItem.particularId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name:</span>
                <span className="font-medium">{detailsItem.particularName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Description:</span>
                <span className="font-medium text-right max-w-[200px]">{detailsItem.description || "No description"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Inventory Item:</span>
                <span className="font-medium">{detailsItem.inventoryName || "Not linked"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Quantity Available:</span>
                <span className="font-medium">{detailsItem.totalQuantity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant="outline" className={
                  getStatusName(detailsItem.statusId) === "Available"
                    ? "text-green-600 border-green-300"
                    : "text-muted-foreground"
                }>{getStatusName(detailsItem.statusId)}</Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={confirmOpen && confirmAction?.type === "delete"} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="size-5 text-red-500" />
              Delete Particular
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete &ldquo;{confirmAction?.item?.particularName}&rdquo;? This action cannot be undone.
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
              variant="destructive"
              onClick={handleDelete}
              disabled={saving}
            >
              {saving ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="size-5" />
              Account History
            </DialogTitle>
            <DialogDescription>
              View all particular changes performed by admins
            </DialogDescription>
          </DialogHeader>
          {historyLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading history...</div>
          ) : historyLogs.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No history records found</div>
          ) : (
            <div className="space-y-3">
              {historyLogs.map((log) => (
                <div key={log.auditLogId} className="flex items-start gap-3 rounded-lg border p-3">
                  <div className="mt-0.5">
                    {log.action === "CREATED" && <User className="size-4 text-blue-500" />}
                    {log.action === "UPDATED" && <User className="size-4 text-blue-500" />}
                    {log.action === "DELETED" && <Trash2 className="size-4 text-red-500" />}
                    {log.action === "ARCHIVED" && <Archive className="size-4 text-amber-600" />}
                    {log.action === "RESTORED" && <RotateCcw className="size-4 text-green-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className={
                          log.action === "CREATED" ? "text-blue-600 border-blue-300" :
                          log.action === "UPDATED" ? "text-blue-600 border-blue-300" :
                          log.action === "DELETED" ? "text-red-600 border-red-300" :
                          log.action === "ARCHIVED" ? "text-amber-600 border-amber-300" :
                          "text-green-600 border-green-300"
                        }
                      >
                        {log.action}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-sm mt-1">
                      <span className="text-muted-foreground">Target: </span>
                      <span className="font-medium">{log.targetName}</span>
                      <span className="text-muted-foreground"> ({log.targetUserId})</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <span>By: </span>
                      <span className="font-medium">{log.performedByName}</span>
                      <span className="text-muted-foreground"> ({log.performedById})</span>
                    </p>
                    {log.details && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        {log.details}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* History Button - Bottom Right */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={handleOpenHistory}
          className="shadow-lg"
          size="lg"
        >
          <History className="mr-2 size-5" />
          History
        </Button>
      </div>
    </div>
  );
}