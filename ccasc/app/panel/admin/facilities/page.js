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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
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
import { Pagination } from "@/components/pagination";
import {
  FacilityDetailsDialog,
  isDisplayableImage,
} from "@/components/facility-details-dialog";
import { uploadFacilityImage } from "@/lib/upload-facility-image";

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

const PAGE_SIZE = 10;

export default function FacilitiesPage() {
  const [facilities, setFacilities] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const [activeTab, setActiveTab] = React.useState("cultural");
  const [culturalPage, setCulturalPage] = React.useState(1);
  const [sportsPage, setSportsPage] = React.useState(1);
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
  const [facilityDetails, setFacilityDetails] = React.useState(null);
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

  const handleUploadImages = async (files, targetForm) => {
    const list = Array.from(files || []);
    if (list.length === 0) return;
    setUploading(true);
    try {
      const uploaded = [];
      for (const file of list) {
        uploaded.push(await uploadFacilityImage(file));
      }

      if (targetForm === "edit") {
        setEditForm((f) => ({ ...f, images: [...f.images, ...uploaded] }));
      } else {
        setAddForm((f) => ({ ...f, images: [...f.images, ...uploaded] }));
      }

      toast.success(
        uploaded.length > 1
          ? `${uploaded.length} images uploaded successfully`
          : "Image uploaded successfully"
      );
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
      images: (facility.images || []).filter(isDisplayableImage),
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

  const findDuplicateFacility = (name, venueId, excludeFacilityId = null) => {
    const normalized = String(name || "").trim().toLowerCase();
    if (!normalized || venueId === "" || venueId == null) return null;
    return (
      facilities.find(
        (f) =>
          String(f.venueId) === String(venueId) &&
          String(f.facilityId) !== String(excludeFacilityId) &&
          String(f.name || "").trim().toLowerCase() === normalized
      ) || null
    );
  };

  const handleAddFacility = async () => {
    if (!addForm.name || !addForm.venueId) {
      toast.error("Facility name and venue are required");
      return;
    }
    if (findDuplicateFacility(addForm.name, addForm.venueId)) {
      toast.error(
        "A facility with this name already exists in the selected venue."
      );
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
    const statusLabel = getStatusName(f.statusId);
    const hay = [f.id, f.name, f.description, f.site, statusLabel]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(query.toLowerCase());
  });

  const culturalFacilities = filtered.filter((f) => f.venueId === 1);
  const sportsFacilities = filtered.filter((f) => f.venueId === 2);

  const handleSearchChange = (value) => {
    setQuery(value);
    setCulturalPage(1);
    setSportsPage(1);
  };

  const renderFacilityTable = (facilitiesList, title, Icon, color, hideCapacity, page, setPage) => {
    const totalPages = Math.max(1, Math.ceil(facilitiesList.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const list = facilitiesList.slice(
      (safePage - 1) * PAGE_SIZE,
      safePage * PAGE_SIZE
    );
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
                <TableHead>Day Rate</TableHead>
                {!hideCapacity && <TableHead>Night Rate</TableHead>}
                {!hideCapacity && <TableHead>Capacity</TableHead>}
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {facilitiesList.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={hideCapacity ? 4 : 6}
                    className="text-center text-muted-foreground py-6"
                  >
                    No facilities in this venue
                  </TableCell>
                </TableRow>
              ) : (
                list.map((f) => {
                  const statusName = getStatusName(f.statusId);
                  const thumb = (f.images || []).find(isDisplayableImage);
                  return (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {thumb && (
                            <button
                              type="button"
                              onClick={() => setFacilityDetails(f)}
                              title="View facility images"
                              className="size-8 shrink-0 cursor-zoom-in overflow-hidden rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <img
                                src={thumb}
                                alt={f.name}
                                className="size-8 object-cover"
                                onError={(event) => {
                                  event.currentTarget.style.display = "none";
                                }}
                              />
                            </button>
                          )}
                          <span>{f.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatPhp(f.rateHourly)}
                      </TableCell>
                      {!hideCapacity && (
                        <TableCell className="tabular-nums">
                          {formatPhp(f.rateDaily)}
                        </TableCell>
                      )}
                      {!hideCapacity && <TableCell>{f.capacity || "—"}</TableCell>}
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
          <Pagination
            page={safePage}
            pageSize={PAGE_SIZE}
            total={facilitiesList.length}
            onPageChange={setPage}
            itemLabel="facilities"
            className="px-4 pb-2"
          />
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
                {addForm.venueId !== "2" && (
                <div className="space-y-2">
                  <Label htmlFor="add-capacity">Capacity (pax)</Label>
                  <Input
                    id="add-capacity"
                    type="number"
                    min="0"
                    max="99999"
                    placeholder="e.g. 500"
                    value={addForm.capacity}
                    onChange={(e) =>
                      setAddForm((f) => ({ ...f, capacity: e.target.value.slice(0, 5) }))
                    }
                  />
                </div>
                )}
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
                  <Label htmlFor="add-rate-hr">Day Rate (₱)</Label>
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
                {addForm.venueId !== "2" && (
                <div className="space-y-2">
                  <Label htmlFor="add-rate-day">Night Rate (₱)</Label>
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
                )}
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
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      handleUploadImages(e.target.files, "add");
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
                  if (findDuplicateFacility(addForm.name, addForm.venueId)) {
                    toast.error(
                      "A facility with this name already exists in the selected venue."
                    );
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
            Search facilities by name, description, or status. Switch tabs to
            manage each venue separately.
          </CardDescription>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="text-muted-foreground absolute top-2.5 left-2 size-4" />
              <Input
                className="pl-8"
                placeholder="Search facilities..."
                value={query}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Venue Tabs */}
      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading facilities...</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList>
            <TabsTrigger value="cultural">
              <Building2 className="size-4" />
              Cultural Center ({culturalFacilities.length})
            </TabsTrigger>
            <TabsTrigger value="sports">
              <Trophy className="size-4" />
              Sports Complex ({sportsFacilities.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="cultural">
            {renderFacilityTable(
              culturalFacilities,
              "Cultural Center",
              Building2,
              "border-l-4 border-l-blue-500",
              false,
              culturalPage,
              setCulturalPage
            )}
          </TabsContent>
          <TabsContent value="sports">
            {renderFacilityTable(
              sportsFacilities,
              "Sports Complex",
              Trophy,
              "border-l-4 border-l-orange-500",
              true,
              sportsPage,
              setSportsPage
            )}
          </TabsContent>
        </Tabs>
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
              {editForm.venueId !== "2" && (
                <div className="space-y-2">
                  <Label htmlFor="edit-capacity">Capacity (pax)</Label>
                  <Input
                    id="edit-capacity"
                    type="number"
                    min="0"
                    max="99999"
                    value={editForm.capacity}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, capacity: e.target.value.slice(0, 5) }))
                    }
                  />
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-rate-hr">Day Rate (₱)</Label>
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
                {editForm.venueId !== "2" && (
                <div className="space-y-2">
                  <Label htmlFor="edit-rate-day">Night Rate (₱)</Label>
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
                )}
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
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      handleUploadImages(e.target.files, "edit");
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
                if (!String(editForm.name || "").trim()) {
                  toast.error("Facility name is required");
                  return;
                }
                const nameChanged =
                  String(editForm.name || "").trim().toLowerCase() !==
                  String(editFacility?.name || "").trim().toLowerCase();
                if (
                  nameChanged &&
                  findDuplicateFacility(
                    editForm.name,
                    editFacility?.venueId,
                    editFacility?.facilityId
                  )
                ) {
                  toast.error(
                    "A facility with this name already exists in the selected venue."
                  );
                  return;
                }
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
                <span className="text-muted-foreground">Day Rate:</span>
                <span className="font-medium text-right">
                  ₱{parseFloat(editForm.rateHourly || 0).toLocaleString()}
                </span>
              </div>
              {editFacility?.venueId !== 2 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Night Rate:</span>
                <span className="font-medium text-right">
                  ₱{parseFloat(editForm.rateDaily || 0).toLocaleString()}
                </span>
              </div>
              )}
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

      {/* Facility Images / Details Viewer */}
      <FacilityDetailsDialog
        facility={facilityDetails}
        open={!!facilityDetails}
        onOpenChange={(open) => {
          if (!open) setFacilityDetails(null);
        }}
      />
    </div>
  );
}