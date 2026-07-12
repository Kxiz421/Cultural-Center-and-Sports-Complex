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
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  Package,
} from "lucide-react";

export default function ParticularsPage() {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [editOpen, setEditOpen] = React.useState(false);
  const [editItem, setEditItem] = React.useState(null);
  const [editForm, setEditForm] = React.useState({
    particularName: "",
    description: "",
  });
  const [confirOpen, setConfirOpen] = React.useState(false);
  const [confirmAction, setConfirmAction] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [addOpen, setAddOpen] = React.useState(false);
  const [addForm, setAddForm] = React.useState({
    particularName: "",
    description: "",
  });

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
    setAddForm({ particularName: "", description: "" });
  };

  const openEditDialog = (item) => {
    setEditItem(item);
    setEditForm({
      particularName: item.particularName,
      description: item.description || "",
    });
    setEditOpen(true);
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
      setConfirOpen(false);
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
    const hay = [item.particularName, item.description]
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
            Manage rentable equipment and amenities — add, edit, or remove particulars.
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
                <Label htmlFor="add-name">Particular Name *</Label>
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
                <Label htmlFor="add-desc">Description</Label>
                <Textarea
                  id="add-desc"
                  rows={3}
                  placeholder="Brief description of the particular item..."
                  value={addForm.description}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, description: e.target.value }))
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
              <Button
                onClick={handleAddParticular}
                disabled={saving}
              >
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
                placeholder="Search particulars..."
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
            Click the edit icon to update details, or delete to remove.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground py-8 text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground py-8 text-center">
                    {searchQuery ? "No particulars match your search" : "No particulars found. Add one to get started."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-muted-foreground text-sm">
                      {item.particularId}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Package className="size-4 text-muted-foreground shrink-0" />
                        <span className="font-medium">{item.particularName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-md truncate">
                      {item.description || "—"}
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
                            setConfirmAction({ type: "delete", item });
                            setConfirOpen(true);
                          }}
                          title="Delete particular"
                        >
                          <Trash2 className="size-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
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
              Update the name and description of this particular item.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Particular Name</Label>
              <Input
                id="edit-name"
                value={editForm.particularName}
                onChange={(e) => setEditForm((f) => ({ ...f, particularName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-desc">Description</Label>
              <Textarea
                id="edit-desc"
                rows={3}
                value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={confirOpen} onOpenChange={setConfirOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="size-5 text-red-500" />
              Delete Particular
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{confirmAction?.item?.particularName}&rdquo;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => { setConfirOpen(false); setConfirmAction(null); }}
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
    </div>
  );
}