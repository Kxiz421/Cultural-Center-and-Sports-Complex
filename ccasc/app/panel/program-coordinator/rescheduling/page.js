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
import { Search, CheckCircle2, XCircle, CalendarSync, AlertTriangle } from "lucide-react";
import { notifyPanelNotificationsUpdated } from "@/lib/panel-notifications";

export default function CoordinatorReschedulingPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // "approve" | "decline" | null
  const [declineReason, setDeclineReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/coordinator/rescheduling");
        const data = await res.json();
        if (!cancelled) setRequests(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load reschedule requests:", err);
          toast.error("Failed to load reschedule requests");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  async function refreshRequests() {
    try {
      const res = await fetch("/api/coordinator/rescheduling");
      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load reschedule requests:", err);
      toast.error("Failed to load reschedule requests");
    }
  }

  function handleApproveClick() {
    setConfirmAction("approve");
    setDeclineReason("");
  }

  function handleDeclineClick() {
    setConfirmAction("decline");
    setDeclineReason("");
  }

  async function handleConfirmAction() {
    if (!selectedRequest) return;
    setActionLoading(true);

    try {
      const body = {
        requestId: selectedRequest.id,
        action: confirmAction,
      };
      if (confirmAction === "decline" && declineReason.trim()) {
        body.declineReason = declineReason.trim();
      }

      const res = await fetch("/api/coordinator/rescheduling", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || `Failed to ${confirmAction}`);
      }

      toast.success(
        confirmAction === "approve"
          ? "Reschedule request approved. Client has been notified."
          : "Reschedule request declined. Client has been notified."
      );

      refreshRequests();
      notifyPanelNotificationsUpdated();
      setConfirmAction(null);
      setDetailOpen(false);
      setSelectedRequest(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  function cancelConfirm() {
    setConfirmAction(null);
    setDeclineReason("");
  }

  const filtered = requests.filter((r) => {
    const hay = [r.clientName, r.eventType, r.venue, r.reason]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(searchQuery.toLowerCase());
  });

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Rescheduling</h2>
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Rescheduling</h2>
        <p className="text-muted-foreground text-sm">
          Handle client requests to change event dates or times.
        </p>
      </div>

      {/* Search */}
      <div className="space-y-2">
        <Label>Search</Label>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by client, event, or reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Requests List */}
      <Card>
        <CardHeader>
          <CardTitle>Reschedule Requests</CardTitle>
          <CardDescription>
            {filtered.length} request(s) found.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">
                No reschedule requests found.
              </p>
            ) : (
              filtered.map((req) => (
                <div
                  key={req.id}
                  className="flex flex-col gap-2 rounded-lg border p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => {
                    setSelectedRequest(req);
                    setDetailOpen(true);
                    setConfirmAction(null);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CalendarSync className="size-4 text-muted-foreground" />
                      <span className="font-medium">{req.clientName}</span>
                      <Badge variant="outline" className="text-xs">
                        {req.clientType}
                      </Badge>
                    </div>
                    <Badge
                      variant={
                        req.status === "Pending" ? "secondary" : "default"
                      }
                    >
                      {req.status}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {req.venue} &middot; {req.eventType}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {(req.dateChanges || [{ originalDate: req.currentDate, requestedDate: req.requestedDate }])
                      .map((c) => `${c.originalDate} → ${c.requestedDate}`)
                      .join(" · ")}
                  </p>
                  {req.declineReason && (
                    <p className="text-xs text-red-600 mt-1">
                      Decline reason: {req.declineReason}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      {detailOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Reschedule Request Details</h3>
                <button
                  onClick={() => {
                    setDetailOpen(false);
                    setConfirmAction(null);
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <XCircle className="size-5" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-muted-foreground text-xs">Client</span>
                  <p className="font-medium">{selectedRequest.clientName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Venue</span>
                  <p className="font-medium">{selectedRequest.venue}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Event Type</span>
                  <p className="font-medium">{selectedRequest.eventType}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Date changes</span>
                  <div className="mt-1 space-y-1">
                    {(selectedRequest.dateChanges || [
                      {
                        originalDate: selectedRequest.currentDate,
                        requestedDate: selectedRequest.requestedDate,
                        isPrimary: true,
                      },
                    ]).map((c, idx) => (
                      <p key={idx} className="font-medium text-sm">
                        {c.originalDate} → {c.requestedDate}
                        {c.isPrimary ? " (primary)" : ""}
                      </p>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Client&apos;s Reason</span>
                  <p className="text-sm bg-muted/30 rounded-md p-2">{selectedRequest.reason}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Status</span>
                  <Badge
                    variant={
                      selectedRequest.status === "Pending"
                        ? "secondary"
                        : "default"
                    }
                  >
                    {selectedRequest.status}
                  </Badge>
                </div>
                {selectedRequest.declineReason && (
                  <div>
                    <span className="text-muted-foreground text-xs">Decline Reason</span>
                    <p className="text-sm bg-red-50 rounded-md p-2 text-red-700">{selectedRequest.declineReason}</p>
                  </div>
                )}
              </div>

              {/* Confirmation dialog for approve/decline */}
              {confirmAction && selectedRequest.status === "Pending" && (
                <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="size-4 text-amber-500" />
                    <p className="text-sm font-medium">
                      {confirmAction === "approve"
                        ? "Confirm Approval"
                        : "Confirm Decline"}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {confirmAction === "approve"
                      ? "This will apply all requested date changes and notify the client."
                      : "This will reject the request and notify the client."}
                  </p>
                  {confirmAction === "decline" && (
                    <div className="space-y-2">
                      <Label htmlFor="decline-reason">Reason for Declining (optional)</Label>
                      <Textarea
                        id="decline-reason"
                        placeholder="Explain why the request is being declined..."
                        value={declineReason}
                        onChange={(e) => setDeclineReason(e.target.value)}
                        rows={3}
                      />
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={cancelConfirm}
                      disabled={actionLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant={confirmAction === "approve" ? "default" : "destructive"}
                      className="flex-1"
                      onClick={handleConfirmAction}
                      disabled={actionLoading}
                    >
                      {actionLoading ? "Processing..." : `Yes, ${confirmAction === "approve" ? "Approve" : "Decline"}`}
                    </Button>
                  </div>
                </div>
              )}

              {/* Action buttons (only show for Pending requests when no confirmation is active) */}
              {!confirmAction && selectedRequest.status === "Pending" && (
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
                    onClick={handleDeclineClick}
                  >
                    Decline
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleApproveClick}
                  >
                    <CheckCircle2 className="mr-2 size-4" />
                    Approve
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}