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
} from "lucide-react";

const STATUS_OPTIONS = [
  { id: 1, name: "Available" },
  { id: 2, name: "Unavailable" },
  { id: 3, name: "Under Maintenance" },
  { id: 4, name: "Archived" },
];

const CATEGORY_OPTIONS = [
  "Audio Equipment",
  "Lighting",
  "Seating",
  "Tables",
  "Sports Equipment",
  "Stage Equipment",
  "Air Conditioning",
  "Display/Visual",
  "Other",
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
    category: "",
    totalQuantity: "",
  });
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirmAction, setConfirmAction] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [addOpen, setAddOpen] = React.useState(false);
  const [addForm, setAddForm] = React.useState({
    particularName: "",
    description: "",
    category: "",
    totalQuantity: "",
  });
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
    setAddForm({ particularName: "", description: "", category: "", totalQuantity: "" });
  };

  const openEditDialog = (item) => {
    setEditItem(item);
    setEditForm({
      particularName: item.particularName,
      description: item.description || "",
      category: item.category || "",
      totalQuantity: String(item.totalQuantity || ""),
    });
    setEditOpen(true);
  };

  const openHistoryDialog = async (item) => {
    setHistoryLoading(true);
    setHistoryOpen(true);
    try {
      const res = await fetch(`/api/audit-logs?targetUserId=PART-${item.particularId}`);
      const data = await res.json();
      setHistoryLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load history:", err);
      setHistoryLogs([]);
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
          category: editForm.category.trim(),
          totalQuantity: parseInt(editForm.totalQuantity, 10) || 0,
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
          category: addForm.category.trim(),
          totalQuantity: parseInt(addForm.totalQuantity, 10) || 0,
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
    const hay = [item.particularName, item.description, item.category, getStatusName(item.statusId)]
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
                    setAddForm((f) => ({ ...f, particularName: e.target.value }))
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
                <Label htmlFor="add-category">Category</Label>
                <Select
                  value={addForm.category}
                  onValueChange={(v) => setAddForm((f) => ({ ...f, category: v }))}
                >
                  <SelectTrigger id="add-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-qty">Total Quantity</Label>
                <Input
                  id="add-qty"
                  type="number"
                  min="0"
                  placeholder="e.g. 50"
                  value={addForm.totalQuantity}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, totalQuantity: e.target.value }))
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
              <Button onClick={handleAddParticular} disabled={saving}>
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
                placeholder="Search by name, description, category, or status..."
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
            Use archive/restore to manage availability.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Item Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Total Qty</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right w-32">Actions</TableHead>
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
                            <span className="font-medium">{item.particularName}</span>
                            {item.description && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {item.category || "—"}
                        </Badge>
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
                            onClick={() => openHistoryDialog(item)}
                            title="View history"
                          >
                            <History className="size-4" />
                          </Button>
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
              Update the item name, description, category, and quantity.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Item Name</Label>
              <Input
                id="edit-name"
                value={editForm.particularName}
                onChange={(e) => setEditForm((f) => ({ ...f, particularName: e.target.value }))}
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
              <Label htmlFor="edit-category">Category</Label>
              <Select
                value={editForm.category}
                onValueChange={(v) => setEditForm((f) => ({ ...f, category: v }))}
              >
                <SelectTrigger id="edit-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-qty">Total Quantity</Label>
              <Input
                id="edit-qty"
                type="number"
                min="0"
                value={editForm.totalQuantity}
                onChange={(e) => setEditForm((f) => ({ ...f, totalQuantity: e.target.value }))}
              />
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
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="size-5" />
              Change History
            </DialogTitle>
            <DialogDescription>
              Audit trail of changes made to this particular item.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {historyLoading ? (
              <p className="text-muted-foreground text-sm py-4 text-center">Loading history...</p>
            ) : historyLogs.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">No history records found.</p>
            ) : (
              historyLogs.map((log) => (
                <div
                  key={log.auditLogId || log.id}
                  className="rounded-lg border p-3 text-sm space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {log.action === "CREATED" && "Created"}
                      {log.action === "UPDATED" && "Updated"}
                      {log.action === "DELETED" && "Deleted"}
                      {log.action === "ARCHIVED" && "Archived"}
                      {log.action === "RESTORED" && "Restored"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {log.createdAt
                        ? new Date(log.createdAt).toLocaleString("en-PH", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
                    </span>
                  </div>
                  <div className="text-muted-foreground">
                    <span className="font-medium text-foreground">{log.performedByName || "System"}</span>
                    {" performed "}
                    <span className="lowercase font-medium">{log.action}</span>
                  </div>
                  {log.details && (
                    <div className="bg-muted/30 rounded p-2 mt-1 text-xs text-muted-foreground font-mono">
                      {log.details}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}