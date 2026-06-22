"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCircle, Calendar, FileText, AlertTriangle } from "lucide-react";

export default function ClientNotificationsPage() {
  const [notifications, setNotifications] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
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
    fetchNotifications();
  }, []);

  const getIcon = (type) => {
    if (type === "booking") return <Calendar className="size-4" />;
    if (type === "document") return <FileText className="size-4" />;
    if (type === "alert") return <AlertTriangle className="size-4" />;
    return <Bell className="size-4" />;
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
                  className={`flex items-start gap-4 rounded-lg border p-4 transition-colors ${
                    notif.isRead ? "bg-background" : "bg-muted/30"
                  }`}
                >
                  <div className="mt-0.5 text-muted-foreground">
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{notif.message}</p>
                      {!notif.isRead && (
                        <Badge variant="secondary" className="text-[10px]">New</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(notif.sentAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}