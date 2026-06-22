"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";

export default function NotificationsPage() {
  const [notifications, setNotifications] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  const fetchNotifications = React.useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  async function markAsRead(notificationId) {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId })
      });
      if (!res.ok) throw new Error('Failed to mark as read');
      setNotifications((prev) =>
        prev.filter((n) => n.notificationId !== notificationId)
      );
      toast.success("Notification marked as read");
    } catch (err) {
      toast.error("Failed to mark notification as read");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground text-sm">
            View updates, announcements, and document notifications
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-8">Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <Bell className="size-8 text-muted-foreground" />
          <p className="text-muted-foreground">No new notifications</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <Card key={notification.notificationId}>
              <CardContent className="flex items-start justify-between p-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {notification.type || "General"}
                    </Badge>
                  </div>
                  <p className="text-sm">{notification.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {notification.sentAt
                      ? new Date(notification.sentAt).toLocaleString()
                      : "—"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markAsRead(notification.notificationId)}
                >
                  <CheckCheck className="size-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}