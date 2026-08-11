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
import { toast } from "sonner";
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

export default function LTOODocumentsPage() {
  const [documents, setDocuments] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [clientTypeFilter, setClientTypeFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [selectedDoc, setSelectedDoc] = React.useState(null);
  const [verifyConfirmOpen, setVerifyConfirmOpen] = React.useState(false);
  const [declineConfirmOpen, setDeclineConfirmOpen] = React.useState(false);
  const [declineRemarks, setDeclineRemarks] = React.useState("");

  React.useEffect(() => {
    async function loadDocuments() {
      try {
        const res = await fetch("/api/ltoo/documents");
        const data = await res.json();
        setDocuments(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load documents:", err);
        toast.error("Failed to load documents");
      } finally {
        setLoading(false);
      }
    }
    loadDocuments();
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case "Verified": return <CheckCircle2 className="size-4 text-green-500" />;
      case "Pending": return <Clock className="size-4 text-amber-500" />;
      case "Declined": return <XCircle className="size-4 text-red-500" />;
      default: return <Clock className="size-4 text-muted-foreground" />;
    }
  };

  const handleVerify = async () => {
    if (!selectedDoc) return;
    try {
      const res = await fetch("/api/documents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: selectedDoc.documentId || selectedDoc.id,
          status: "Verified",
        }),
      });
      if (!res.ok) throw new Error("Failed to verify document");
      toast.success("Document verified successfully");
      setVerifyConfirmOpen(false);
      setDetailsOpen(false);
      setSelectedDoc(null);
      // Refresh
      const refreshRes = await fetch("/api/ltoo/documents");
      const refreshData = await refreshRes.json();
      setDocuments(Array.isArray(refreshData) ? refreshData : []);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDecline = async () => {
    if (!selectedDoc || !declineRemarks.trim()) return;
    try {
      const res = await fetch("/api/documents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: selectedDoc.documentId || selectedDoc.id,
          status: "Declined",
          remarks: declineRemarks.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed to decline document");
      toast.success("Document declined");
      setDeclineConfirmOpen(false);
      setDetailsOpen(false);
      setSelectedDoc(null);
      setDeclineRemarks("");
      // Refresh
      const refreshRes = await fetch("/api/ltoo/documents");
      const refreshData = await refreshRes.json();
      setDocuments(Array.isArray(refreshData) ? refreshData : []);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const filteredDocs = documents.filter((d) => {
    if (clientTypeFilter !== "all" && d.clientType !== clientTypeFilter) return false;
    if (statusFilter !== "all" && d.documentStatus !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        d.clientName?.toLowerCase().includes(q) ||
        d.documentType?.toLowerCase().includes(q) ||
        d.remarks?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Documents</h2>
        <p className="text-muted-foreground text-sm">
          View, verify, and evaluate billing statements and other documents submitted by clients and provincial agencies.
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Submitted Documents</CardTitle>
          <CardDescription>Monitor, verify, and evaluate submitted documents.</CardDescription>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="text-muted-foreground absolute top-2.5 left-2 size-4" />
              <Input
                className="pl-8"
                placeholder="Search by client or document type..."
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
                <TableHead>Document Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Remarks</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground py-8 text-center">Loading...</TableCell>
                </TableRow>
              ) : filteredDocs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground py-8 text-center">No documents found.</TableCell>
                </TableRow>
              ) : (
                filteredDocs.map((d) => (
                  <TableRow key={d.documentId || d.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {d.clientType === "provincial" ? <Building2 className="size-4 text-muted-foreground" /> : <User className="size-4 text-muted-foreground" />}
                        <span className="font-medium">{d.clientName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{d.clientType === "provincial" ? "Provincial" : "Client"}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{d.documentType || "Billing Statement"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(d.documentStatus)}
                        <Badge
                          variant="outline"
                          className={
                            d.documentStatus === "Verified"
                              ? "text-green-600 border-green-300"
                              : d.documentStatus === "Declined"
                                ? "text-red-600 border-red-300"
                                : "text-amber-600 border-amber-300"
                          }
                        >
                          {d.documentStatus || "Pending"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {d.submittedAt
                        ? new Date(d.submittedAt).toLocaleDateString("en-US", {
                            month: "short", day: "numeric", year: "numeric",
                          })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                      {d.remarks || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setSelectedDoc(d); setDetailsOpen(true); }}
                          title="View details"
                        >
                          <Eye className="size-4" />
                        </Button>
                        {d.filePath && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(d.filePath, "_blank")}
                            title="View document"
                          >
                            <Download className="size-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="size-5" />
              Document Details
            </DialogTitle>
            <DialogDescription>Review the document and take action.</DialogDescription>
          </DialogHeader>
          {selectedDoc && (
            <div className="space-y-4">
              <div className="space-y-3 rounded-lg border bg-muted/30 p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Client:</span>
                  <span className="font-medium">{selectedDoc.clientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <Badge variant="outline">{selectedDoc.clientType === "provincial" ? "Provincial" : "Client"}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Document:</span>
                  <span className="font-medium">{selectedDoc.documentType || "Billing Statement"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <div className="flex items-center gap-1">
                    {getStatusIcon(selectedDoc.documentStatus)}
                    <span className="font-medium">{selectedDoc.documentStatus || "Pending"}</span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Submitted:</span>
                  <span className="font-medium">
                    {selectedDoc.submittedAt
                      ? new Date(selectedDoc.submittedAt).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
                        })
                      : "—"}
                  </span>
                </div>
                {selectedDoc.remarks && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Remarks:</span>
                    <span className="font-medium text-right max-w-[200px]">{selectedDoc.remarks}</span>
                  </div>
                )}
              </div>

              {/* Document Image Preview */}
              {selectedDoc.filePath && (
                <div className="relative w-full h-64 overflow-hidden rounded-md border bg-muted/20">
                  <img
                    src={selectedDoc.filePath}
                    alt="Document"
                    className="w-full h-full object-contain"
                  />
                </div>
              )}

              {/* Action Buttons */}
              {selectedDoc.documentStatus !== "Verified" && (
                <div className="flex items-center justify-end gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-300 hover:bg-red-50"
                    onClick={() => setDeclineConfirmOpen(true)}
                    disabled={selectedDoc.documentStatus === "Declined"}
                  >
                    <ShieldX className="mr-1 size-4" />
                    Decline
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-green-600 border-green-300 hover:bg-green-50"
                    onClick={() => setVerifyConfirmOpen(true)}
                  >
                    <ShieldCheck className="mr-1 size-4" />
                    Verify
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Verify Confirm Dialog */}
      <Dialog open={verifyConfirmOpen} onOpenChange={setVerifyConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-green-500" />
              Verify Document
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to verify this document? This action cannot be undone.
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

      {/* Decline Confirm Dialog */}
      <Dialog open={declineConfirmOpen} onOpenChange={(open) => { setDeclineConfirmOpen(open); if (!open) setDeclineRemarks(""); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="size-5 text-red-500" />
              Decline Document
            </DialogTitle>
            <DialogDescription>
              Provide a reason for declining this document. The client will be notified.
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
            <Button variant="outline" onClick={() => { setDeclineConfirmOpen(false); setDeclineRemarks(""); }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDecline} disabled={!declineRemarks.trim()}>
              Decline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}