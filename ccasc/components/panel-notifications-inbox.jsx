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
import {
  Bell,
  Calendar,
  FileText,
  AlertTriangle,
  CreditCard,
  RefreshCw,
  ClipboardCheck,
} from "lucide-react";
import {
  categorizeNotificationType,
  displayNotificationTypeLabel,
  notifyPanelNotificationsUpdated,
} from "@/lib/panel-notifications";

export function PanelNotificationsInbox({
  audience = "client",
  scope = "",
  filters = [],
  title = "Notifications",
  description = "Stay updated on your account activity.",
  listDescription = "Filter by category to find what you need.",
}) {
  const [notifications, setNotifications] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedNotif, setSelectedNotif] = React.useState(null);
  const [filter, setFilter] = React.useState("all");

  const queryKey = audience === "client" ? "clientId" : "staffId";

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      const raw = localStorage.getItem("user_id");
      const id =
        audience === "client"
          ? raw?.replace(/^CLT-/, "")
          : raw?.replace(/^STF-/, "");

      if (!id) {
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        const scopeParam = scope ? `&scope=${encodeURIComponent(scope)}` : "";
        const res = await fetch(`/api/notifications?${queryKey}=${id}${scopeParam}`);
        const data = await res.json();
        if (!cancelled) setNotifications(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [audience, queryKey, scope]);

  async function markAsRead(notificationId) {
    try {
      const res = await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });
      if (!res.ok) throw new Error("Failed to mark as read");
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
      notifyPanelNotificationsUpdated();
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
    const category = categorizeNotificationType(type);
    if (category === "reservation" || category === "booking") {
      return category === "booking" ? (
        <ClipboardCheck className="size-4" />
      ) : (
        <Calendar className="size-4" />
      );
    }
    if (category === "document") return <FileText className="size-4" />;
    if (category === "reschedule") return <RefreshCw className="size-4" />;
    if (category === "payment") return <CreditCard className="size-4" />;
    if (String(type || "").toLowerCase() === "alert") {
      return <AlertTriangle className="size-4" />;
    }
    return <Bell className="size-4" />;
  };

  const getTypeColor = (type) => {
    const category = categorizeNotificationType(type);
    if (category === "reschedule") return "bg-purple-100 text-purple-700 border-purple-300";
    if (category === "reservation" || category === "booking") {
      return "bg-blue-100 text-blue-700 border-blue-300";
    }
    if (category === "document") return "bg-amber-100 text-amber-700 border-amber-300";
    if (category === "payment") return "bg-green-100 text-green-700 border-green-300";
    if (String(type || "").toLowerCase() === "alert") {
      return "bg-red-100 text-red-700 border-red-300";
    }
    return "bg-slate-100 text-slate-700 border-slate-300";
  };

  const counts = React.useMemo(() => {
    const base = { all: notifications.length };
    for (const f of filters) {
      if (f.id !== "all") base[f.id] = 0;
    }
    for (const n of notifications) {
      const cat = categorizeNotificationType(n.type);
      if (base[cat] != null) base[cat] += 1;
    }
    return base;
  }, [notifications, filters]);

  const filteredNotifications = React.useMemo(() => {
    if (filter === "all") return notifications;
    return notifications.filter((n) => categorizeNotificationType(n.type) === filter);
  }, [notifications, filter]);

  const dialogDescription = (() => {
    if (!selectedNotif) return "Notification details";
    const category = categorizeNotificationType(selectedNotif.type);
    if (category === "reschedule") return "Rescheduling request update";
    if (category === "reservation") return "Reservation update";
    if (category === "booking") return "Booking update";
    if (category === "document") return "Document update";
    if (category === "payment") return "Payment update";
    return "General notification";
  })();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Notifications</CardTitle>
          <CardDescription>{listDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {filters.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {filters.map((f) => {
                const active = filter === f.id;
                const count = counts[f.id] ?? 0;
                return (
                  <Button
                    key={f.id}
                    type="button"
                    size="sm"
                    variant={active ? "default" : "outline"}
                    onClick={() => setFilter(f.id)}
                    className="gap-1.5"
                  >
                    {f.label}
                    <Badge
                      variant={active ? "secondary" : "outline"}
                      className="text-[10px] px-1.5 py-0 h-5 min-w-5 justify-center"
                    >
                      {count}
                    </Badge>
                  </Button>
                );
              })}
            </div>
          )}

          {loading ? (
            <div className="text-center text-muted-foreground py-8">
              Loading notifications...
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              {notifications.length === 0
                ? "No notifications yet."
                : `No ${filters.find((f) => f.id === filter)?.label.toLowerCase() || ""} notifications.`}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notif) => (
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
                      <p className="text-sm font-medium flex-1 whitespace-pre-wrap">
                        {notif.message}
                      </p>
                      {!notif.isRead && (
                        <Badge variant="secondary" className="text-[10px] shrink-0">
                          New
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">
                        {new Date(notif.sentAt).toLocaleString()}
                      </p>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${getTypeColor(notif.type)}`}
                      >
                        {displayNotificationTypeLabel(notif.type)}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={selectedNotif !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedNotif(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedNotif && getIcon(selectedNotif.type)}
              Notification Details
            </DialogTitle>
            <DialogDescription>{dialogDescription}</DialogDescription>
          </DialogHeader>
          {selectedNotif && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">Message</Label>
                <p className="text-sm bg-muted/30 rounded-md p-3 whitespace-pre-wrap">
                  {selectedNotif.message}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Type</Label>
                  <Badge
                    variant="outline"
                    className={`mt-1 ${getTypeColor(selectedNotif.type)}`}
                  >
                    {displayNotificationTypeLabel(selectedNotif.type)}
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
