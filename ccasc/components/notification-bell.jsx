"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Megaphone,
  Calendar,
  ClipboardCheck,
  FileText,
  RefreshCw,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  categorizeNotificationType,
  displayNotificationTypeLabel,
  notifyPanelNotificationsUpdated,
  parseAnnouncementBody,
  NOTIFICATION_FILTER_PRESETS,
} from "@/lib/panel-notifications";
import { useUnreadNotificationCount } from "@/hooks/use-unread-notification-count";

const PAGE_SIZE = 5;

function iconForCategory(category) {
  if (category === "booking") return <ClipboardCheck className="size-4" />;
  if (category === "reservation") return <Calendar className="size-4" />;
  if (category === "document") return <FileText className="size-4" />;
  if (category === "reschedule") return <RefreshCw className="size-4" />;
  if (category === "announcement") return <Megaphone className="size-4" />;
  if (category === "payment") return <CreditCard className="size-4" />;
  return <Bell className="size-4" />;
}

function readLocalId(audience) {
  if (typeof window === "undefined") return "";
  const raw = localStorage.getItem("user_id") || "";
  return audience === "client" ? raw.replace(/^CLT-/, "") : raw.replace(/^STF-/, "");
}

export function NotificationBell({ audience = "staff", scope = "" }) {
  const router = useRouter();
  const pathname = usePathname();
  const { unreadCount, refreshUnreadCount } = useUnreadNotificationCount(audience, { scope });

  const [open, setOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [filter, setFilter] = React.useState("all");
  const [selected, setSelected] = React.useState(null);
  const [markingAll, setMarkingAll] = React.useState(false);
  const containerRef = React.useRef(null);

  const queryKey = audience === "client" ? "clientId" : "staffId";

  const load = React.useCallback(async () => {
    const id = readLocalId(audience);
    if (!id) return;
    setLoading(true);
    try {
      const scopeParam = scope ? `&scope=${encodeURIComponent(scope)}` : "";
      const res = await fetch(`/api/notifications?${queryKey}=${id}${scopeParam}`);
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [audience, queryKey, scope]);

  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const filterPresets =
    audience === "client"
      ? NOTIFICATION_FILTER_PRESETS.client
      : scope === "coordinator"
        ? NOTIFICATION_FILTER_PRESETS.coordinator
        : NOTIFICATION_FILTER_PRESETS.staff;

  const filteredNotifications = React.useMemo(() => {
    if (filter === "all") return notifications;
    if (filter === "unread") return notifications.filter((n) => !n.isRead);
    return notifications.filter(
      (n) => categorizeNotificationType(n.type) === filter
    );
  }, [notifications, filter]);

  const totalPages = Math.max(1, Math.ceil(filteredNotifications.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filteredNotifications.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const selectedBody =
    selected && categorizeNotificationType(selected.type) === "announcement"
      ? parseAnnouncementBody(selected.message)
      : null;

  const markOneRead = async (notification) => {
    if (notification.isRead) return;
    try {
      await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: notification.id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
      );
      notifyPanelNotificationsUpdated();
      refreshUnreadCount();
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const markAllRead = async () => {
    const id = readLocalId(audience);
    if (!id) return;
    setMarkingAll(true);
    try {
      await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true, [queryKey]: id, scope }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      notifyPanelNotificationsUpdated();
      refreshUnreadCount();
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    } finally {
      setMarkingAll(false);
    }
  };

  const handleItemClick = (notification) => {
    markOneRead(notification);
    if (notification.link) {
      setOpen(false);
      router.push(notification.link);
      return;
    }
    setSelected(notification);
  };

  const panel = pathname?.split("/")[2] || "";
  const viewAllHref =
    panel === "admin" ? "/panel/admin/announcements" : `/panel/${panel}/notifications`;

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="relative text-white hover:bg-white/10 hover:text-white"
        onClick={() => {
          const next = !open;
          setPage(1);
          setOpen(next);
          if (next) load();
        }}
        aria-label={
          unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"
        }
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="fixed inset-x-2 top-16 z-50 overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:mt-2 sm:w-[26rem]">
          <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
            <span className="text-sm font-semibold">Notifications</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={markAllRead}
              disabled={markingAll || unreadCount === 0}
            >
              Mark all as read
            </Button>
          </div>

          <div className="flex flex-wrap gap-1 border-b px-3 py-2">
            {filterPresets.map((preset) => (
              <Button
                key={preset.id}
                type="button"
                size="sm"
                variant={filter === preset.id ? "default" : "outline"}
                className="h-6 rounded-full px-2 text-[11px]"
                onClick={() => {
                  setFilter(preset.id);
                  setPage(1);
                }}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <p className="p-4 text-center text-sm text-muted-foreground">Loading…</p>
            ) : filteredNotifications.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">
                No notifications in this category.
              </p>
            ) : (
              pageItems.map((notification) => {
                const category = categorizeNotificationType(notification.type);
                const announcement =
                  category === "announcement"
                    ? parseAnnouncementBody(notification.message)
                    : null;
                const title = announcement ? announcement.title : notification.message;
                return (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => handleItemClick(notification)}
                    className={`flex w-full items-start gap-3 border-b px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-muted/50 ${
                      notification.isRead ? "" : "bg-muted/30"
                    }`}
                  >
                    <span className="mt-0.5 shrink-0 text-muted-foreground">
                      {iconForCategory(category)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span
                          className={`min-w-0 flex-1 truncate text-sm ${
                            notification.isRead ? "font-normal" : "font-semibold"
                          }`}
                        >
                          {title}
                        </span>
                        {!notification.isRead && (
                          <span className="size-2 shrink-0 rounded-full bg-red-600" />
                        )}
                      </span>
                      {announcement && (
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {announcement.content}
                        </span>
                      )}
                      <span className="mt-1 flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {displayNotificationTypeLabel(notification.type)}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(notification.sentAt).toLocaleString()}
                        </span>
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-2 border-t px-2 py-1.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={safePage === 1}
              >
                Prev
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {safePage} of {totalPages}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                disabled={safePage === totalPages}
              >
                Next
              </Button>
            </div>
          )}

          <div className="border-t px-3 py-1.5 text-center">
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
              onClick={() => {
                setOpen(false);
                router.push(viewAllHref);
              }}
            >
              View all notifications
            </button>
          </div>
        </div>
      )}

      <Dialog
        open={selected !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setSelected(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="size-4" />
              Notification Details
            </DialogTitle>
            <DialogDescription>
              {selected ? displayNotificationTypeLabel(selected.type) : ""}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 py-2">
              {selectedBody ? (
                <>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">Title</Label>
                    <p className="rounded-md bg-muted/30 p-3 text-sm break-words">
                      {selectedBody.title}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">Message</Label>
                    <p className="rounded-md bg-muted/30 p-3 text-sm whitespace-pre-wrap break-words">
                      {selectedBody.content}
                    </p>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">Message</Label>
                  <p className="rounded-md bg-muted/30 p-3 text-sm whitespace-pre-wrap break-words">
                    {selected.message}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Type</Label>
                  <div className="mt-1">
                    <Badge variant="outline">
                      {displayNotificationTypeLabel(selected.type)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Status</Label>
                  <p className="mt-1 text-sm font-medium">
                    {selected.isRead ? "Read" : "Unread"}
                  </p>
                </div>
                <div className="col-span-2">
                  <Label className="text-muted-foreground text-xs">Received</Label>
                  <p className="mt-1 text-sm font-medium">
                    {new Date(selected.sentAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            {selected?.link && (
              <Button
                type="button"
                onClick={() => {
                  const link = selected.link;
                  setSelected(null);
                  setOpen(false);
                  router.push(link);
                }}
              >
                Open
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => setSelected(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default NotificationBell;
