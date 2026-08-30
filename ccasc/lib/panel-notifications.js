/** Fired when inbox notifications are read or refreshed — updates sidebar badges */
export const PANEL_NOTIFICATIONS_UPDATED = "panel-notifications-updated";

/** @deprecated use PANEL_NOTIFICATIONS_UPDATED */
export const CLIENT_NOTIFICATIONS_UPDATED = PANEL_NOTIFICATIONS_UPDATED;

export function notifyPanelNotificationsUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(PANEL_NOTIFICATIONS_UPDATED));
  }
}

/** @deprecated use notifyPanelNotificationsUpdated */
export function notifyClientNotificationsUpdated() {
  notifyPanelNotificationsUpdated();
}

/** Normalize stored notification.type into a filter category */
export function categorizeNotificationType(type) {
  const t = String(type || "general").toLowerCase().trim();
  if (t === "payment" || t.includes("payment")) return "payment";
  if (t === "reschedule" || t.includes("reschedul")) return "reschedule";
  if (t === "document" || t.includes("document") || t.includes("release")) {
    return "document";
  }
  if (
    t === "booking" ||
    t.includes("booking") ||
    t.includes("confirmation") ||
    t.includes("walk-in")
  ) {
    return "booking";
  }
  if (
    t === "reservation" ||
    t.includes("reservation")
  ) {
    return "reservation";
  }
  if (t === "alert") return "other";
  return "other";
}

export function displayNotificationTypeLabel(type) {
  const category = categorizeNotificationType(type);
  if (category === "payment") return "Payment";
  if (category === "reservation") return "Reservation";
  if (category === "booking") return "Booking";
  if (category === "reschedule") return "Rescheduling";
  if (category === "document") return "Document";
  return type || "General";
}

export const COORDINATOR_INBOX_CATEGORIES = ["reschedule", "document", "other"];

/** Staff inbox items for program coordinators (not client copies). */
export function isCoordinatorInboxNotification(notification) {
  const category = categorizeNotificationType(notification?.type);
  if (!COORDINATOR_INBOX_CATEGORIES.includes(category)) return false;
  const message = String(notification?.message || "").trim();
  if (/^your\b/i.test(message)) return false;
  return true;
}

export const NOTIFICATION_FILTER_PRESETS = {
  client: [
    { id: "all", label: "All" },
    { id: "payment", label: "Payments" },
    { id: "reservation", label: "Reservations" },
    { id: "reschedule", label: "Rescheduling" },
    { id: "document", label: "Documents" },
    { id: "other", label: "Other" },
  ],
  provincial: [
    { id: "all", label: "All" },
    { id: "payment", label: "Payments" },
    { id: "reservation", label: "Reservations" },
    { id: "reschedule", label: "Rescheduling" },
    { id: "document", label: "Documents" },
    { id: "other", label: "Other" },
  ],
  coordinator: [
    { id: "all", label: "All" },
    { id: "reschedule", label: "Rescheduling" },
    { id: "document", label: "Documents" },
    { id: "other", label: "Other" },
  ],
};
