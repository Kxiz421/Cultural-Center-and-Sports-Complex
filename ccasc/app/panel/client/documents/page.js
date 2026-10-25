"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Upload,
  Calendar,
  Eye,
  Search,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  formatEventDateLabel,
} from "@/lib/document-event-date";

const VALID_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/jpg",
];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const EMPTY_PHASE = {
  isSportsComplex: false,
  receiptStatus: null,
  leaseStatus: null,
  certStatus: null,
  needsReceipt: false,
  needsLease: false,
  needsCertification: false,
};

function validateImageFile(file, label) {
  if (!file) return `${label} is required.`;
  if (!VALID_IMAGE_TYPES.includes(file.type)) {
    return `${label}: only JPEG, PNG, GIF, and WebP images are allowed.`;
  }
  if (file.size > MAX_FILE_SIZE) {
    return `${label}: file size must be 5MB or less.`;
  }
  return null;
}

const FILE_ERROR_FIELDS = [
  ["Official Receipt", "receiptFile"],
  ["Certification", "certFile"],
  ["Contract of Lease", "leaseFile"],
  ["Document", "resubmitFile"],
];

function fileErrorField(message) {
  const match = FILE_ERROR_FIELDS.find(([label]) =>
    String(message).startsWith(`${label}:`)
  );
  return match ? { [match[1]]: message } : null;
}

function readPreview(file, setter) {
  if (!file) {
    setter("");
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => setter(e.target.result);
  reader.readAsDataURL(file);
}

function statusBadgeClass(status) {
  if (status === "Verified") return "text-green-600 border-green-300";
  if (status === "Declined") return "text-red-600 border-red-300";
  if (status === "Pending") return "text-yellow-600 border-yellow-300";
  return "text-muted-foreground border-border";
}

function getClientId() {
  return localStorage.getItem("user_id")?.replace("CLT-", "") || "";
}

function docStatus(doc) {
  return doc?.status || doc?.documentStatus || "Pending";
}

export default function ClientDocumentsPage() {
  const [documents, setDocuments] = React.useState([]);
  const [phase, setPhase] = React.useState(EMPTY_PHASE);
  const [bookingsLoading, setBookingsLoading] = React.useState(true);
  const [documentsLoading, setDocumentsLoading] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [bookings, setBookings] = React.useState([]);
  const [selectedKey, setSelectedKey] = React.useState("");
  const [paymentStatusByRes, setPaymentStatusByRes] = React.useState({});
  const [searchQuery, setSearchQuery] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [viewDoc, setViewDoc] = React.useState(null);

  const [receiptFile, setReceiptFile] = React.useState(null);
  const [receiptPreview, setReceiptPreview] = React.useState("");

  const [certFile, setCertFile] = React.useState(null);
  const [leaseFile, setLeaseFile] = React.useState(null);
  const [certPreview, setCertPreview] = React.useState("");
  const [leasePreview, setLeasePreview] = React.useState("");

  const [resubmitTypeId, setResubmitTypeId] = React.useState("");
  const [resubmitFile, setResubmitFile] = React.useState(null);
  const [resubmitPreview, setResubmitPreview] = React.useState("");

  const [errors, setErrors] = React.useState({});

  const clearError = (...names) =>
    setErrors((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const name of names) {
        if (next[name]) {
          delete next[name];
          changed = true;
        }
      }
      return changed ? next : prev;
    });

  const selectedItem = React.useMemo(
    () => bookings.find((b) => String(b.id) === String(selectedKey)) || null,
    [bookings, selectedKey]
  );

  const eventDates = React.useMemo(() => {
    if (!selectedItem) return [];
    const dates = selectedItem.eventDates?.length
      ? selectedItem.eventDates
      : [selectedItem.eventDate].filter(Boolean);
    return [...new Set(dates)].sort();
  }, [selectedItem]);

  const displayedDocuments = documents;

  const filteredTargets = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return bookings.filter((item) => {
      if (typeFilter !== "all" && item.recordType !== typeFilter) return false;
      if (!q) return true;
      const hay = [
        item.recordType,
        item.venue,
        item.eventType,
        item.eventDate,
        ...(item.eventDates || []),
        item.reservationId != null ? `reservation ${item.reservationId}` : "",
        item.bookingId != null ? `booking ${item.bookingId}` : "",
        item.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [bookings, searchQuery, typeFilter]);

  const showInitialForm = phase.isSportsComplex && phase.needsReceipt;
  const selectedPaidInFull =
    paymentStatusByRes[Number(selectedItem?.reservationId)] === "BalanceSettled";
  // Cultural Center: Certification & Contract of Lease stay locked until the
  // Provincial Treasurer's Office records the full payment.
  const finalUploadLocked =
    Boolean(selectedItem) && !phase.isSportsComplex && !selectedPaidInFull;
  const showFinalForm =
    !phase.isSportsComplex &&
    (phase.needsCertification || phase.needsLease) &&
    selectedPaidInFull;
  const requireBothFinal = phase.needsCertification && phase.needsLease;

  const declinedResubmitOptions = React.useMemo(() => {
    const options = [];
    if (phase.isSportsComplex) {
      if (phase.receiptStatus === "Declined") {
        options.push({ id: "5", name: "Official Receipt" });
      }
      return options;
    }
    if (phase.certStatus === "Declined") {
      options.push({ id: "3", name: "Certification" });
    }
    if (phase.leaseStatus === "Declined") {
      options.push({ id: "2", name: "Contract of Lease" });
    }
    return options;
  }, [phase]);

  React.useEffect(() => {
    async function fetchBookings() {
      try {
        const userId = localStorage.getItem("user_id");
        if (!userId) return;
        const cleanId = (userId || "").replace("CLT-", "");
        const params = new URLSearchParams({
          eligibleBookings: "true",
          clientId: cleanId,
        });
        const [res, resRes] = await Promise.all([
          fetch(`/api/documents?${params.toString()}`),
          fetch(`/api/reservations?clientId=${cleanId}`),
        ]);
        const data = await res.json();
        const resData = await resRes.json();
        setBookings(Array.isArray(data) ? data : []);
        if (Array.isArray(resData)) {
          const map = {};
          for (const r of resData) {
            const num = Number(String(r.id).replace(/^RES-/i, ""));
            if (Number.isFinite(num)) map[num] = r.paymentStatus || "Pending";
          }
          setPaymentStatusByRes(map);
        }
      } catch (err) {
        console.error("Failed to load bookings:", err);
        toast.error("Failed to load your bookings.");
      } finally {
        setBookingsLoading(false);
      }
    }
    fetchBookings();
  }, []);

  const loadDocumentsForReservation = React.useCallback(async (item) => {
    if (!item?.reservationId) {
      setDocuments([]);
      setPhase(EMPTY_PHASE);
      return;
    }
    setDocumentsLoading(true);
    try {
      const clientId = getClientId();
      const params = new URLSearchParams({
        reservationId: String(item.reservationId),
      });
      if (item.bookingId) {
        params.set("bookingId", String(item.bookingId));
      }
      if (clientId) params.set("clientId", clientId);

      const res = await fetch(`/api/documents?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load documents");
      }

      if (Array.isArray(data)) {
        setDocuments(data);
        setPhase(EMPTY_PHASE);
      } else {
        setDocuments(data.documents || []);
        setPhase({ ...EMPTY_PHASE, ...(data.phase || {}) });
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to load documents");
      setDocuments([]);
      setPhase(EMPTY_PHASE);
    } finally {
      setDocumentsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadDocumentsForReservation(selectedItem);
  }, [selectedItem, loadDocumentsForReservation]);

  const resetInitialFiles = () => {
    setReceiptFile(null);
    setReceiptPreview("");
  };

  const resetFinalFiles = () => {
    setCertFile(null);
    setLeaseFile(null);
    setCertPreview("");
    setLeasePreview("");
  };

  const resetResubmit = () => {
    setResubmitTypeId("");
    setResubmitFile(null);
    setResubmitPreview("");
  };

  function selectTarget(item) {
    setSelectedKey(item.id);
    resetInitialFiles();
    resetFinalFiles();
    resetResubmit();
    setErrors({});
  }

  const onPickFile = (e, setFile, setPreview, label, errorKey) => {
    const selected = e.target.files?.[0];
    e.target.value = "";
    if (!selected) return;
    const error = validateImageFile(selected, label);
    if (error) {
      setErrors((prev) => ({ ...prev, [errorKey]: error }));
      return;
    }
    clearError(errorKey);
    setFile(selected);
    readPreview(selected, setPreview);
  };

  const handleUploadInitial = async (e) => {
    e.preventDefault();
    if (!showInitialForm) {
      toast.error(
        "Official Receipt is not available for upload on this booking."
      );
      return;
    }

    const next = {};
    if (!selectedItem) {
      next.reservation = "Please select a booking or reservation first.";
    }
    if (phase.needsReceipt) {
      const err = validateImageFile(receiptFile, "Official Receipt");
      if (err) next.receiptFile = err;
    }
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    setErrors({});

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("mode", "initial");
      formData.append("reservationId", String(selectedItem.reservationId));
      if (selectedItem.bookingId) {
        formData.append("bookingId", String(selectedItem.bookingId));
      }
      formData.append("clientId", getClientId());
      if (phase.needsReceipt && receiptFile) {
        formData.append("receiptFile", receiptFile);
      }

      const res = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit documents");
      }

      toast.success("Official Receipt submitted for review.");
      resetInitialFiles();
      await loadDocumentsForReservation(selectedItem);
    } catch (err) {
      const message = err.message || "Upload failed";
      const fieldError = fileErrorField(message);
      if (fieldError) {
        setErrors((prev) => ({ ...prev, ...fieldError }));
      } else {
        toast.error(message);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleUploadFinal = async (e) => {
    e.preventDefault();
    if (!selectedPaidInFull) {
      toast.error(
        "Certification and Contract of Lease can only be uploaded once your reservation is fully paid."
      );
      return;
    }
    if (!showFinalForm) {
      toast.error(
        "Certification and Contract of Lease are not available for upload on this booking."
      );
      return;
    }

    const next = {};
    if (!selectedItem) {
      next.reservation = "Please select a booking or reservation first.";
    }
    if (phase.needsCertification) {
      const err = validateImageFile(certFile, "Certification");
      if (err) next.certFile = err;
    }
    if (phase.needsLease) {
      const err = validateImageFile(leaseFile, "Contract of Lease");
      if (err) next.leaseFile = err;
    }
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    setErrors({});

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("mode", "final");
      formData.append("reservationId", String(selectedItem.reservationId));
      if (selectedItem.bookingId) {
        formData.append("bookingId", String(selectedItem.bookingId));
      }
      formData.append("clientId", getClientId());
      if (phase.needsCertification && certFile) {
        formData.append("certificationFile", certFile);
      }
      if (phase.needsLease && leaseFile) {
        formData.append("leaseFile", leaseFile);
      }

      const res = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit documents");
      }

      toast.success(
        requireBothFinal
          ? "Certification and Contract of Lease submitted for review."
          : "Document submitted for review."
      );
      resetFinalFiles();
      await loadDocumentsForReservation(selectedItem);
    } catch (err) {
      const message = err.message || "Upload failed";
      const fieldError = fileErrorField(message);
      if (fieldError) {
        setErrors((prev) => ({ ...prev, ...fieldError }));
      } else {
        toast.error(message);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleResubmit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!selectedItem) {
      next.reservation = "Please select a booking or reservation first.";
    }
    if (!resubmitTypeId) {
      next.resubmitTypeId = "Select which declined document to resubmit.";
    }
    const label =
      declinedResubmitOptions.find((o) => o.id === resubmitTypeId)?.name ||
      "Document";
    const fileErr = validateImageFile(resubmitFile, label);
    if (fileErr) next.resubmitFile = fileErr;
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    setErrors({});

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("mode", "single");
      formData.append("reservationId", String(selectedItem.reservationId));
      if (selectedItem.bookingId) {
        formData.append("bookingId", String(selectedItem.bookingId));
      }
      formData.append("clientId", getClientId());
      formData.append("documentTypeId", resubmitTypeId);
      formData.append("file", resubmitFile);

      const res = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to resubmit document");
      }

      toast.success(`${label} resubmitted for review.`);
      resetResubmit();
      await loadDocumentsForReservation(selectedItem);
    } catch (err) {
      const message = err.message || "Resubmit failed";
      const fieldError = fileErrorField(message);
      if (fieldError) {
        setErrors((prev) => ({ ...prev, ...fieldError }));
      } else {
        toast.error(message);
      }
    } finally {
      setUploading(false);
    }
  };

  const getStatusIcon = (status) => {
    if (status === "Verified")
      return <CheckCircle className="size-4 text-green-600" />;
    if (status === "Declined")
      return <XCircle className="size-4 text-red-600" />;
    if (status === "Pending")
      return <Clock className="size-4 text-yellow-600" />;
    return <Clock className="size-4 text-muted-foreground" />;
  };

  const statusPill = (label, status) => (
    <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <Badge variant="outline" className={statusBadgeClass(status)}>
        {status || "Not submitted"}
      </Badge>
    </div>
  );

  const initialSubmitDisabled =
    uploading || (phase.needsReceipt && !receiptFile);

  const finalSubmitDisabled =
    uploading ||
    (phase.needsCertification && !certFile) ||
    (phase.needsLease && !leaseFile);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Documents</h2>
        <p className="text-muted-foreground text-sm">
          Select a reservation or booking to submit your documents: the
          Certification and Contract of Lease for the Cultural Center, or the
          Official Receipt for the Sports Complex.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Booking / Reservation</CardTitle>
          <CardDescription>
            Choose a reservation (before payment is recorded) or a booking (after
            LTOO records payment). Each selection tracks its own four-document
            set.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="target-search">Search</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                id="target-search"
                placeholder="Search by venue, event, date, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
                disabled={bookingsLoading}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={typeFilter === "all" ? "default" : "outline"}
              onClick={() => setTypeFilter("all")}
            >
              All
            </Button>
            <Button
              type="button"
              size="sm"
              variant={typeFilter === "reservation" ? "default" : "outline"}
              onClick={() => setTypeFilter("reservation")}
            >
              Reservations
            </Button>
            <Button
              type="button"
              size="sm"
              variant={typeFilter === "booking" ? "default" : "outline"}
              onClick={() => setTypeFilter("booking")}
            >
              Bookings
            </Button>
          </div>

          <div className="rounded-md border">
            {bookingsLoading ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Loading reservations and bookings...
              </p>
            ) : filteredTargets.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                {bookings.length === 0
                  ? "No reservations or bookings found."
                  : "No matches for your search or filter."}
              </p>
            ) : (
              <ul className="max-h-64 divide-y overflow-y-auto">
                {filteredTargets.map((item) => {
                  const isSelected = String(selectedKey) === String(item.id);
                  const dateLabel =
                    item.eventDates?.length > 1
                      ? item.eventDates.join(", ")
                      : item.eventDate;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => selectTarget(item)}
                        className={cn(
                          "flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-muted/50",
                          isSelected && "bg-muted"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="size-4 shrink-0 text-muted-foreground" />
                            <span className="font-medium truncate">
                              {item.eventType}
                            </span>
                            <Badge variant="outline" className="text-xs shrink-0">
                              {item.recordType === "booking"
                                ? "Booking"
                                : "Reservation"}
                            </Badge>
                          </div>
                          {isSelected && (
                            <Badge className="shrink-0">Selected</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {item.venue} · {dateLabel}
                          {item.bookingId
                            ? ` · Booking #${item.bookingId}`
                            : ` · Reservation #${item.reservationId}`}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <FieldError>{errors.reservation}</FieldError>

          <p className="text-xs text-muted-foreground">
            {filteredTargets.length} result(s)
            {typeFilter !== "all" ? ` · ${typeFilter}s only` : ""}
          </p>

          {selectedItem && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="size-3" />
              {selectedItem.recordType === "booking" ? "Booking" : "Reservation"}
              {selectedItem.bookingId ? ` #${selectedItem.bookingId}` : ""}
              {" · "}
              {selectedItem.venue}
              {" · "}
              {selectedItem.eventDates?.length > 1
                ? selectedItem.eventDates.map(formatEventDateLabel).join(", ")
                : formatEventDateLabel(selectedItem.eventDate)}
            </p>
          )}
        </CardContent>
      </Card>

      {!selectedItem ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Select a booking or reservation to view and upload documents.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Document Progress</CardTitle>
              <CardDescription>
                {phase.isSportsComplex
                  ? "Submit the Official Receipt for review."
                  : "Submit your Certification and Contract of Lease. A multi-date reservation shares one document set."}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              {phase.isSportsComplex ? (
                statusPill("Official Receipt", phase.receiptStatus)
              ) : (
                <>
                  {statusPill("Certification", phase.certStatus)}
                  {statusPill("Contract of Lease", phase.leaseStatus)}
                </>
              )}
            </CardContent>
          </Card>

          {phase.isSportsComplex && (
            <Card>
              <CardHeader>
                <CardTitle>Upload Official Receipt</CardTitle>
                <CardDescription>
                  {showInitialForm
                    ? "Upload the Official Receipt for review."
                    : "Official Receipt already submitted or pending review."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!showInitialForm ? (
                  <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                    Official Receipt is already submitted or pending review.
                  </div>
                ) : (
                  <form onSubmit={handleUploadInitial} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="receipt-file">Official Receipt</Label>
                      <Input
                        id="receipt-file"
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        aria-invalid={Boolean(errors.receiptFile)}
                        onChange={(e) =>
                          onPickFile(
                            e,
                            setReceiptFile,
                            setReceiptPreview,
                            "Official Receipt",
                            "receiptFile"
                          )
                        }
                      />
                      <FieldError>{errors.receiptFile}</FieldError>
                      {receiptPreview && (
                        <div className="relative h-40 overflow-hidden rounded-md border bg-muted/20">
                          <img
                            src={receiptPreview}
                            alt="Official Receipt preview"
                            className="h-full w-full object-contain"
                          />
                        </div>
                      )}
                    </div>
                    <Button type="submit" disabled={initialSubmitDisabled}>
                      <Upload className="mr-2 size-4" />
                      {uploading ? "Uploading..." : "Upload Official Receipt"}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          )}

          {!phase.isSportsComplex && (
            <Card>
              <CardHeader>
                <CardTitle>Certification &amp; Contract of Lease</CardTitle>
                <CardDescription>
                  {finalUploadLocked
                    ? "Locked until your reservation is fully paid at the Provincial Treasurer's Office."
                    : `Upload your Certification and Contract of Lease.${
                        requireBothFinal ? " Upload both together." : ""
                      }`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {finalUploadLocked ? (
                  <div className="rounded-md border border-dashed bg-muted/30 p-6 text-sm text-muted-foreground">
                    Locked. Certification and Contract of Lease can be uploaded
                    once the Provincial Treasurer&apos;s Office records your full
                    payment.
                  </div>
                ) : !showFinalForm ? (
                <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                  Certification and Contract of Lease are already pending review
                  or verified for this booking.
                </div>
              ) : (
                <form onSubmit={handleUploadFinal} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {phase.needsCertification && (
                      <div className="space-y-2">
                        <Label htmlFor="cert-file">Certification</Label>
                        <Input
                          id="cert-file"
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          aria-invalid={Boolean(errors.certFile)}
                          onChange={(e) =>
                            onPickFile(
                              e,
                              setCertFile,
                              setCertPreview,
                              "Certification",
                              "certFile"
                            )
                          }
                        />
                        <FieldError>{errors.certFile}</FieldError>
                        {certPreview && (
                          <div className="relative h-40 overflow-hidden rounded-md border bg-muted/20">
                            <img
                              src={certPreview}
                              alt="Certification preview"
                              className="h-full w-full object-contain"
                            />
                          </div>
                        )}
                      </div>
                    )}
                    {phase.needsLease && (
                      <div className="space-y-2">
                        <Label htmlFor="lease-file">Contract of Lease</Label>
                        <Input
                          id="lease-file"
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          aria-invalid={Boolean(errors.leaseFile)}
                          onChange={(e) =>
                            onPickFile(
                              e,
                              setLeaseFile,
                              setLeasePreview,
                              "Contract of Lease",
                              "leaseFile"
                            )
                          }
                        />
                        <FieldError>{errors.leaseFile}</FieldError>
                        {leasePreview && (
                          <div className="relative h-40 overflow-hidden rounded-md border bg-muted/20">
                            <img
                              src={leasePreview}
                              alt="Contract of Lease preview"
                              className="h-full w-full object-contain"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <Button type="submit" disabled={finalSubmitDisabled}>
                    <Upload className="mr-2 size-4" />
                    {uploading
                      ? "Uploading..."
                      : requireBothFinal
                        ? "Upload Both Documents"
                        : "Upload Document"}
                  </Button>
                </form>
              )}
              </CardContent>
            </Card>
          )}

          {declinedResubmitOptions.length > 0 &&
            !showInitialForm &&
            !showFinalForm && (
              <Card>
                <CardHeader>
                  <CardTitle>Resubmit Declined Document</CardTitle>
                  <CardDescription>
                    One or more documents were declined. Upload a corrected
                    image for the selected type.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form
                    onSubmit={handleResubmit}
                    className="space-y-4 max-w-xl"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="resubmit-type">Document Type</Label>
                      <Select
                        value={resubmitTypeId}
                        onValueChange={(value) => {
                          setResubmitTypeId(value);
                          clearError("resubmitTypeId");
                        }}
                      >
                        <SelectTrigger
                          id="resubmit-type"
                          aria-invalid={Boolean(errors.resubmitTypeId)}
                        >
                          <SelectValue placeholder="Select declined document" />
                        </SelectTrigger>
                        <SelectContent>
                          {declinedResubmitOptions.map((opt) => (
                            <SelectItem key={opt.id} value={opt.id}>
                              {opt.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FieldError>{errors.resubmitTypeId}</FieldError>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="resubmit-file">Corrected Image</Label>
                      <Input
                        id="resubmit-file"
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        aria-invalid={Boolean(errors.resubmitFile)}
                        onChange={(e) =>
                          onPickFile(
                            e,
                            setResubmitFile,
                            setResubmitPreview,
                            "Resubmission",
                            "resubmitFile"
                          )
                        }
                      />
                      <FieldError>{errors.resubmitFile}</FieldError>
                      {resubmitPreview && (
                        <div className="relative h-40 overflow-hidden rounded-md border bg-muted/20">
                          <img
                            src={resubmitPreview}
                            alt="Resubmission preview"
                            className="h-full w-full object-contain"
                          />
                        </div>
                      )}
                    </div>
                    <Button
                      type="submit"
                      disabled={
                        uploading || !resubmitTypeId || !resubmitFile
                      }
                    >
                      <Upload className="mr-2 size-4" />
                      {uploading ? "Uploading..." : "Resubmit Document"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

          <Card>
            <CardHeader>
              <CardTitle>Submitted Documents</CardTitle>
              <CardDescription>
                Documents linked to the selected booking/reservation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {documentsLoading ? (
                <div className="text-center text-muted-foreground py-8">
                  Loading documents...
                </div>
              ) : displayedDocuments.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No documents submitted for this booking yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {displayedDocuments.map((doc) => {
                    const status = docStatus(doc);
                    return (
                    <div
                      key={doc.id ?? doc.documentId}
                      className="flex items-center justify-between rounded-lg border p-4 gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="size-5 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {doc.type}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            For:{" "}
                            {eventDates.length
                              ? eventDates.map(formatEventDateLabel).join(", ")
                              : formatEventDateLabel(
                                  doc.forEventDate || doc.eventDate
                                )}
                            {" · "}
                            Submitted:{" "}
                            {doc.submittedAt
                              ? new Date(doc.submittedAt).toLocaleDateString()
                              : "—"}
                          </p>
                          {doc.remarks && (
                            <p
                              className={`text-xs mt-1 ${
                                status === "Declined"
                                  ? "text-red-500"
                                  : "text-muted-foreground"
                              }`}
                            >
                              Remarks: {doc.remarks}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant="outline"
                          className={statusBadgeClass(status)}
                        >
                          {status}
                        </Badge>
                        {getStatusIcon(status)}
                        {doc.filePath && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => setViewDoc(doc)}
                            title="View document"
                          >
                            <Eye className="size-4" />
                            View
                          </Button>
                        )}
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog
        open={viewDoc !== null}
        onOpenChange={(open) => {
          if (!open) setViewDoc(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewDoc?.type || "Document"}</DialogTitle>
            <DialogDescription>
              {viewDoc?.submittedAt
                ? `Submitted ${new Date(viewDoc.submittedAt).toLocaleString()}`
                : "Submitted document preview"}
              {viewDoc && (
                <>
                  {" · "}
                  Status: {docStatus(viewDoc)}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {viewDoc?.filePath ? (
            <div className="rounded-md border bg-muted/20 p-2">
              <img
                src={viewDoc.filePath}
                alt={viewDoc.type || "Document"}
                className="mx-auto max-h-[65vh] w-full object-contain"
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No preview available for this document.
            </p>
          )}
          {viewDoc?.remarks && (
            <p className="text-sm text-red-600 bg-red-50 rounded-md p-3">
              Remarks: {viewDoc.remarks}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setViewDoc(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
