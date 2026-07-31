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
  BellRing,
  Search,
  Send,
  History,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export default function LTOONotificationsPage() {
  const [bookings, setBookings] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [clientTypeFilter, setClientTypeFilter] = React.useState("all");
  const [sending, setSending] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [selectedBooking, setSelectedBooking] = React.useState(null);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [sentNotifications, setSentNotifications] = React.useState([]);
  const [historyLoading, setHistoryLoading] = React.useState(false);

  React.useEffect(() => {
    async function loadBookings() {
      try {
        const res = await fetch("/api/ltoo/notifications");
        const data = await res.json();
        setBookings(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load bookings:", err);
        toast.error("Failed to load bookings");
      } finally {
        setLoading(false);
      }
    }
    loadBookings();
  }, []);

  const handleSendNotification = async () => {
    if (!selectedBooking) return;
    setSending(true);
    try {
      const performedBy = typeof window !== "undefined" ? localStorage.getItem("user_id") || "" : "";
      const performedByName = typeof window !== "undefined" ? localStorage.getItem("user_name") || "" : "";

      const res = await fetch("/api/ltoo/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: selectedBooking.bookingId || selectedBooking.id,
          clientType: selectedBooking.clientType,
          clientId: selectedBooking.clientId,
          staffId: performedBy.replace("STF-", ""),
          performedBy,
          performedByName,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to send notification");
      }

      toast.success("Notification sent successfully");
      setConfirmOpen(false);
      setSelectedBooking(null);
      // Refresh
      const refreshRes = await fetch("/api/ltoo/notifications");
      const refreshData = await refreshRes.json();
      setBookings(Array.isArray(refreshData) ? refreshData : []);
    } catch (err) {
      toast.error(err.message || "Failed to send notification");
    } finally {
      setSending(false);
    }
  };

  const handleOpenHistory = async () => {
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/ltoo/notifications?history=true");
      const data = await res.json();
      setSentNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error("Failed to load notification history");
    } finally {
      setHistoryLoading(false);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (clientTypeFilter !== "all" && b.clientType !== clientTypeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        b.clientName?.toLowerCase().includes(q) ||
        b.activityName?.toLowerCase().includes(q) ||
        b.eventDate?.includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Notifications</h2>
          <p className="text-muted-foreground text-sm">
            Notify clients and provincial agencies when their documents are ready for release.
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Completed Bookings</CardTitle>
          <CardDescription>Only bookings with completed payments can be notified.</CardDescription>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="text-muted-foreground absolute top-2.5 left-2 size-4" />
              <Input
                className="pl-8"
                placeholder="Search by client, activity, or date..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-[200px]">
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
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Notified</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground py-8 text-center">Loading...</TableCell>
                </TableRow>
              ) : filteredBookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground py-8 text-center">No bookings found with completed payments.</TableCell>
                </TableRow>
              ) : (
                filteredBookings.map((b) => (
                  <TableRow key={b.bookingId || b.id}>
                    <TableCell className="font-medium">{b.clientName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{b.clientType === "provincial" ? "Provincial" : "Client"}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{b.activityName || b.eventType || "—"}</TableCell>
                    <TableCell className="text-sm">{b.eventDate || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-green-600 border-green-300">Completed</Badge>
                    </TableCell>
                    <TableCell>
                      {b.notified ? (
                        <Badge variant="outline" className="text-blue-600 border-blue-300">
                          <CheckCircle2 className="mr-1 size-3" /> Sent
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-muted-foreground">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedBooking(b);
                          setConfirmOpen(true);
                        }}
                        title="Send notification"
                        disabled={b.notified}
                      >
                        <Send className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Send className="size-5" />Send Notification</DialogTitle>
            <DialogDescription>
              Notify {selectedBooking?.clientName} that their documents are ready for release?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Client:</span>
              <span className="font-medium">{selectedBooking?.clientName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Activity:</span>
              <span className="font-medium">{selectedBooking?.activityName || selectedBooking?.eventType || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date:</span>
              <span className="font-medium">{selectedBooking?.eventDate || "—"}</span>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setConfirmOpen(false); setSelectedBooking(null); }}>Cancel</Button>
            <Button onClick={handleSendNotification} disabled={sending}>
              {sending ? "Sending..." : "Send Notification"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><History className="size-5" />Notification History</DialogTitle>
            <DialogDescription>Track all sent notifications.</DialogDescription>
          </DialogHeader>
          {historyLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading history...</div>
          ) : sentNotifications.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No notifications sent yet.</div>
          ) : (
            <div className="space-y-3">
              {sentNotifications.map((n) => (
                <div key={n.notificationId || n.id} className="flex items-start gap-3 rounded-lg border p-3">
                  <BellRing className="size-4 text-blue-500 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(n.sentAt || n.createdAt).toLocaleDateString("en-US", {
                        year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {n.isRead ? (
                    <CheckCircle2 className="size-4 text-green-500 shrink-0" />
                  ) : (
                    <XCircle className="size-4 text-muted-foreground shrink-0" />
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* History Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button onClick={handleOpenHistory} className="shadow-lg" size="lg">
          <History className="mr-2 size-5" />Notification History
        </Button>
      </div>
    </div>
  );
}