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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Pencil } from "lucide-react";

function formatPHP(amount) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount || 0);
}

export default function PackagesPage() {
  const [packages, setPackages] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editPkg, setEditPkg] = React.useState(null);
  const [editForm, setEditForm] = React.useState({
    packageName: "",
    dayRate: "",
    nightRate: "",
    ledWallDayRate: "",
    ledWallNightRate: "",
  });
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

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
      dayRate: pkg.dayRate != null ? String(pkg.dayRate) : "",
      nightRate: pkg.nightRate != null ? String(pkg.nightRate) : "",
      ledWallDayRate: pkg.ledWallDayRate != null ? String(pkg.ledWallDayRate) : "",
      ledWallNightRate: pkg.ledWallNightRate != null ? String(pkg.ledWallNightRate) : "",
    });
    setEditOpen(true);
  };

  const handleSavePackage = async () => {
    if (!editPkg) return;
    setSaving(true);
    try {
      const res = await fetch("/api/packages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: editPkg.packageId,
          packageName: editForm.packageName.trim(),
          dayRate: editForm.dayRate || null,
          nightRate: editForm.nightRate || null,
          ledWallDayRate: editForm.ledWallDayRate || null,
          ledWallNightRate: editForm.ledWallNightRate || null,
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
      // Re-fetch packages
      const refreshRes = await fetch("/api/packages");
      const refreshData = await refreshRes.json();
      setPackages(Array.isArray(refreshData) ? refreshData : []);
    } catch (err) {
      toast.error(err.message || "Failed to update package");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Packages Management
        </h2>
        <p className="text-muted-foreground text-sm">
          Bundle particulars into priced offerings for clients. Click a package to edit its details.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Catalog</CardTitle>
          <CardDescription>
            Click the edit icon to update package details and rates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Package</TableHead>
                <TableHead className="text-right">Day Rate</TableHead>
                <TableHead className="text-right">Night Rate</TableHead>
                <TableHead className="text-right">LED Wall Day</TableHead>
                <TableHead className="text-right">LED Wall Night</TableHead>
                <TableHead>Time Slot</TableHead>
                <TableHead>Inclusions</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-muted-foreground py-8 text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : packages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-muted-foreground py-8 text-center">
                    No packages found
                  </TableCell>
                </TableRow>
              ) : (
                packages.map((pkg) => (
                  <TableRow
                    key={pkg.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => openEditDialog(pkg)}
                  >
                    <TableCell>
                      <div className="font-medium">{pkg.packageName}</div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {pkg.dayRate ? formatPHP(pkg.dayRate) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {pkg.nightRate ? formatPHP(pkg.nightRate) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {pkg.ledWallDayRate ? formatPHP(pkg.ledWallDayRate) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {pkg.ledWallNightRate ? formatPHP(pkg.ledWallNightRate) : "—"}
                    </TableCell>
                    <TableCell className="text-sm">{pkg.timeSlot}</TableCell>
                    <TableCell className="text-sm max-w-[200px]">
                      <ul className="list-inside list-disc text-xs">
                        {pkg.inclusions.map((inc, i) => (
                          <li key={i}>
                            {inc.itemName} (x{inc.quantityAvailable})
                          </li>
                        ))}
                        {pkg.inclusions.length === 0 && (
                          <li className="list-none text-muted-foreground">None</li>
                        )}
                      </ul>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditDialog(pkg);
                        }}
                        title="Edit package"
                      >
                        <Pencil className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog key={editPkg?.packageId || "no-edit"} open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Package</DialogTitle>
            <DialogDescription>
              Update package name and rate details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Package Name</Label>
              <Input
                id="edit-name"
                value={editForm.packageName}
                onChange={(e) => setEditForm((f) => ({ ...f, packageName: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-day">Day Rate (₱)</Label>
                <Input
                  id="edit-day"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.dayRate}
                  onChange={(e) => setEditForm((f) => ({ ...f, dayRate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-night">Night Rate (₱)</Label>
                <Input
                  id="edit-night"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.nightRate}
                  onChange={(e) => setEditForm((f) => ({ ...f, nightRate: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-led-day">LED Wall Day (₱)</Label>
                <Input
                  id="edit-led-day"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.ledWallDayRate}
                  onChange={(e) => setEditForm((f) => ({ ...f, ledWallDayRate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-led-night">LED Wall Night (₱)</Label>
                <Input
                  id="edit-led-night"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.ledWallNightRate}
                  onChange={(e) => setEditForm((f) => ({ ...f, ledWallNightRate: e.target.value }))}
                />
              </div>
            </div>
            {editPkg && editPkg.inclusions && editPkg.inclusions.length > 0 && (
              <div className="space-y-2">
                <Label>Inclusions</Label>
                <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
                  {editPkg.inclusions.map((inc, i) => (
                    <div key={i} className="flex justify-between">
                      <span>{inc.itemName}</span>
                      <span className="text-muted-foreground">x{inc.quantityAvailable}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditOpen(false); setEditPkg(null); }}>
              Cancel
            </Button>
            <Button onClick={() => setConfirmOpen(true)} disabled={saving}>
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
              <Pencil className="size-5" />
              Confirm Save Changes
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to save the changes to &ldquo;{editPkg?.packageName}&rdquo;?
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Package:</span>
              <span className="font-medium">{editForm.packageName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Day Rate:</span>
              <span className="font-medium">{editForm.dayRate ? formatPHP(editForm.dayRate) : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Night Rate:</span>
              <span className="font-medium">{editForm.nightRate ? formatPHP(editForm.nightRate) : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">LED Wall Day:</span>
              <span className="font-medium">{editForm.ledWallDayRate ? formatPHP(editForm.ledWallDayRate) : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">LED Wall Night:</span>
              <span className="font-medium">{editForm.ledWallNightRate ? formatPHP(editForm.ledWallNightRate) : "—"}</span>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePackage} disabled={saving}>
              {saving ? "Saving..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}