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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Archive, RotateCcw, History, Package as PackageIcon } from "lucide-react";

function formatPHP(amount) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount || 0);
}

const STATUS_OPTIONS = [
  { id: 1, name: "Available" },
  { id: 2, name: "Unavailable" },
  { id: 3, name: "Under Maintenance" },
  { id: 4, name: "Archived" },
];

const TIME_SLOTS = [
  { id: 1, label: "Day (8:00 AM — 5:00 PM)" },
  { id: 2, label: "Night (5:00 PM — 11:00 PM)" },
];

export default function PackagesPage() {
  const [packages, setPackages] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editPkg, setEditPkg] = React.useState(null);
  const [editForm, setEditForm] = React.useState({
    packageName: "",
    description: "",
    dayRate: "",
    nightRate: "",
    ledWallDayRate: "",
    ledWallNightRate: "",
  });
  const [editSelections, setEditSelections] = React.useState({});
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirmAction, setConfirmAction] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [addOpen, setAddOpen] = React.useState(false);
  const [addForm, setAddForm] = React.useState({
    packageName: "",
    description: "",
    dayRate: "",
    nightRate: "",
    ledWallDayRate: "",
    ledWallNightRate: "",
    timeSlotId: "",
  });
  const [addSelections, setAddSelections] = React.useState({});
  const [allParticulars, setAllParticulars] = React.useState([]);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [historyLogs, setHistoryLogs] = React.useState([]);
  const [historyLoading, setHistoryLoading] = React.useState(false);
  const [addPkgConfirmOpen, setAddPkgConfirmOpen] = React.useState(false);

  const resetAddForm = () => {
    setAddForm({
      packageName: "", description: "", dayRate: "", nightRate: "",
      ledWallDayRate: "", ledWallNightRate: "", timeSlotId: "",
    });
    setAddSelections({});
  };

  // Fetch available particulars for inclusion checkboxes
  React.useEffect(() => {
    async function loadParticulars() {
      try {
        const res = await fetch("/api/particulars");
        const data = await res.json();
        if (Array.isArray(data)) {
          // Show all available particulars regardless of linked inventory
          const available = data.filter((item) => Number(item.statusId) === 1);
          setAllParticulars(available);
        }
      } catch (err) {
        console.error("Failed to load particulars:", err);
      }
    }
    loadParticulars();
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    async function loadPackages() {
      try {
        setLoading(true);
        const res = await fetch("/api/packages");
        const data = await res.json();
        if (!cancelled) setPackages(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) console.error("Failed to load packages:", err);
        if (!cancelled) toast.error("Failed to load packages");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadPackages();
    return () => { cancelled = true; };
  }, []);

  const openEditDialog = (pkg) => {
    setEditPkg(pkg);
    setEditForm({
      packageName: pkg.packageName || "",
      description: pkg.description || "",
      dayRate: pkg.dayRate != null ? String(pkg.dayRate) : "",
      nightRate: pkg.nightRate != null ? String(pkg.nightRate) : "",
      ledWallDayRate: pkg.ledWallDayRate != null ? String(pkg.ledWallDayRate) : "",
      ledWallNightRate: pkg.ledWallNightRate != null ? String(pkg.ledWallNightRate) : "",
    });

    // Map inclusions by matching inclusion itemId to the particular's itemId
    const selections = {};
    for (const inc of pkg.inclusions || []) {
      // Find the particular that has this itemId
      const match = allParticulars.find((p) => p.itemId === inc.itemId);
      if (match) {
        // Key by particularId so checkboxes light up correctly
        selections[match.particularId] = String(inc.quantityAvailable);
      } else {
        // Fallback: use itemId directly if no match found
        selections[inc.itemId] = String(inc.quantityAvailable);
      }
    }
    setEditSelections(selections);
    setEditOpen(true);
  };

  const handleOpenHistory = async () => {
    setHistoryOpen(true);
    setHistoryLoading(true);
    setHistoryLogs([]);
    try {
      const res = await fetch(`/api/audit-logs?targetUserIdPrefix=PKG-`);
      if (!res.ok) throw new Error("Failed to fetch history");
      const data = await res.json();
      setHistoryLogs(data);
    } catch (err) {
      toast.error("Failed to load history");
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSavePackage = async () => {
    if (!editPkg) return;
    setSaving(true);
    try {
      const performedBy = typeof window !== "undefined" ? localStorage.getItem("user_id") || "" : "";
      const performedByName = typeof window !== "undefined" ? localStorage.getItem("user_name") || "" : "";

      const inclusions = Object.entries(editSelections)
        .filter(([particularId, qty]) => qty && parseInt(qty, 10) > 0)
        .map(([particularId, qty]) => {
          const particular = allParticulars.find((p) => p.particularId === parseInt(particularId, 10));
          return {
            itemId: particular?.itemId ? parseInt(particular.itemId, 10) : parseInt(particularId, 10),
            quantityAvailable: parseInt(qty, 10),
          };
        })
        .filter((inc) => inc.itemId > 0);

      const res = await fetch("/api/packages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: editPkg.packageId,
          packageName: editForm.packageName.trim(),
          description: editForm.description.trim(),
          dayRate: editForm.dayRate || null,
          nightRate: editForm.nightRate || null,
          ledWallDayRate: editForm.ledWallDayRate || null,
          ledWallNightRate: editForm.ledWallNightRate || null,
          inclusions,
          performedBy,
          performedByName,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to update package");
      }

      toast.success("Package updated successfully");
      setConfirmOpen(false);
      setEditOpen(false);
      setEditPkg(null);
      const refreshRes = await fetch("/api/packages");
      const refreshData = await refreshRes.json();
      setPackages(Array.isArray(refreshData) ? refreshData : []);
    } catch (err) {
      toast.error(err.message || "Failed to update package");
    } finally {
      setSaving(false);
    }
  };

  const handleAddPackage = async () => {
    if (!addForm.packageName.trim()) {
      toast.error("Package name is required");
      return;
    }
    setSaving(true);
    try {
      const performedBy = typeof window !== "undefined" ? localStorage.getItem("user_id") || "" : "";
      const performedByName = typeof window !== "undefined" ? localStorage.getItem("user_name") || "" : "";

      const inclusions = Object.entries(addSelections)
        .filter(([particularId, qty]) => qty && parseInt(qty, 10) > 0)
        .map(([particularId, qty]) => {
          const particular = allParticulars.find((p) => p.particularId === parseInt(particularId, 10));
          return {
            itemId: particular?.itemId ? parseInt(particular.itemId, 10) : parseInt(particularId, 10),
            quantityAvailable: parseInt(qty, 10),
          };
        })
        .filter((inc) => inc.itemId > 0);

      const res = await fetch("/api/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageName: addForm.packageName.trim(),
          description: addForm.description.trim(),
          dayRate: addForm.dayRate || null,
          nightRate: addForm.nightRate || null,
          ledWallDayRate: addForm.ledWallDayRate || null,
          ledWallNightRate: addForm.ledWallNightRate || null,
          timeSlotId: addForm.timeSlotId || "1",
          inclusions,
          performedBy,
          performedByName,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to create package");
      }

      toast.success("Package created successfully");
      resetAddForm();
      setAddOpen(false);
      const refreshRes = await fetch("/api/packages");
      const refreshData = await refreshRes.json();
      setPackages(Array.isArray(refreshData) ? refreshData : []);
    } catch (err) {
      toast.error(err.message || "Failed to create package");
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
      const res = await fetch("/api/packages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: item.packageId,
          statusId: newStatusId,
          performedBy,
          performedByName,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to update status");
      }

      toast.success(isArchived ? "Package restored successfully" : "Package archived successfully");
      setConfirmOpen(false);
      setConfirmAction(null);
      const refreshRes = await fetch("/api/packages");
      const refreshData = await refreshRes.json();
      setPackages(Array.isArray(refreshData) ? refreshData : []);
    } catch (err) {
      toast.error(err.message || "Failed to update status");
    } finally {
      setSaving(false);
    }
  };

  const toggleItem = (itemId, selections, setSelections) => {
    setSelections((prev) => {
      const next = { ...prev };
      if (next[itemId]) {
        delete next[itemId];
      } else {
        // Default quantity from the particular's totalQuantity
        const particular = allParticulars.find((p) => p.particularId === itemId);
        next[itemId] = String(particular?.totalQuantity || "1");
      }
      return next;
    });
  };

  const handleQtyChange = (itemId, value, setSelections) => {
    setSelections((prev) => ({
      ...prev,
      [itemId]: value.replace(/\D/g, "").slice(0, 5),
    }));
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Packages Management</h2>
          <p className="text-muted-foreground text-sm">
            Bundle particulars into priced offerings for clients. Add, edit, archive, or restore packages.
          </p>
        </div>
        <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) resetAddForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 size-4" />Add Package</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Package</DialogTitle>
              <DialogDescription>Create a new package with rates, description, and selected inclusions.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="add-name">Package Name *</Label>
                <Input id="add-name" placeholder="e.g. Standard Day Package" value={addForm.packageName} onChange={(e) => setAddForm((f) => ({ ...f, packageName: e.target.value.replace(/[^a-zA-Z\s]/g, "").slice(0, 35) }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-desc">Description</Label>
                <Textarea id="add-desc" rows={2} placeholder="Brief description of the package..." value={addForm.description} onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="add-day">Day Rate (₱)</Label>
                  <Input id="add-day" type="text" inputMode="numeric" placeholder="e.g. 55000" value={addForm.dayRate} onChange={(e) => setAddForm((f) => ({ ...f, dayRate: e.target.value.replace(/\D/g, "").slice(0, 5) }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-night">Night Rate (₱)</Label>
                  <Input id="add-night" type="text" inputMode="numeric" placeholder="e.g. 60000" value={addForm.nightRate} onChange={(e) => setAddForm((f) => ({ ...f, nightRate: e.target.value.replace(/\D/g, "").slice(0, 5) }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="add-led-day">LED Wall Day (₱)</Label>
                  <Input id="add-led-day" type="text" inputMode="numeric" placeholder="e.g. 80000" value={addForm.ledWallDayRate} onChange={(e) => setAddForm((f) => ({ ...f, ledWallDayRate: e.target.value.replace(/\D/g, "").slice(0, 5) }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-led-night">LED Wall Night (₱)</Label>
                  <Input id="add-led-night" type="text" inputMode="numeric" placeholder="e.g. 85000" value={addForm.ledWallNightRate} onChange={(e) => setAddForm((f) => ({ ...f, ledWallNightRate: e.target.value.replace(/\D/g, "").slice(0, 5) }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-timeslot">Time Slot</Label>
                <Select value={addForm.timeSlotId} onValueChange={(v) => setAddForm((f) => ({ ...f, timeSlotId: v }))}>
                  <SelectTrigger id="add-timeslot"><SelectValue placeholder="Select time slot" /></SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map((ts) => (
                      <SelectItem key={ts.id} value={String(ts.id)}>{ts.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Inclusions with Checkboxes */}
              <div className="space-y-2">
                <Label>Inclusions</Label>
                <div className="rounded-lg border bg-muted/30 p-3 text-sm max-h-48 overflow-y-auto space-y-2">
                  {allParticulars.length === 0 ? (
                    <p className="text-muted-foreground text-xs">No available particulars found.</p>
                  ) : (
                    allParticulars.map((p) => {
                      const incKey = p.particularId;
                      const isSelected = !!addSelections[incKey];
                      return (
                        <div key={incKey} className="flex items-center gap-2">
                          <Checkbox
                            id={`add-inc-${incKey}`}
                            checked={isSelected}
                            onCheckedChange={() => toggleItem(incKey, addSelections, setAddSelections)}
                          />
                          <Label htmlFor={`add-inc-${incKey}`} className="flex-1 cursor-pointer text-sm">
                            {p.particularName}
                          </Label>
                          {isSelected && (
                            <Input
                              type="text"
                              inputMode="numeric"
                              className="w-20 h-8 text-xs"
                              placeholder="Qty"
                              value={addSelections[incKey]}
                              onChange={(e) => handleQtyChange(incKey, e.target.value, setAddSelections)}
                            />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { resetAddForm(); setAddOpen(false); }}>Cancel</Button>
              <Button onClick={() => setAddPkgConfirmOpen(true)} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Catalog</CardTitle>
          <CardDescription>Click the edit icon to update package details, rates, and inclusions. Use archive/restore to manage availability.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Package</TableHead>
                <TableHead className="text-right">Day Rate</TableHead>
                <TableHead className="text-right">Night Rate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Time Slot</TableHead>
                <TableHead>Inclusions</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground py-8 text-center">Loading...</TableCell>
                </TableRow>
              ) : packages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground py-8 text-center">No packages found. Add one to get started.</TableCell>
                </TableRow>
              ) : (
                packages.map((pkg) => {
                  const statusName = STATUS_OPTIONS.find((s) => s.id === Number(pkg.statusId))?.name || "Unknown";
                  return (
                    <TableRow key={pkg.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <PackageIcon className="size-4 text-muted-foreground shrink-0" />
                          <div>
                            <span className="font-medium">{pkg.packageName}</span>
                            {pkg.description && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">{pkg.description}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{pkg.dayRate ? formatPHP(pkg.dayRate) : "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{pkg.nightRate ? formatPHP(pkg.nightRate) : "—"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={statusName === "Available" ? "outline" : "secondary"}
                          className={statusName === "Available" ? "text-green-600 border-green-300" : statusName === "Archived" ? "text-muted-foreground" : ""}
                        >
                          {statusName}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{pkg.timeSlot}</TableCell>
                      <TableCell className="text-sm max-w-[150px]">
                        <ul className="list-inside list-disc text-xs">
                          {pkg.inclusions.map((inc, i) => (
                            <li key={i}>{inc.itemName} (x{inc.quantityAvailable})</li>
                          ))}
                          {pkg.inclusions.length === 0 && <li className="list-none text-muted-foreground">None</li>}
                        </ul>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(pkg)} title="Edit package">
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost" size="sm"
                            onClick={() => {
                              setConfirmAction({ type: statusName === "Archived" ? "unarchive" : "archive", item: pkg });
                              setConfirmOpen(true);
                            }}
                            title={statusName === "Archived" ? "Restore package" : "Archive package"}
                          >
                            {statusName === "Archived" ? <RotateCcw className="size-4 text-green-600" /> : <Archive className="size-4 text-amber-600" />}
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
      <Dialog key={editPkg?.packageId || "no-edit"} open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Package</DialogTitle>
            <DialogDescription>Update package name, description, rate details, and inclusions.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Package Name</Label>
              <Input id="edit-name" value={editForm.packageName} onChange={(e) => setEditForm((f) => ({ ...f, packageName: e.target.value.replace(/[^a-zA-Z\s]/g, "").slice(0, 35) }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-desc">Description</Label>
              <Textarea id="edit-desc" rows={2} value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-day">Day Rate (₱)</Label>
                <Input id="edit-day" type="text" inputMode="numeric" value={editForm.dayRate} onChange={(e) => setEditForm((f) => ({ ...f, dayRate: e.target.value.replace(/\D/g, "").slice(0, 5) }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-night">Night Rate (₱)</Label>
                <Input id="edit-night" type="text" inputMode="numeric" value={editForm.nightRate} onChange={(e) => setEditForm((f) => ({ ...f, nightRate: e.target.value.replace(/\D/g, "").slice(0, 5) }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-led-day">LED Wall Day (₱)</Label>
                <Input id="edit-led-day" type="text" inputMode="numeric" value={editForm.ledWallDayRate} onChange={(e) => setEditForm((f) => ({ ...f, ledWallDayRate: e.target.value.replace(/\D/g, "").slice(0, 5) }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-led-night">LED Wall Night (₱)</Label>
                <Input id="edit-led-night" type="text" inputMode="numeric" value={editForm.ledWallNightRate} onChange={(e) => setEditForm((f) => ({ ...f, ledWallNightRate: e.target.value.replace(/\D/g, "").slice(0, 5) }))} />
              </div>
            </div>

            {/* Inclusions with Checkboxes */}
            <div className="space-y-2">
              <Label>Inclusions</Label>
              <div className="rounded-lg border bg-muted/30 p-3 text-sm max-h-48 overflow-y-auto space-y-2">
                {allParticulars.length === 0 ? (
                  <p className="text-muted-foreground text-xs">No available particulars found.</p>
                ) : (
                  allParticulars.map((p) => {
                    const incKey = p.particularId;
                    const isSelected = !!editSelections[incKey];
                    return (
                      <div key={incKey} className="flex items-center gap-2">
                        <Checkbox
                          id={`edit-inc-${incKey}`}
                          checked={isSelected}
                          onCheckedChange={() => toggleItem(incKey, editSelections, setEditSelections)}
                        />
                        <Label htmlFor={`edit-inc-${incKey}`} className="flex-1 cursor-pointer text-sm">
                          {p.particularName}
                        </Label>
                        {isSelected && (
                          <Input
                            type="text"
                            inputMode="numeric"
                            className="w-20 h-8 text-xs"
                            placeholder="Qty"
                            value={editSelections[incKey]}
                            onChange={(e) => handleQtyChange(incKey, e.target.value, setEditSelections)}
                          />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditOpen(false); setEditPkg(null); }}>Cancel</Button>
            <Button onClick={() => { setConfirmAction({ type: "save", item: editPkg }); setConfirmOpen(true); }} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive/Restore Confirmation */}
      <Dialog open={confirmOpen && (confirmAction?.type === "archive" || confirmAction?.type === "unarchive")} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {confirmAction?.type === "archive" ? <Archive className="size-5 text-amber-600" /> : <RotateCcw className="size-5 text-green-600" />}
              {confirmAction?.type === "archive" ? "Archive Package" : "Restore Package"}
            </DialogTitle>
            <DialogDescription>
              {confirmAction?.type === "archive"
                ? `Are you sure you want to archive "${confirmAction?.item?.packageName}"? It will be hidden from active listings.`
                : `Are you sure you want to restore "${confirmAction?.item?.packageName}"? It will become available again.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setConfirmOpen(false); setConfirmAction(null); }}>Cancel</Button>
            <Button variant={confirmAction?.type === "archive" ? "destructive" : "default"} onClick={handleToggleArchive} disabled={saving}>
              {saving ? "Processing..." : confirmAction?.type === "archive" ? "Archive" : "Restore"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Package Confirmation */}
      <Dialog open={addPkgConfirmOpen} onOpenChange={setAddPkgConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="size-5" />Confirm Add Package</DialogTitle>
            <DialogDescription>Are you sure you want to create this package?</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name:</span>
              <span className="font-medium text-right">{addForm.packageName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Time Slot:</span>
              <span className="font-medium text-right">{TIME_SLOTS.find(ts => ts.id === parseInt(addForm.timeSlotId || "1"))?.label || "Day"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Inclusions:</span>
              <span className="font-medium text-right">
                {Object.keys(addSelections).filter((k) => addSelections[k] && parseInt(addSelections[k]) > 0).length || 0} items
              </span>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddPkgConfirmOpen(false)}>Cancel</Button>
            <Button onClick={() => { setAddPkgConfirmOpen(false); handleAddPackage(); }} disabled={saving}>
              {saving ? "Saving..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Confirmation */}
      <Dialog open={confirmOpen && confirmAction?.type === "save"} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Pencil className="size-5" />Confirm Save Changes</DialogTitle>
            <DialogDescription>Are you sure you want to save the changes to &ldquo;{editPkg?.packageName}&rdquo;?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button onClick={handleSavePackage} disabled={saving}>{saving ? "Saving..." : "Confirm"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><History className="size-5" />Package History</DialogTitle>
            <DialogDescription>View all package changes performed by admins</DialogDescription>
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
                    {log.action === "CREATED" && <PackageIcon className="size-4 text-blue-500" />}
                    {log.action === "UPDATED" && <Pencil className="size-4 text-blue-500" />}
                    {log.action === "ARCHIVED" && <Archive className="size-4 text-amber-600" />}
                    {log.action === "RESTORED" && <RotateCcw className="size-4 text-green-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className={
                        log.action === "CREATED" ? "text-blue-600 border-blue-300" :
                        log.action === "UPDATED" ? "text-blue-600 border-blue-300" :
                        log.action === "ARCHIVED" ? "text-amber-600 border-amber-300" :
                        "text-green-600 border-green-300"
                      }>{log.action}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.createdAt).toLocaleDateString("en-US", {
                          year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
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
                    {log.details && <p className="text-xs text-muted-foreground mt-1 italic">{log.details}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* History Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button onClick={handleOpenHistory} className="shadow-lg" size="lg">
          <History className="mr-2 size-5" />History
        </Button>
      </div>
    </div>
  );
}