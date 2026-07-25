"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Bell, CheckCircle, Calendar, FileText, AlertTriangle, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function ClientNotificationsPage() {
  const [notifications, setNotifications] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedNotif, setSelectedNotif] = React.useState(null);

  async function fetchNotifications() {
    const clientId = localStorage.getItem("user_id")?.replace("CLT-", "");
    if (!clientId) return;
    try {
      const res = await fetch(`/api/notifications?clientId=${clientId}`);
      const data = await res.json();
      setNotifications(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      const clientId = localStorage.getItem("user_id")?.replace("CLT-", "");
      if (!clientId) return;
      try {
        const res = await fetch(`/api/notifications?clientId=${clientId}`);
        const data = await res.json();
        if (!cancelled) setNotifications(data || []);
      } catch (err) {
        if (!cancelled) console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  async function markAsRead(notificationId) {
    try {
      const res = await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });
      if (!res.ok) throw new Error("Failed to mark as read");
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, isRead: true } : n
        )
      );
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  }

  function handleNotificationClick(notif) {
    setSelectedNotif(notif);
    if (!notif.isRead) {
      markAsRead(notif.id);
    }
  }

  const getIcon = (type) => {
    if (type === "booking") return <Calendar className="size-4" />;
    if (type === "document") return <FileText className="size-4" />;
    if (type === "alert") return <AlertTriangle className="size-4" />;
    if (type === "reschedule") return <Calendar className="size-4" />;
    return <Bell className="size-4" />;
  };

  const getTypeColor = (type) => {
    if (type === "reschedule") return "bg-purple-100 text-purple-700 border-purple-300";
    if (type === "booking") return "bg-blue-100 text-blue-700 border-blue-300";
    if (type === "document") return "bg-amber-100 text-amber-700 border-amber-300";
    if (type === "alert") return "bg-red-100 text-red-700 border-red-300";
    return "bg-slate-100 text-slate-700 border-slate-300";
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Notifications</h2>
        <p className="text-muted-foreground text-sm">
          Stay updated on your bookings, documents, and announcements.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Notifications</CardTitle>
          <CardDescription>
            Updates on confirmed bookings, rescheduling requests, maintenance schedules, and more.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center text-muted-foreground py-8">Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">No notifications yet.</div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`flex items-start gap-4 rounded-lg border p-4 transition-colors cursor-pointer hover:bg-muted/50 ${
                    notif.isRead ? "bg-background" : "bg-muted/30 border-primary/20"
                  }`}
                  onClick={() => handleNotificationClick(notif)}
                >
                  <div className="mt-0.5 text-muted-foreground">
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium flex-1 whitespace-pre-wrap">{notif.message}</p>
                      {!notif.isRead && (
                        <Badge variant="secondary" className="text-[10px] shrink-0">New</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">
                        {new Date(notif.sentAt).toLocaleString()}
                      </p>
                      <Badge variant="outline" className={`text-[10px] ${getTypeColor(notif.type)}`}>
                        {notif.type || "General"}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Detail Dialog */}
      <Dialog open={selectedNotif !== null} onOpenChange={(open) => { if (!open) setSelectedNotif(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedNotif && getIcon(selectedNotif.type)}
              Notification Details
            </DialogTitle>
            <DialogDescription>
              {selectedNotif?.type === "reschedule"
                ? "Rescheduling request update"
                : selectedNotif?.type === "booking"
                  ? "Booking update"
                  : selectedNotif?.type === "document"
                    ? "Document update"
                    : "General notification"}
            </DialogDescription>
          </DialogHeader>
          {selectedNotif && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">Message</Label>
                <p className="text-sm bg-muted/30 rounded-md p-3 whitespace-pre-wrap">{selectedNotif.message}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Type</Label>
                  <Badge variant="outline" className={`mt-1 ${getTypeColor(selectedNotif.type)}`}>
                    {selectedNotif.type || "General"}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Status</Label>
                  <p className="text-sm font-medium mt-1">
                    {selectedNotif.isRead ? "Read" : "Unread"}
                  </p>
                </div>
                <div className="col-span-2">
                  <Label className="text-muted-foreground text-xs">Received</Label>
                  <p className="text-sm font-medium mt-1">
                    {new Date(selectedNotif.sentAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" onClick={() => setSelectedNotif(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}