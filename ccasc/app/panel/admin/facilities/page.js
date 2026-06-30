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
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Building2,
  Trophy,
  Pencil,
  Archive,
  RotateCcw,
  Image as ImageIcon,
  Trash2,
  X,
  Upload,
} from "lucide-react";
import { formatPhp } from "@/lib/utils";

const STATUS_OPTIONS = [
  { id: 1, name: "Available" },
  { id: 2, name: "Unavailable" },
  { id: 3, name: "Under Maintenance" },
  { id: 4, name: "Archived" },
];

const VENUE_OPTIONS = [
  { id: 1, name: "Cultural Center" },
  { id: 2, name: "Sports Complex" },
];

export default function FacilitiesPage() {
  const [facilities, setFacilities] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const [venueFilter, setVenueFilter] = React.useState("all");
  const [editOpen, setEditOpen] = React.useState(false);
  const [editFacility, setEditFacility] = React.useState(null);
  const [editForm, setEditForm] = React.useState({
    name: "",
    description: "",
    capacity: "",
    rateHourly: "",
    rateDaily: "",
    venueId: "",
    statusId: "",
    images: [],
  });
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirmAction, setConfirmAction] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [addOpen, setAddOpen] = React.useState(false);
  const [addForm, setAddForm] = React.useState({
    name: "",
    description: "",
    capacity: "",
    rateHourly: "",
    rateDaily: "",
    venueId: "",
    statusId: "1",
    images: [],
  });
  const [uploading, setUploading] = React.useState(false);
  const editFormRef = React.useRef(editForm);
  
  // Keep ref in sync with state
  React.useEffect(() => {
    editFormRef.current = editForm;
  }, [editForm]);
  
  const router = useRouter();

  const resetAddForm = () => {
    setAddForm({
      name: "",
      description: "",
      capacity: "",
      rateHourly: "",
      rateDaily: "",
      venueId: "",
      statusId: "1",
      images: [],
    });
  };

  React.useEffect(() => {
    fetchFacilities();
  }, []);

  async function fetchFacilities() {
    try {
      const res = await fetch("/api/facilities", { cache: "no-store" });
      const data = await res.json();
      setFacilities(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load facilities:", err);
      toast.error("Failed to load facilities");
    } finally {
      setLoading(false);
    }
  }

  const handleUploadImage = async (file, targetForm) => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to upload image");
      }

      const data = await res.json();

      if (targetForm === "edit") {
        setEditForm((f) => ({ ...f, images: [...f.images, data.url] }));
      } else {
        setAddForm((f) => ({ ...f, images: [...f.images, data.url] }));
      }

      toast.success("Image uploaded successfully");
    } catch (err) {
      toast.error(err.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleOpenEdit = (facility) => {
    setEditFacility(facility);
    setEditForm({
      name: facility.name || "",
      description: facility.description || "",
      capacity: facility.capacity != null ? String(facility.capacity) : "",
      rateHourly: String(facility.rateHourly || ""),
      rateDaily: String(facility.rateDaily || ""),
      venueId: String(facility.venueId || ""),
      statusId: String(facility.statusId || ""),
      images: [...(facility.images || [])],
    });
    setEditOpen(true);
  };

  const handleRemoveImage = (index) => {
    setEditForm((f) => ({
      ...f,
      images: f.images.filter((_, i) => i !== index),
    }));
  };

  const handleRemoveImageAddForm = (index) => {
    setAddForm((f) => ({
      ...f,
      images: f.images.filter((_, i) => i !== index),
    }));
  };

  const handleSaveFacility = async (snapshot) => {
    if (!editFacility) return;
    setSaving(true);
    try {
      const payload = {
        facilityId: editFacility.facilityId,
        name: snapshot.name,
        description: snapshot.description,
        capacity: snapshot.capacity,
        rateDay: snapshot.rateHourly,
        rateNight: snapshot.rateDaily,
        venueId: snapshot.venueId,
        statusId: snapshot.statusId,
        images: snapshot.images,
      };

      const res = await fetch("/api/facilities", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to update facility");
      }

      toast.success("Facility updated successfully");
      setEditOpen(false);
      setEditFacility(null);
      await fetchFacilities();
    } catch (err) {
      console.error("Save facility error:", err);
      toast.error(err.message || "Failed to update facility");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleArchive = async () => {
    if (!confirmAction?.facility) return;
    const facility = confirmAction.facility;
    const isArchived = Number(facility.statusId) === 4;
    const newStatusId = isArchived ? "1" : "4";

    setSaving(true);
    try {
      const res = await fetch("/api/facilities", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facilityId: facility.facilityId,
          statusId: newStatusId,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to update facility status");
      }

      const updated = await res.json();

      // Update local state immediately from API response
      setFacilities((prev) =>
        prev.map((f) => (f.id === updated.id ? updated : f))
      );

      toast.success(
        isArchived
          ? "Facility restored successfully"
          : "Facility archived successfully"
      );
      setConfirmOpen(false);
      setConfirmAction(null);
    } catch (err) {
      toast.error(err.message || "Failed to update facility status");
    } finally {
      setSaving(false);
    }
  };

  const handleAddFacility = async () => {
    if (!addForm.name || !addForm.venueId) {
      toast.error("Facility name and venue are required");
      return;
    }

    setSaving(true);
    try {
      const rateRes = await fetch("/api/facilities/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dayRate: addForm.rateHourly || 0,
          nightRate: addForm.rateDaily || 0,
        }),
      });

      let rateId = 1;
      if (rateRes.ok) {
        const rateData = await rateRes.json();
        rateId = rateData.rateId;
      }

      const res = await fetch("/api/facilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addForm.name,
          description: addForm.description,
          capacity: addForm.capacity || 0,
          venueId: addForm.venueId,
          rateId: String(rateId),
          statusId: addForm.statusId || "1",
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to create facility");
      }

      const newFacility = await res.json();

      if (addForm.images.length > 0) {
        await fetch("/api/facilities", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            facilityId: newFacility.facilityId,
            images: addForm.images,
          }),
        });
      }

      toast.success("Facility created successfully");
      resetAddForm();
      setAddOpen(false);
      await fetchFacilities();
    } catch (err) {
      toast.error(err.message || "Failed to create facility");
    } finally {
      setSaving(false);
    }
  };

  const getStatusName = (statusId) => {
    const s = STATUS_OPTIONS.find((o) => String(o.id) === String(statusId));
    return s ? s.name : "";
  };

  const filtered = facilities.filter((f) => {
    if (venueFilter !== "all" && String(f.venueId) !== venueFilter) return false;

    const statusLabel = getStatusName(f.statusId);
    const hay = [f.id, f.name, f.description, f.site, statusLabel]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(query.toLowerCase());
  });

  const culturalFacilities = filtered.filter((f) => f.venueId === 1);
  const sportsFacilities = filtered.filter((f) => f.venueId === 2);

  const renderFacilityTable = (facilitiesList, title, Icon, color) => {
    return (
      <Card className="flex flex-col">
        <CardHeader className={`border-b pb-3 ${color}`}>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-background">
              <Icon className="size-5" />
            </div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription>
                {facilitiesList.length} venue
                {facilitiesList.length !== 1 ? "s" : ""} available
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Facility</TableHead>
                <TableHead>Rate / hr</TableHead>
                <TableHead>Rate / day</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {facilitiesList.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground py-6"
                  >
                    No facilities in this venue
                  </TableCell>
                </TableRow>
              ) : (
                facilitiesList.map((f) => {
                  const statusName = getStatusName(f.statusId);
                  return (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">{f.name}</TableCell>
                      <TableCell className="tabular-nums">
                        {formatPhp(f.rateHourly)}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatPhp(f.rateDaily)}
                      </TableCell>
                      <TableCell>{f.capacity || "—"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            statusName === "Available"
                              ? "outline"
                              : "secondary"
                          }
                          className={
                            statusName === "Available"
                              ? "text-green-600 border-green-300"
                              : statusName === "Under Maintenance"
                                ? "text-yellow-600 border-yellow-300 bg-yellow-50"
                                : statusName === "Unavailable"
                                  ? "text-red-600"
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
                            onClick={() => handleOpenEdit(f)}
                            title="Edit facility"
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setConfirmAction({
                                type: statusName === "Archived" ? "unarchive" : "archive",
                                facility: f,
                              });
                              setConfirmOpen(true);
                            }}
                            title={
                              statusName === "Archived"
                                ? "Restore facility"
                                : "Archive facility"
                            }
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
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Facility Management
          </h2>
          <p className="text-muted-foreground text-sm">
            Manage facilities, rates, capacities, descriptions, and images across venues.
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
              Add facility
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Facility</DialogTitle>
              <DialogDescription>
                Create a new facility with rates, capacity, and images.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="add-name">Facility name *</Label>
                <Input
                  id="add-name"
                  placeholder="e.g. Main Gymnasium"
                  value={addForm.name}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-desc">Description</Label>
                <Textarea
                  id="add-desc"
                  rows={3}
                  placeholder="Amenities, floor surface, AV..."
                  value={addForm.description}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, description: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="add-capacity">Capacity (pax)</Label>
                  <Input
                    id="add-capacity"
                    type="number"
                    min="0"
                    placeholder="e.g. 500"
                    value={addForm.capacity}
                    onChange={(e) =>
                      setAddForm((f) => ({ ...f, capacity: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-venue">Venue *</Label>
                  <Select
                    value={addForm.venueId}
                    onValueChange={(v) =>
                      setAddForm((f) => ({ ...f, venueId: v }))
                    }
                  >
                    <SelectTrigger id="add-venue">
                      <SelectValue placeholder="Select venue" />
                    </SelectTrigger>
                    <SelectContent>
                      {VENUE_OPTIONS.map((v) => (
                        <SelectItem key={v.id} value={String(v.id)}>
                          {v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="add-rate-hr">Rate / hour (₱)</Label>
                  <Input
                    id="add-rate-hr"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 20000"
                    value={addForm.rateHourly}
                    onChange={(e) =>
                      setAddForm((f) => ({ ...f, rateHourly: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-rate-day">Rate / day (₱)</Label>
                  <Input
                    id="add-rate-day"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 25000"
                    value={addForm.rateDaily}
                    onChange={(e) =>
                      setAddForm((f) => ({ ...f, rateDaily: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-status">Status</Label>
                <Select
                  value={addForm.statusId}
                  onValueChange={(v) =>
                    setAddForm((f) => ({ ...f, statusId: v }))
                  }
                >
                  <SelectTrigger id="add-status">
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
              <div className="space-y-2">
                <Label>Facility Images</Label>
                {addForm.images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {addForm.images.map((img, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={img}
                          alt={`Facility image ${idx + 1}`}
                          className="h-20 w-full rounded-md border object-cover"
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImageAddForm(idx)}
                          className="absolute top-1 right-1 rounded-full bg-background/80 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="size-3 text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploading}
                    onClick={() => {
                      const input = document.getElementById("add-image-file");
                      input.click();
                    }}
                  >
                    <Upload className="mr-1 size-4" />
                    {uploading ? "Uploading..." : "Upload Image"}
                  </Button>
                  <input
                    id="add-image-file"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleUploadImage(file, "add");
                      }
                      e.target.value = "";
                    }}
                  />
                </div>
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
                onClick={() => {
                  if (!addForm.name || !addForm.venueId) {
                    toast.error("Facility name and venue are required");
                    return;
                  }
                  setConfirmAction({ type: "add" });
                  setConfirmOpen(true);
                }}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search & Filter */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Facilities Directory</CardTitle>
          <CardDescription>
            Search facilities by name, description, or status. Click the edit
            icon to update facility details.
          </CardDescription>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="text-muted-foreground absolute top-2.5 left-2 size-4" />
              <Input
                className="pl-8"
                placeholder="Search facilities..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="w-[200px]">
              <Select
                value={venueFilter}
                onValueChange={(v) => setVenueFilter(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Venues" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Venues</SelectItem>
                  <SelectItem value="1">Cultural Center</SelectItem>
                  <SelectItem value="2">Sports Complex</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Loading State */}
      {loading ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Loading facilities...</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Loading facilities...</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {renderFacilityTable(
            culturalFacilities,
            "Cultural Center",
            Building2,
            "border-l-4 border-l-blue-500"
          )}
          {renderFacilityTable(
            sportsFacilities,
            "Sports Complex",
            Trophy,
            "border-l-4 border-l-orange-500"
          )}
        </div>
      )}

      {/* Edit Facility Dialog */}
      <Dialog key={editFacility?.facilityId || 'no-edit'} open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="size-5" />
              Edit Facility
            </DialogTitle>
            <DialogDescription>
              {editFacility
                ? `${editFacility.name} — ${editFacility.site}`
                : ""}
            </DialogDescription>
          </DialogHeader>

          {editFacility && (
            <div className="grid gap-4 py-2">
              {/* Current Images Preview */}
              {editForm.images.length > 0 && (
                <div className="space-y-2">
                  <Label>Current Images</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {editForm.images.map((img, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={img}
                          alt={`Facility image ${idx + 1}`}
                          className="h-20 w-full rounded-md border object-cover"
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="absolute top-1 right-1 rounded-full bg-background/80 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="size-3 text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="edit-name">Facility name</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-desc">Description</Label>
                <Textarea
                  id="edit-desc"
                  rows={3}
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, description: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-capacity">Capacity (pax)</Label>
                  <Input
                    id="edit-capacity"
                    type="number"
                    min="0"
                    value={editForm.capacity}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, capacity: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-venue">Venue</Label>
                  <Select
                    value={editForm.venueId}
                    onValueChange={(v) =>
                      setEditForm((f) => ({ ...f, venueId: v }))
                    }
                  >
                    <SelectTrigger id="edit-venue">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VENUE_OPTIONS.map((v) => (
                        <SelectItem key={v.id} value={String(v.id)}>
                          {v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-rate-hr">Rate / hour (₱)</Label>
                  <Input
                    id="edit-rate-hr"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.rateHourly}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, rateHourly: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-rate-day">Rate / day (₱)</Label>
                  <Input
                    id="edit-rate-day"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.rateDaily}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, rateDaily: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <select
                  id="edit-status"
                  value={editForm.statusId || ""}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, statusId: e.target.value }))
                  }
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="" disabled>Select status</option>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Facility Images</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploading}
                    onClick={() => {
                      const input = document.getElementById("edit-image-file");
                      input.click();
                    }}
                  >
                    <Upload className="mr-1 size-4" />
                    {uploading ? "Uploading..." : "Upload Image"}
                  </Button>
                  <input
                    id="edit-image-file"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleUploadImage(file, "edit");
                      }
                      e.target.value = "";
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setEditOpen(false);
                setEditFacility(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                // Capture a snapshot of editForm at this moment
                setConfirmAction({ 
                  type: "save", 
                  facility: editFacility,
                  formSnapshot: { ...editForm }
                });
                setConfirmOpen(true);
              }}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {confirmAction?.type === "archive" && (
                <Archive className="size-5 text-amber-600" />
              )}
              {confirmAction?.type === "unarchive" && (
                <RotateCcw className="size-5 text-green-600" />
              )}
              {confirmAction?.type === "save" && (
                <Pencil className="size-5" />
              )}
              {confirmAction?.type === "add" && <Plus className="size-5" />}
              {confirmAction?.type === "archive" && "Archive Facility"}
              {confirmAction?.type === "unarchive" && "Restore Facility"}
              {confirmAction?.type === "save" && "Confirm Save Changes"}
              {confirmAction?.type === "add" && "Confirm Add Facility"}
            </DialogTitle>
            <DialogDescription>
              {confirmAction?.type === "archive" &&
                `Are you sure you want to archive "${confirmAction?.facility?.name}"? It will be hidden from active listings.`}
              {confirmAction?.type === "unarchive" &&
                `Are you sure you want to restore "${confirmAction?.facility?.name}"? It will become available again.`}
              {confirmAction?.type === "save" &&
                `Are you sure you want to save the changes to "${confirmAction?.facility?.name}"?`}
              {confirmAction?.type === "add" &&
                `Are you sure you want to create this new facility?`}
            </DialogDescription>
          </DialogHeader>
          {confirmAction?.type === "save" && editFacility && (
            <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name:</span>
                <span className="font-medium text-right">
                  {editForm.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rate / hr:</span>
                <span className="font-medium text-right">
                  ₱{parseFloat(editForm.rateHourly || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rate / day:</span>
                <span className="font-medium text-right">
                  ₱{parseFloat(editForm.rateDaily || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Capacity:</span>
                <span className="font-medium text-right">
                  {editForm.capacity || "0"} pax
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Images:</span>
                <span className="font-medium text-right">
                  {editForm.images.length} image(s)
                </span>
              </div>
            </div>
          )}
          {confirmAction?.type === "add" && (
            <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name:</span>
                <span className="font-medium text-right">{addForm.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Venue:</span>
                <span className="font-medium text-right">
                  {VENUE_OPTIONS.find((v) => String(v.id) === addForm.venueId)
                    ?.name || "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Capacity:</span>
                <span className="font-medium text-right">
                  {addForm.capacity || "0"} pax
                </span>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setConfirmOpen(false);
                setConfirmAction(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant={
                confirmAction?.type === "archive" ? "destructive" : "default"
              }
              onClick={() => {
                setConfirmOpen(false);
                if (confirmAction?.type === "archive" || confirmAction?.type === "unarchive") {
                  handleToggleArchive();
                } else if (confirmAction?.type === "save") {
                  handleSaveFacility(confirmAction.formSnapshot);
                } else if (confirmAction?.type === "add") {
                  handleAddFacility();
                }
                setConfirmAction(null);
              }}
              disabled={saving}
            >
              {saving
                ? "Processing..."
                : confirmAction?.type === "archive"
                  ? "Archive"
                  : confirmAction?.type === "unarchive"
                    ? "Restore"
                    : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}