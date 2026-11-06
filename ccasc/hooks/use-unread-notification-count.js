"use client";

import * as React from "react";
import { PANEL_NOTIFICATIONS_UPDATED } from "@/lib/panel-notifications";
import {
  playNotificationSound,
  primeNotificationSound,
} from "@/lib/notification-sound";

/** How often the unread count is re-checked (real-time-ish, no server push). */
const POLL_MS = 15000;

/**
 * @param {"client" | "staff"} audience
 * @param {{ scope?: string }} [options]
 */
export function useUnreadNotificationCount(audience, options = {}) {
  const scope = options.scope || "";
  const [unreadCount, setUnreadCount] = React.useState(0);
  // null until the first response, so the first load never plays the chime.
  const previousCountRef = React.useRef(null);

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
        const next = data.unreadCount;
        // A rising count means a new notification just arrived — play the chime.
        if (previousCountRef.current !== null && next > previousCountRef.current) {
          playNotificationSound();
        }
        previousCountRef.current = next;
        setUnreadCount(next);
      }
    } catch (err) {
      console.error("Failed to fetch notification count:", err);
    }
  }, [audience, scope]);

  React.useEffect(() => {
    const stopPriming = primeNotificationSound();
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, POLL_MS);
    const onUpdated = () => fetchUnreadCount();
    window.addEventListener(PANEL_NOTIFICATIONS_UPDATED, onUpdated);
    return () => {
      stopPriming();
      clearInterval(interval);
      window.removeEventListener(PANEL_NOTIFICATIONS_UPDATED, onUpdated);
    };
  }, [fetchUnreadCount]);

  return { unreadCount, refreshUnreadCount: fetchUnreadCount };
}
