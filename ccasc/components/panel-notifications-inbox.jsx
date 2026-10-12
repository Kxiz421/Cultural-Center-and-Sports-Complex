"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
  Megaphone,
  CheckCheck,
} from "lucide-react";
import { Pagination } from "@/components/pagination";
import {
  ANNOUNCEMENT_MESSAGE_LABEL,
  ANNOUNCEMENT_TITLE_LABEL,
  categorizeNotificationType,
  displayNotificationTypeLabel,
  notifyPanelNotificationsUpdated,
  parseAnnouncementBody,
} from "@/lib/panel-notifications";

const PAGE_SIZE = 10;

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
  const [page, setPage] = React.useState(1);
  const [markingAll, setMarkingAll] = React.useState(false);
  const router = useRouter();

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

  async function markAllAsRead() {
    const raw = localStorage.getItem("user_id");
    const id =
      audience === "client"
        ? raw?.replace(/^CLT-/, "")
        : raw?.replace(/^STF-/, "");
    if (!id) return;
    setMarkingAll(true);
    try {
      const res = await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true, [queryKey]: id, scope }),
      });
      if (!res.ok) throw new Error("Failed to mark all as read");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      notifyPanelNotificationsUpdated();
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    } finally {
      setMarkingAll(false);
    }
  }

  function handleNotificationClick(notif) {
    if (!notif.isRead) {
      markAsRead(notif.id);
    }
    // A document notice deep-links into the relevant module; open the target
    // instead of the generic details dialog.
    if (notif.link) {
      router.push(notif.link);
      return;
    }
    setSelectedNotif(notif);
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
    if (category === "announcement") return <Megaphone className="size-4" />;
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
    if (category === "announcement") {
      return "bg-indigo-100 text-indigo-700 border-indigo-300";
    }
    if (category === "payment") return "bg-green-100 text-green-700 border-green-300";
    if (String(type || "").toLowerCase() === "alert") {
      return "bg-red-100 text-red-700 border-red-300";
    }
    return "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600";
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
    base.unread = notifications.filter((n) => !n.isRead).length;
    return base;
  }, [notifications, filters]);

  const filteredNotifications = React.useMemo(() => {
    if (filter === "all") return notifications;
    if (filter === "unread") return notifications.filter((n) => !n.isRead);
    return notifications.filter((n) => categorizeNotificationType(n.type) === filter);
  }, [notifications, filter]);

  const totalPages = Math.max(1, Math.ceil(filteredNotifications.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedNotifications = filteredNotifications.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const dialogDescription = (() => {
    if (!selectedNotif) return "Notification details";
    const category = categorizeNotificationType(selectedNotif.type);
    if (category === "reschedule") return "Rescheduling request update";
    if (category === "reservation") return "Reservation update";
    if (category === "booking") return "Booking update";
    if (category === "document") return "Document update";
    if (category === "announcement") return "Announcement from the administration";
    if (category === "payment") return "Payment update";
    return "General notification";
  })();

  // Announcements carry a labelled body - show title and message as separate
  // fields instead of one run-on block of text.
  const selectedNotifBody =
    selectedNotif &&
    categorizeNotificationType(selectedNotif.type) === "announcement"
      ? parseAnnouncementBody(selectedNotif.message)
      : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div className="space-y-1.5">
            <CardTitle>Recent Notifications</CardTitle>
            <CardDescription>{listDescription}</CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5"
            onClick={markAllAsRead}
            disabled={markingAll || notifications.every((n) => n.isRead)}
          >
            <CheckCheck className="size-4" />
            Mark all as read
          </Button>
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
                    onClick={() => {
                      setFilter(f.id);
                      setPage(1);
                    }}
                    className="gap-1.5"
                  >
                    {f.label}
                    <Badge
                      variant={active ? "secondary" : "outline"}
                      className="text-xs px-1.5 py-0 h-5 min-w-5 justify-center"
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
            <>
              <div className="divide-y overflow-hidden rounded-lg border">
                {paginatedNotifications.map((notif) => {
                  const announcementBody =
                    categorizeNotificationType(notif.type) === "announcement"
                      ? parseAnnouncementBody(notif.message)
                      : null;
                  const subject = announcementBody
                    ? announcementBody.title
                    : notif.message;
                  return (
                    <div
                      key={notif.id}
                      className={`flex cursor-pointer items-start gap-3 p-3 transition-colors hover:bg-muted/50 ${
                        notif.isRead ? "" : "bg-primary/5"
                      }`}
                      onClick={() => handleNotificationClick(notif)}
                    >
                      <span
                        className={`mt-2 size-2 shrink-0 rounded-full ${
                          notif.isRead ? "bg-transparent" : "bg-primary"
                        }`}
                      />
                      <span className="mt-0.5 shrink-0 text-muted-foreground">
                        {getIcon(notif.type)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={`min-w-0 flex-1 break-words text-sm ${
                              notif.isRead
                                ? "font-medium text-muted-foreground"
                                : "font-semibold"
                            }`}
                          >
                            {subject}
                          </p>
                          <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                            {new Date(notif.sentAt).toLocaleString()}
                          </span>
                        </div>
                        {announcementBody && (
                          <p className="mt-0.5 line-clamp-2 break-words text-xs text-muted-foreground">
                            {announcementBody.content}
                          </p>
                        )}
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <Badge
                            variant="outline"
                            className={`text-xs ${getTypeColor(notif.type)}`}
                          >
                            {displayNotificationTypeLabel(notif.type)}
                          </Badge>
                          {!notif.isRead && (
                            <Badge variant="secondary" className="text-xs">
                              New
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="shrink-0 self-center"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleNotificationClick(notif);
                        }}
                      >
                        View
                      </Button>
                    </div>
                  );
                })}
              </div>
              <Pagination
                page={safePage}
                pageSize={PAGE_SIZE}
                total={filteredNotifications.length}
                onPageChange={setPage}
                itemLabel="notifications"
              />
            </>
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
              {selectedNotifBody ? (
                <>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">
                      {ANNOUNCEMENT_TITLE_LABEL}
                    </Label>
                    <p className="text-sm bg-muted/30 rounded-md p-3 break-words">
                      {selectedNotifBody.title}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">
                      {ANNOUNCEMENT_MESSAGE_LABEL}
                    </Label>
                    <p className="text-sm bg-muted/30 rounded-md p-3 whitespace-pre-wrap break-words">
                      {selectedNotifBody.content}
                    </p>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">Message</Label>
                  <p className="text-sm bg-muted/30 rounded-md p-3 whitespace-pre-wrap break-words">
                    {selectedNotif.message}
                  </p>
                </div>
              )}
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
