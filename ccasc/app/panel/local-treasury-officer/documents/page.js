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
import { Pagination } from "@/components/pagination";
import { toast } from "sonner";
import { formatEventDateLabel } from "@/lib/document-event-date";
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
import {
  FileText,
  FileCheck2,
  Search,
  Eye,
  Download,
  CheckCircle2,
  Clock,
  XCircle,
  User,
  Building2,
  ShieldCheck,
  ShieldX,
} from "lucide-react";

function StatusBadge({ status }) {
  const value = status || "Pending";
  return (
    <Badge
      variant="outline"
      className={
        value === "Verified"
          ? "text-green-600 border-green-300"
          : value === "Declined"
            ? "text-red-600 border-red-300"
            : "text-amber-600 border-amber-300"
      }
    >
      {value}
    </Badge>
  );
}

function StatusIcon({ status }) {
  if (status === "Verified") return <CheckCircle2 className="size-4 text-green-500" />;
  if (status === "Declined") return <XCircle className="size-4 text-red-500" />;
  return <Clock className="size-4 text-amber-500" />;
}

const PAGE_SIZE = 10;

export default function LTOODocumentsPage() {
  const [reservations, setReservations] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [clientTypeFilter, setClientTypeFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [selectedGroup, setSelectedGroup] = React.useState(null);
  const [actionDoc, setActionDoc] = React.useState(null);
  const [verifyConfirmOpen, setVerifyConfirmOpen] = React.useState(false);
  const [declineConfirmOpen, setDeclineConfirmOpen] = React.useState(false);
  const [declineRemarks, setDeclineRemarks] = React.useState("");
  const [physicalTarget, setPhysicalTarget] = React.useState(null);
  const [physicalConfirmOpen, setPhysicalConfirmOpen] = React.useState(false);

  const loadDocuments = React.useCallback(async (keepGroupId = null) => {
    const res = await fetch("/api/ltoo/documents");
    const data = await res.json();
    const list = Array.isArray(data) ? data : [];
    setReservations(list);
    if (keepGroupId) {
      setSelectedGroup(list.find((group) => group.id === keepGroupId) || null);
    }
    return list;
  }, []);

  React.useEffect(() => {
    async function load() {
      try {
        await loadDocuments();
      } catch (err) {
        console.error("Failed to load documents:", err);
        toast.error("Failed to load documents");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [loadDocuments]);

  const handleVerify = async () => {
    if (!actionDoc) return;
    try {
      const res = await fetch("/api/documents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: actionDoc.documentId,
          status: "Verified",
        }),
      });
      if (!res.ok) throw new Error("Failed to verify document");
      toast.success(`${actionDoc.documentType || "Document"} verified`);
      setVerifyConfirmOpen(false);
      setActionDoc(null);
      await loadDocuments(selectedGroup?.id);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDecline = async () => {
    if (!actionDoc || !declineRemarks.trim()) return;
    try {
      const res = await fetch("/api/documents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: actionDoc.documentId,
          status: "Declined",
          remarks: declineRemarks.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed to decline document");
      toast.success(`${actionDoc.documentType || "Document"} declined`);
      setDeclineConfirmOpen(false);
      setActionDoc(null);
      setDeclineRemarks("");
      await loadDocuments(selectedGroup?.id);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleVerifyPhysical = async () => {
    if (!physicalTarget) return;
    try {
      const res = await fetch("/api/ltoo/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reservationId: physicalTarget.reservationId,
          bookingId: physicalTarget.bookingId,
          documentTypeId: physicalTarget.documentTypeId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to verify physical document");
      }
      toast.success(
        data.initialApproved
          ? "Physical documents verified. The client can now submit the Certification and Contract of Lease."
          : `${physicalTarget.label} verified (physical copy).`
      );
      setPhysicalConfirmOpen(false);
      setPhysicalTarget(null);
      await loadDocuments(selectedGroup?.id);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const filteredReservations = reservations.filter((group) => {
    if (clientTypeFilter !== "all" && group.clientType !== clientTypeFilter) {
      return false;
    }
    if (statusFilter !== "all" && group.documentStatus !== statusFilter) {
      return false;
    }
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const dateLabels = (group.eventDates || [])
      .map((date) => formatEventDateLabel(date).toLowerCase())
      .join(" ");
    return (
      group.clientName?.toLowerCase().includes(q) ||
      group.eventType?.toLowerCase().includes(q) ||
      group.venue?.toLowerCase().includes(q) ||
      String(group.reservationId || "").includes(q) ||
      group.eventDate?.toLowerCase().includes(q) ||
      dateLabels.includes(q) ||
      formatEventDateLabel(group.eventDate).toLowerCase().includes(q)
    );
  });

  React.useEffect(() => {
    setPage(1);
  }, [search, clientTypeFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredReservations.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedReservations = filteredReservations.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const renderDocumentCard = (doc, label, typeId) => {
    if (!doc) {
      return (
        <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
          <div>
            <p className="text-sm font-medium">{label}</p>
            <p className="text-xs text-muted-foreground">Not submitted yet.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-blue-600 border-blue-300 hover:bg-blue-50"
            onClick={() => {
              const rawId = String(selectedGroup?.id || "");
              const reservationId =
                selectedGroup?.reservationId ??
                (rawId.startsWith("res-") ? Number(rawId.slice(4)) : null);
              const bookingId = selectedGroup?.bookingId ?? null;
              if (!reservationId && !bookingId) {
                toast.error(
                  "This document is not linked to a reservation, so it cannot be verified as a physical copy."
                );
                return;
              }
              setPhysicalTarget({
                reservationId,
                bookingId,
                documentTypeId: typeId,
                label,
              });
              setPhysicalConfirmOpen(true);
            }}
          >
            <FileCheck2 className="mr-1 size-4" />
            Verify Physical Copy
          </Button>
        </div>
      );
    }

    return (
      <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium">{doc.documentType || label}</p>
            <div className="mt-1 flex items-center gap-1">
              <StatusIcon status={doc.documentStatus} />
              <StatusBadge status={doc.documentStatus} />
            </div>
          </div>
          {doc.filePath && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(doc.filePath, "_blank")}
              title={`View ${label}`}
            >
              <Download className="size-4" />
            </Button>
          )}
        </div>
        {doc.filePath && (
          <div className="relative h-48 overflow-hidden rounded-md border bg-background">
            <img
              src={doc.filePath}
              alt={label}
              className="h-full w-full object-contain"
            />
          </div>
        )}
        {doc.remarks && (
          <p className="text-xs text-muted-foreground">Remarks: {doc.remarks}</p>
        )}
        {doc.documentStatus !== "Verified" && (
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 border-red-300 hover:bg-red-50"
              onClick={() => {
                setActionDoc({ ...doc, documentType: doc.documentType || label });
                setDeclineConfirmOpen(true);
              }}
              disabled={doc.documentStatus === "Declined"}
            >
              <ShieldX className="mr-1 size-4" />
              Decline
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-green-600 border-green-300 hover:bg-green-50"
              onClick={() => {
                setActionDoc({ ...doc, documentType: doc.documentType || label });
                setVerifyConfirmOpen(true);
              }}
            >
              <ShieldCheck className="mr-1 size-4" />
              Verify
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Documents</h2>
        <p className="text-muted-foreground text-sm">
          Review each reservation&apos;s Billing Statement and Official Receipt together.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Submitted Reservations</CardTitle>
          <CardDescription>
            One row per reservation. Open a row to review both required documents.
          </CardDescription>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="text-muted-foreground absolute top-2.5 left-2 size-4" />
              <Input
                className="pl-8"
                placeholder="Search by client, reservation, or event..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-[180px]">
              <Select value={clientTypeFilter} onValueChange={setClientTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="provincial">Provincial Agency</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-[180px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Verified">Verified</SelectItem>
                  <SelectItem value="Declined">Declined</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Reservation</TableHead>
                <TableHead>Documents</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground py-8 text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredReservations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground py-8 text-center">
                    No reservations with submitted documents.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedReservations.map((group) => {
                  const billingStatus =
                    group.billingStatement?.documentStatus || "Pending";
                  const receiptStatus =
                    group.officialReceipt?.documentStatus || "Pending";
                  return (
                    <TableRow key={group.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {group.clientType === "provincial" ? (
                            <Building2 className="size-4 text-muted-foreground" />
                          ) : (
                            <User className="size-4 text-muted-foreground" />
                          )}
                          <span className="font-medium">{group.clientName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {group.clientType === "provincial" ? "Provincial" : "Client"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        <p className="font-medium">
                          {group.reservationId ? `RES-${group.reservationId}` : "Reservation"}
                        </p>
                        {group.eventType && (
                          <p className="text-xs text-muted-foreground">{group.eventType}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {group.eventDates?.length > 1
                            ? `${group.eventDates.length} event dates`
                            : formatEventDateLabel(group.eventDate)}
                          {group.venue ? ` · ${group.venue}` : ""}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="space-y-1">
                          {!group.venue?.toLowerCase().includes("sports complex") && (
                            <div className="flex items-center gap-2">
                              <span className="min-w-[8.5rem] text-muted-foreground">
                                Billing Statement
                              </span>
                              <StatusBadge status={billingStatus} />
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <span className="min-w-[8.5rem] text-muted-foreground">
                              Official Receipt
                            </span>
                            <StatusBadge status={receiptStatus} />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <StatusIcon status={group.documentStatus} />
                          <StatusBadge status={group.documentStatus} />
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {group.submittedAt
                          ? new Date(group.submittedAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedGroup(group);
                            setDetailsOpen(true);
                          }}
                          title="View reservation documents"
                        >
                          <Eye className="size-4" />
                        </Button>
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
            total={filteredReservations.length}
            onPageChange={setPage}
            itemLabel="reservations"
          />
        </CardContent>
      </Card>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="size-5" />
              Reservation Documents
            </DialogTitle>
            <DialogDescription>
              {selectedGroup?.venue?.toLowerCase().includes("sports complex")
                ? "Review the Official Receipt for this reservation."
                : "Review the Billing Statement and Official Receipt for this reservation."}
            </DialogDescription>
          </DialogHeader>
          {selectedGroup && (
            <div className="space-y-4">
              <div className="space-y-3 rounded-lg border bg-muted/30 p-4 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Client:</span>
                  <span className="font-medium">{selectedGroup.clientName}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Reservation:</span>
                  <span className="font-medium">
                    {selectedGroup.reservationId
                      ? `RES-${selectedGroup.reservationId}`
                      : "—"}
                  </span>
                </div>
                {selectedGroup.eventType && (
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Event:</span>
                    <span className="font-medium">{selectedGroup.eventType}</span>
                  </div>
                )}
                {selectedGroup.venue && (
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Venue:</span>
                    <span className="font-medium">{selectedGroup.venue}</span>
                  </div>
                )}
                {selectedGroup.eventDates?.length > 0 && (
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Event date(s):</span>
                    <span className="font-medium">
                      {selectedGroup.eventDates
                        .map(formatEventDateLabel)
                        .join(", ")}
                    </span>
                  </div>
                )}
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Overall status:</span>
                  <div className="flex items-center gap-1">
                    <StatusIcon status={selectedGroup.documentStatus} />
                    <span className="font-medium">{selectedGroup.documentStatus}</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {!selectedGroup.venue?.toLowerCase().includes("sports complex") &&
                  renderDocumentCard(
                    selectedGroup.billingStatement,
                    "Billing Statement",
                    1
                  )}
                {renderDocumentCard(
                  selectedGroup.officialReceipt,
                  "Official Receipt",
                  5
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={verifyConfirmOpen} onOpenChange={setVerifyConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-green-500" />
              Verify Document
            </DialogTitle>
            <DialogDescription>
              Verify {actionDoc?.documentType || "this document"}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setVerifyConfirmOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={handleVerify}>
              Verify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={physicalConfirmOpen}
        onOpenChange={(open) => {
          setPhysicalConfirmOpen(open);
          if (!open) setPhysicalTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck2 className="size-5 text-blue-500" />
              Verify Physical Copy
            </DialogTitle>
            <DialogDescription>
              Verify the physical {physicalTarget?.label || "document"} for this
              reservation? No image was uploaded online, so this records it as
              verified on the basis of the physical copy.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setPhysicalConfirmOpen(false);
                setPhysicalTarget(null);
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleVerifyPhysical}
            >
              Verify Physical Copy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={declineConfirmOpen}
        onOpenChange={(open) => {
          setDeclineConfirmOpen(open);
          if (!open) setDeclineRemarks("");
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="size-5 text-red-500" />
              Decline Document
            </DialogTitle>
            <DialogDescription>
              Provide a reason for declining {actionDoc?.documentType || "this document"}. The
              client will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Reason for declining (required)</Label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Explain why the document is being declined..."
              value={declineRemarks}
              onChange={(e) => setDeclineRemarks(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDeclineConfirmOpen(false);
                setDeclineRemarks("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDecline}
              disabled={!declineRemarks.trim()}
            >
              Decline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
