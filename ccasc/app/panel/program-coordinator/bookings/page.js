"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Search, CheckCircle2, XCircle, AlertTriangle, FileText, Eye, ThumbsUp, ThumbsDown } from "lucide-react";

function formatPhp(amount) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount);
}

export default function CoordinatorBookingsPage() {
  const [reservations, setReservations] = useState([]);
  const [historyReservations, setHistoryReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRes, setSelectedRes] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [resubmitDoc, setResubmitDoc] = useState(null);
  const [resubmitMessage, setResubmitMessage] = useState("");
  const [activeTab, setActiveTab] = useState("pending");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/coordinator/bookings");
        const data = await res.json();
        if (!cancelled) setReservations(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load bookings:", err);
          toast.error("Failed to load bookings");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/coordinator/bookings?history=true");
      const data = await res.json();
      setHistoryReservations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load history:", err);
      toast.error("Failed to load history");
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === "history" && historyReservations.length === 0) {
      loadHistory();
    }
  }, [activeTab]);

  async function refreshBookings() {
    try {
      const res = await fetch("/api/coordinator/bookings");
      const data = await res.json();
      setReservations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load bookings:", err);
      toast.error("Failed to load bookings");
    }
  }

  async function handleConfirm(reservationId) {
    try {
      const res = await fetch("/api/coordinator/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId, action: "confirm" }),
      });
      if (!res.ok) throw new Error("Failed to confirm");
      toast.success("Booking confirmed successfully");
      refreshBookings();
      setDetailOpen(false);
    } catch (err) {
      toast.error("Failed to confirm booking");
    }
  }

  async function handleCancel(reservationId) {
    try {
      const res = await fetch("/api/coordinator/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId, action: "cancel" }),
      });
      if (!res.ok) throw new Error("Failed to cancel");
      toast.success("Booking cancelled");
      refreshBookings();
      setDetailOpen(false);
    } catch (err) {
      toast.error("Failed to cancel booking");
    }
  }

  function updateDocumentInState(docId, updates) {
    // Update selectedRes immediately
    if (selectedRes) {
      const updatedDocs = selectedRes.documents.map((d) =>
        d.id === docId ? { ...d, ...updates } : d
      );
      setSelectedRes({ ...selectedRes, documents: updatedDocs });
    }
    // Also update in the reservations list
    setReservations((prev) =>
      prev.map((r) => {
        if (r.id === selectedRes?.id) {
          return {
            ...r,
            documents: r.documents?.map((d) =>
              d.id === docId ? { ...d, ...updates } : d
            ),
          };
        }
        return r;
      })
    );
  }

  async function handleVerifyDocument(docId) {
    // Optimistically update UI
    updateDocumentInState(docId, { status: "Verified" });
    try {
      const res = await fetch("/api/documents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: docId, status: "Verified" }),
      });
      if (!res.ok) throw new Error("Failed to verify");
      toast.success("Document verified");
    } catch (err) {
      toast.error("Failed to verify document");
      // Revert on failure
      updateDocumentInState(docId, { status: "Pending" });
    }
  }

  async function handleRequestResubmit(docId) {
    const message = resubmitMessage.trim();
    if (!message) {
      toast.error("Please provide a reason for resubmission");
      return;
    }
    // Optimistically update UI
    updateDocumentInState(docId, { status: "Declined", remarks: message });
    setResubmitDoc(null);
    setResubmitMessage("");
    try {
      const res = await fetch("/api/documents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: docId,
          status: "Declined",
          remarks: message,
        }),
      });
      if (!res.ok) throw new Error("Failed to decline");
      toast.success("Resubmission requested. Client has been notified.");
    } catch (err) {
      toast.error("Failed to request resubmission");
      // Revert on failure
      updateDocumentInState(docId, { status: "Pending", remarks: null });
    }
  }

  const filtered = reservations.filter((r) => {
    const hay = [r.clientName, r.eventType, r.venue, r.id]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(searchQuery.toLowerCase());
  });

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Booking Confirmation</h2>
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Booking Confirmation</h2>
        <p className="text-muted-foreground text-sm">
          Manage bookings that have reached full payment status.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        <Button
          variant={activeTab === "pending" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("pending")}
        >
          Pending Confirmation
          {reservations.length > 0 && (
            <span className="ml-2 text-xs bg-primary-foreground/20 px-1.5 py-0.5 rounded-full">
              {reservations.length}
            </span>
          )}
        </Button>
        <Button
          variant={activeTab === "history" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("history")}
        >
          Confirmed History
        </Button>
      </div>

      {/* Search */}
      <div className="space-y-2">
        <Label>Search</Label>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by client, event, or reservation ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Bookings List */}
      {activeTab === "pending" && (
        <Card>
          <CardHeader>
            <CardTitle>Fully Paid Bookings</CardTitle>
            <CardDescription>
              {filtered.length} booking(s) awaiting confirmation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filtered.length === 0 ? (
                <p className="text-muted-foreground text-sm py-8 text-center">
                  No fully paid bookings awaiting confirmation.
                </p>
              ) : (
                filtered.map((res) => (
                  <div
                    key={res.id}
                    className="flex flex-col gap-2 rounded-lg border p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => {
                      setSelectedRes(res);
                      setDetailOpen(true);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{res.clientName}</span>
                        <Badge variant="outline" className="text-xs">
                          {res.clientType}
                        </Badge>
                      </div>
                      <Badge variant="default">Fully Paid</Badge>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {res.venue} &middot; {res.eventDate} &middot; {res.eventType}
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-muted-foreground text-xs">
                        {res.timeSlot}
                      </p>
                      <p className="text-xs font-medium tabular-nums">
                        {formatPhp(res.amountPaid)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmed History */}
      {activeTab === "history" && (
        <Card>
          <CardHeader>
            <CardTitle>Confirmed Booking History</CardTitle>
            <CardDescription>
              {historyLoading ? "Loading..." : `${historyReservations.length} confirmed booking(s).`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {historyLoading ? (
                <p className="text-muted-foreground text-sm py-8 text-center">Loading history...</p>
              ) : historyReservations.length === 0 ? (
                <p className="text-muted-foreground text-sm py-8 text-center">No confirmed bookings yet.</p>
              ) : (
                historyReservations.map((res) => (
                  <div
                    key={res.id}
                    className="flex flex-col gap-2 rounded-lg border border-green-200 bg-green-50/30 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{res.clientName}</span>
                        <Badge variant="outline" className="text-xs">
                          {res.clientType}
                        </Badge>
                      </div>
                      <Badge className="bg-green-600">Confirmed</Badge>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {res.venue} &middot; {res.eventDates && res.eventDates.length > 1
                        ? `${res.eventDates[0]} — ${res.eventDates[res.eventDates.length - 1]} (${res.eventDates.length} days)`
                        : res.eventDate} &middot; {res.eventType}
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-muted-foreground text-xs">
                        {res.timeSlot}
                      </p>
                      <p className="text-xs font-medium tabular-nums">
                        {formatPhp(res.amountPaid)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail Dialog */}
      {detailOpen && selectedRes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Booking Details</h3>
                <button
                  onClick={() => setDetailOpen(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <XCircle className="size-5" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-muted-foreground text-xs">Reservation ID</span>
                  <p className="font-medium">{selectedRes.id}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Client</span>
                  <p className="font-medium">{selectedRes.clientName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Venue</span>
                  <p className="font-medium">{selectedRes.venue}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Event Type</span>
                  <p className="font-medium">{selectedRes.eventType}</p>
                </div>
              <div>
                  <span className="text-muted-foreground text-xs">Event Date{selectedRes.eventDates && selectedRes.eventDates.length > 1 ? 's' : ''}</span>
                  <p className="font-medium">
                    {selectedRes.eventDates && selectedRes.eventDates.length > 1
                      ? `${selectedRes.eventDates[0]} — ${selectedRes.eventDates[selectedRes.eventDates.length - 1]} (${selectedRes.eventDates.length} days)`
                      : selectedRes.eventDate}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Time Slot</span>
                  <p className="font-medium">{selectedRes.timeSlot}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Amount Paid</span>
                  <p className="font-medium tabular-nums">{formatPhp(selectedRes.amountPaid)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Package</span>
                  <p className="font-medium">{selectedRes.packageName || "N/A"}</p>
                </div>

                {/* Documents Section */}
                {selectedRes.documents && selectedRes.documents.length > 0 && (
                  <div>
                    <span className="text-muted-foreground text-xs block mb-2">Uploaded Documents</span>
                    <div className="space-y-2">
                      {selectedRes.documents.map((doc) => (
                        <div key={doc.id} className="rounded-md border p-2">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <FileText className="size-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">{doc.type}</p>
                                <p className="text-xs text-muted-foreground">
                                  Status: {doc.status}
                                  {doc.submittedAt && ` • ${new Date(doc.submittedAt).toLocaleDateString()}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {doc.filePath && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setPreviewDoc(doc)}
                                >
                                  <Eye className="size-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                          {doc.remarks && (
                            <p className="text-xs text-red-500 mb-2">Remarks: {doc.remarks}</p>
                          )}
                          {doc.status !== "Verified" && doc.status !== "Declined" && (
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-green-600 border-green-300 hover:bg-green-50 text-xs"
                                onClick={() => handleVerifyDocument(doc.id)}
                              >
                                <ThumbsUp className="size-3 mr-1" />
                                Verify
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 border-red-300 hover:bg-red-50 text-xs"
                                onClick={() => {
                                  setResubmitDoc(doc);
                                  setResubmitMessage("");
                                }}
                              >
                                <ThumbsDown className="size-3 mr-1" />
                                Request Resubmit
                              </Button>
                            </div>
                          )}
                          {doc.status === "Verified" && (
                            <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
                              <CheckCircle2 className="size-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                          {doc.status === "Declined" && (
                            <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50">
                              <XCircle className="size-3 mr-1" />
                              Resubmission Requested
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 pt-2 border-t">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <AlertTriangle className="size-3" />
                  Confirm only if physical copies of certification and contract of lease are verified.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
                    onClick={() => handleCancel(selectedRes.id.replace("RES-", ""))}
                  >
                    Cancel Booking
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => handleConfirm(selectedRes.id.replace("RES-", ""))}
                  >
                    <CheckCircle2 className="mr-2 size-4" />
                    Confirm Booking
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDoc && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPreviewDoc(null)}
        >
          <div
            className="relative max-w-2xl w-full bg-white rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-3 border-b">
              <h4 className="font-semibold text-sm">{previewDoc.type}</h4>
              <button
                onClick={() => setPreviewDoc(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <XCircle className="size-5" />
              </button>
            </div>
            <div className="p-2 flex items-center justify-center max-h-[70vh] overflow-auto">
              <img
                src={previewDoc.filePath}
                alt={previewDoc.type}
                className="max-w-full max-h-[65vh] object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Resubmission Request Modal */}
      {resubmitDoc && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setResubmitDoc(null)}
        >
          <div
            className="max-w-md w-full bg-white rounded-lg shadow-lg p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="font-semibold mb-2">
              Request Resubmission for {resubmitDoc.type}
            </h4>
            <p className="text-sm text-muted-foreground mb-4">
              Provide a reason why this document needs to be resubmitted. This message will be sent to the client.
            </p>
            <Textarea
              placeholder="Enter reason for resubmission..."
              value={resubmitMessage}
              onChange={(e) => setResubmitMessage(e.target.value)}
              className="min-h-[100px] mb-4"
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setResubmitDoc(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleRequestResubmit(resubmitDoc.id)}
                disabled={!resubmitMessage.trim()}
              >
                Request Resubmission
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}