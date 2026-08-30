"use client";

import * as React from "react";
import { PANEL_NOTIFICATIONS_UPDATED } from "@/lib/panel-notifications";

/**
 * @param {"client" | "staff"} audience
 * @param {{ scope?: string }} [options]
 */
export function useUnreadNotificationCount(audience, options = {}) {
  const scope = options.scope || "";
  const [unreadCount, setUnreadCount] = React.useState(0);

  const fetchUnreadCount = React.useCallback(async () => {
    const raw = localStorage.getItem("user_id");
    if (!raw) {
      setUnreadCount(0);
      return;
    }

    const id =
      audience === "client"
        ? raw.replace(/^CLT-/, "")
        : raw.replace(/^STF-/, "");

    if (!id) {
      setUnreadCount(0);
      return;
    }

    const scopeParam = scope ? `&scope=${encodeURIComponent(scope)}` : "";
    const param =
      audience === "client"
        ? `clientId=${id}&unreadCountOnly=true`
        : `staffId=${id}&unreadCountOnly=true${scopeParam}`;

    try {
      const res = await fetch(`/api/notifications?${param}`);
      const data = await res.json();
      if (res.ok && typeof data.unreadCount === "number") {
        setUnreadCount(data.unreadCount);
      }
    } catch (err) {
      console.error("Failed to fetch notification count:", err);
    }
  }, [audience, scope]);

  React.useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    const onUpdated = () => fetchUnreadCount();
    window.addEventListener(PANEL_NOTIFICATIONS_UPDATED, onUpdated);
    return () => {
      clearInterval(interval);
      window.removeEventListener(PANEL_NOTIFICATIONS_UPDATED, onUpdated);
    };
  }, [fetchUnreadCount]);

  return { unreadCount, refreshUnreadCount: fetchUnreadCount };
}
