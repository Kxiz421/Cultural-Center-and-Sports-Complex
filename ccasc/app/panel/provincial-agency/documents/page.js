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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Upload,
  Calendar,
  Lock,
  Eye,
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
  phaseSubmittedCount,
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
  billingStatus: null,
  receiptStatus: null,
  leaseStatus: null,
  certStatus: null,
  initialApproved: false,
  canUploadInitial: true,
  canUploadFinal: false,
  needsBilling: true,
  needsReceipt: true,
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

export default function ProvincialDocumentsPage() {
  const [documents, setDocuments] = React.useState([]);
  const [datePhases, setDatePhases] = React.useState({});
  const [selectedEventDate, setSelectedEventDate] = React.useState("");
  const [phase, setPhase] = React.useState(EMPTY_PHASE);
  const [bookingsLoading, setBookingsLoading] = React.useState(true);
  const [documentsLoading, setDocumentsLoading] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [bookings, setBookings] = React.useState([]);
  const [selectedReservationId, setSelectedReservationId] = React.useState("");
  const [viewDoc, setViewDoc] = React.useState(null);

  const [billingFile, setBillingFile] = React.useState(null);
  const [receiptFile, setReceiptFile] = React.useState(null);
  const [billingPreview, setBillingPreview] = React.useState("");
  const [receiptPreview, setReceiptPreview] = React.useState("");

  const [certFile, setCertFile] = React.useState(null);
  const [leaseFile, setLeaseFile] = React.useState(null);
  const [certPreview, setCertPreview] = React.useState("");
  const [leasePreview, setLeasePreview] = React.useState("");

  const [resubmitTypeId, setResubmitTypeId] = React.useState("");
  const [resubmitFile, setResubmitFile] = React.useState(null);
  const [resubmitPreview, setResubmitPreview] = React.useState("");

  const selectedBooking = React.useMemo(
    () =>
      bookings.find((b) => String(b.id) === String(selectedReservationId)) ||
      null,
    [bookings, selectedReservationId]
  );

  const eventDates = React.useMemo(() => {
    if (!selectedBooking) return [];
    const dates = selectedBooking.eventDates?.length
      ? selectedBooking.eventDates
      : [selectedBooking.eventDate].filter(Boolean);
    return [...new Set(dates)].sort();
  }, [selectedBooking]);

  const isMultiDate = eventDates.length > 1;
  const displayedDocuments = React.useMemo(
    () =>
      documents.filter((doc) => {
        if (!selectedEventDate) return true;
        return (doc.forEventDate || doc.eventDate) === selectedEventDate;
      }),
    [documents, selectedEventDate]
  );

  const showInitialForm =
    !phase.initialApproved && (phase.needsBilling || phase.needsReceipt);
  const requireBothInitial = phase.needsBilling && phase.needsReceipt;
  const showFinalForm =
    phase.initialApproved &&
    (phase.needsCertification || phase.needsLease);
  const requireBothFinal = phase.needsCertification && phase.needsLease;

  const declinedResubmitOptions = React.useMemo(() => {
    const options = [];
    if (phase.billingStatus === "Declined") {
      options.push({ id: "1", name: "Billing Statement" });
    }
    if (phase.receiptStatus === "Declined") {
      options.push({ id: "5", name: "Official Receipt" });
    }
    if (phase.initialApproved) {
      if (phase.certStatus === "Declined") {
        options.push({ id: "3", name: "Certification" });
      }
      if (phase.leaseStatus === "Declined") {
        options.push({ id: "2", name: "Contract of Lease" });
      }
    }
    return options;
  }, [phase]);

  React.useEffect(() => {
    async function fetchBookings() {
      try {
        const userId = localStorage.getItem("user_id");
        if (!userId) return;
        const cleanId = (userId || "").replace("CLT-", "");
        const res = await fetch("/api/ltoo/payments?bookings=true");
        const data = await res.json();
        const parsedClientId = parseInt(cleanId, 10);
        const userBookings = Array.isArray(data)
          ? data.filter(
              (b) => b.hasBooking && b.clientId === parsedClientId
            )
          : [];
        setBookings(userBookings);
      } catch (err) {
        console.error("Failed to load bookings:", err);
        toast.error("Failed to load your bookings.");
      } finally {
        setBookingsLoading(false);
      }
    }
    fetchBookings();
  }, []);

  const loadDocumentsForReservation = React.useCallback(
    async (reservationId) => {
      if (!reservationId) {
        setDocuments([]);
        setPhase(EMPTY_PHASE);
        return;
      }
      setDocumentsLoading(true);
      try {
        const clientId = getClientId();
        const params = new URLSearchParams({
          reservationId: String(reservationId),
        });
        if (clientId) params.set("clientId", clientId);

        const res = await fetch(`/api/documents?${params.toString()}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to load documents");
        }

        if (Array.isArray(data)) {
          setDocuments(data);
          setDatePhases({});
          setPhase(EMPTY_PHASE);
        } else {
          setDocuments(data.documents || []);
          setDatePhases(data.datePhases || {});
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
    },
    []
  );

  React.useEffect(() => {
    loadDocumentsForReservation(selectedReservationId);
  }, [selectedReservationId, loadDocumentsForReservation]);

  React.useEffect(() => {
    if (selectedEventDate && datePhases[selectedEventDate]) {
      setPhase({ ...EMPTY_PHASE, ...datePhases[selectedEventDate] });
    }
  }, [selectedEventDate, datePhases]);

  const resetInitialFiles = () => {
    setBillingFile(null);
    setReceiptFile(null);
    setBillingPreview("");
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

  const onPickFile = (e, setFile, setPreview, label) => {
    const selected = e.target.files?.[0];
    e.target.value = "";
    if (!selected) return;
    const error = validateImageFile(selected, label);
    if (error) {
      toast.error(error);
      return;
    }
    setFile(selected);
    readPreview(selected, setPreview);
  };

  const handleUploadInitial = async (e) => {
    e.preventDefault();
    if (!selectedReservationId) {
      toast.error("Please select a booking/reservation first.");
      return;
    }
    if (!showInitialForm) {
      toast.error(
        "Billing Statement and Official Receipt are not available for upload on this booking."
      );
      return;
    }

    if (phase.needsBilling) {
      const err = validateImageFile(billingFile, "Billing Statement");
      if (err) {
        toast.error(err);
        return;
      }
    }
    if (phase.needsReceipt) {
      const err = validateImageFile(receiptFile, "Official Receipt");
      if (err) {
        toast.error(err);
        return;
      }
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("mode", "initial");
      formData.append("reservationId", selectedReservationId);
      formData.append("clientId", getClientId());
      if (selectedEventDate) {
        formData.append("eventDate", selectedEventDate);
      }
      if (phase.needsBilling && billingFile) {
        formData.append("billingFile", billingFile);
      }
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

      toast.success(
        requireBothInitial
          ? "Billing Statement and Official Receipt submitted for LTOO review."
          : "Document submitted for LTOO review."
      );
      resetInitialFiles();
      await loadDocumentsForReservation(selectedReservationId);
    } catch (err) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleUploadFinal = async (e) => {
    e.preventDefault();
    if (!selectedReservationId) {
      toast.error("Please select a booking/reservation first.");
      return;
    }
    if (!phase.initialApproved) {
      toast.error(
        "Wait for LTOO to approve Billing Statement and Official Receipt first."
      );
      return;
    }
    if (!showFinalForm) {
      toast.error(
        "Certification and Contract of Lease are not available for upload on this booking."
      );
      return;
    }

    if (phase.needsCertification) {
      const err = validateImageFile(certFile, "Certification");
      if (err) {
        toast.error(err);
        return;
      }
    }
    if (phase.needsLease) {
      const err = validateImageFile(leaseFile, "Contract of Lease");
      if (err) {
        toast.error(err);
        return;
      }
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("mode", "final");
      formData.append("reservationId", selectedReservationId);
      formData.append("clientId", getClientId());
      if (selectedEventDate) {
        formData.append("eventDate", selectedEventDate);
      }
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
      await loadDocumentsForReservation(selectedReservationId);
    } catch (err) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleResubmit = async (e) => {
    e.preventDefault();
    if (!selectedReservationId) {
      toast.error("Please select a booking/reservation first.");
      return;
    }
    if (!resubmitTypeId) {
      toast.error("Select which declined document to resubmit.");
      return;
    }
    const label =
      declinedResubmitOptions.find((o) => o.id === resubmitTypeId)?.name ||
      "Document";
    const fileErr = validateImageFile(resubmitFile, label);
    if (fileErr) {
      toast.error(fileErr);
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("mode", "single");
      formData.append("reservationId", selectedReservationId);
      formData.append("clientId", getClientId());
      if (selectedEventDate) {
        formData.append("eventDate", selectedEventDate);
      }
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
      await loadDocumentsForReservation(selectedReservationId);
    } catch (err) {
      toast.error(err.message || "Resubmit failed");
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
    uploading ||
    (phase.needsBilling && !billingFile) ||
    (phase.needsReceipt && !receiptFile);

  const finalSubmitDisabled =
    uploading ||
    (phase.needsCertification && !certFile) ||
    (phase.needsLease && !leaseFile);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Documents</h2>
        <p className="text-muted-foreground text-sm">
          Select a booking to view and submit documents for your provincial agency reservation. Billing Statement
          and Official Receipt come first; Certification and Contract of Lease
          unlock after LTOO approval.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Booking / Reservation</CardTitle>
          <CardDescription>
            Documents are linked to a specific booking. Choose one to continue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2 max-w-xl">
            <Label htmlFor="booking-select">Booking</Label>
            <Select
              value={selectedReservationId}
              disabled={bookingsLoading}
              onValueChange={(value) => {
                setSelectedReservationId(value);
                const item = bookings.find((b) => String(b.id) === String(value));
                const dates = item?.eventDates?.length
                  ? item.eventDates
                  : [item?.eventDate].filter(Boolean);
                setSelectedEventDate(dates.length === 1 ? dates[0] : "");
                resetInitialFiles();
                resetFinalFiles();
                resetResubmit();
              }}
            >
              <SelectTrigger id="booking-select">
                <SelectValue
                  placeholder={
                    bookingsLoading
                      ? "Loading bookings..."
                      : "Select a booking/reservation"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {bookings.length === 0 && (
                  <SelectItem value="no-bookings" disabled>
                    No bookings with recorded payments found
                  </SelectItem>
                )}
                {bookings.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    {b.venue} — {b.eventDate} ({b.eventType})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedBooking && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="size-3" />
              Showing documents for {selectedBooking.venue} on{" "}
              {eventDates.length > 1
                ? eventDates.map(formatEventDateLabel).join(", ")
                : formatEventDateLabel(selectedBooking.eventDate)}
            </p>
          )}
        </CardContent>
      </Card>

      {!selectedReservationId ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Select a booking/reservation to view and upload documents.
          </CardContent>
        </Card>
      ) : (
        <>
          {isMultiDate && (
            <Card>
              <CardHeader>
                <CardTitle>Select Event Date</CardTitle>
                <CardDescription>
                  This reservation has multiple dates. Choose a date to submit
                  its own set of four documents.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {eventDates.map((date) => {
                  const count = phaseSubmittedCount(datePhases[date] || {});
                  return (
                    <Button
                      key={date}
                      type="button"
                      variant={selectedEventDate === date ? "default" : "outline"}
                      onClick={() => {
                        setSelectedEventDate(date);
                        resetInitialFiles();
                        resetFinalFiles();
                        resetResubmit();
                      }}
                      className="h-auto flex-col items-start gap-1 px-3 py-2"
                    >
                      <span>{formatEventDateLabel(date)}</span>
                      <span className="text-[11px] opacity-80">
                        {count}/4 documents
                      </span>
                    </Button>
                  );
                })}
              </CardContent>
            </Card>
          )}
          {isMultiDate && !selectedEventDate ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                Select an event date above to submit documents for that day.
              </CardContent>
            </Card>
          ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Document Progress</CardTitle>
              <CardDescription>
                Step 1: Billing Statement + Official Receipt (LTOO). Step 2
                unlocks after both are verified.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              {statusPill("Billing Statement", phase.billingStatus)}
              {statusPill("Official Receipt", phase.receiptStatus)}
              {statusPill("Certification", phase.certStatus)}
              {statusPill("Contract of Lease", phase.leaseStatus)}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                Step 1 — Billing Statement & Official Receipt
              </CardTitle>
              <CardDescription>
                {requireBothInitial
                  ? "Upload both images together. They are reviewed by the Local Treasury Operations Officer."
                  : "Upload the remaining required document(s) for LTOO review."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!showInitialForm ? (
                <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                  {phase.initialApproved
                    ? "Both documents are verified. You can proceed to Step 2."
                    : "These documents are already pending review for this booking."}
                </div>
              ) : (
                <form onSubmit={handleUploadInitial} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {phase.needsBilling && (
                      <div className="space-y-2">
                        <Label htmlFor="billing-file">Billing Statement</Label>
                        <Input
                          id="billing-file"
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          onChange={(e) =>
                            onPickFile(
                              e,
                              setBillingFile,
                              setBillingPreview,
                              "Billing Statement"
                            )
                          }
                        />
                        {billingPreview && (
                          <div className="relative h-40 overflow-hidden rounded-md border bg-muted/20">
                            <img
                              src={billingPreview}
                              alt="Billing Statement preview"
                              className="h-full w-full object-contain"
                            />
                          </div>
                        )}
                      </div>
                    )}
                    {phase.needsReceipt && (
                      <div className="space-y-2">
                        <Label htmlFor="receipt-file">Official Receipt</Label>
                        <Input
                          id="receipt-file"
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          onChange={(e) =>
                            onPickFile(
                              e,
                              setReceiptFile,
                              setReceiptPreview,
                              "Official Receipt"
                            )
                          }
                        />
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
                    )}
                  </div>
                  <Button type="submit" disabled={initialSubmitDisabled}>
                    <Upload className="mr-2 size-4" />
                    {uploading
                      ? "Uploading..."
                      : requireBothInitial
                        ? "Upload Both Documents"
                        : "Upload Document"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {!phase.initialApproved && (
                  <Lock className="size-4 text-muted-foreground" />
                )}
                Step 2 — Certification & Contract of Lease
              </CardTitle>
              <CardDescription>
                Available after LTOO verifies both Billing Statement and
                Official Receipt.
                {requireBothFinal ? " Upload both together." : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!phase.initialApproved ? (
                <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground flex items-start gap-2">
                  <Lock className="size-4 mt-0.5 shrink-0" />
                  Locked until LTOO approves Billing Statement and Official
                  Receipt for this booking.
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
                          onChange={(e) =>
                            onPickFile(
                              e,
                              setCertFile,
                              setCertPreview,
                              "Certification"
                            )
                          }
                        />
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
                          onChange={(e) =>
                            onPickFile(
                              e,
                              setLeaseFile,
                              setLeasePreview,
                              "Contract of Lease"
                            )
                          }
                        />
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
                        onValueChange={setResubmitTypeId}
                      >
                        <SelectTrigger id="resubmit-type">
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
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="resubmit-file">Corrected Image</Label>
                      <Input
                        id="resubmit-file"
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        onChange={(e) =>
                          onPickFile(
                            e,
                            setResubmitFile,
                            setResubmitPreview,
                            "Resubmission"
                          )
                        }
                      />
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
                  {selectedEventDate
                    ? `No documents submitted for ${formatEventDateLabel(selectedEventDate)} yet.`
                    : "No documents submitted for this booking yet."}
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
                            Submitted:{" "}
                            {doc.submittedAt
                              ? new Date(doc.submittedAt).toLocaleDateString()
                              : "—"}
                          </p>
                          {doc.remarks && (
                            <p className="text-xs text-red-500 mt-1">
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
