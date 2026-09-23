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
  if (t === "announcement" || t.includes("announcement")) {
    return "announcement";
  }
  if (t === "alert") return "other";
  return "other";
}

export function displayNotificationTypeLabel(type) {
  const category = categorizeNotificationType(type);
  if (category === "announcement") return "Announcement";
  if (category === "payment") return "Payment";
  if (category === "reservation") return "Reservation";
  if (category === "booking") return "Booking";
  if (category === "reschedule") return "Rescheduling";
  if (category === "document") return "Document";
  return type || "General";
}

/**
 * Announcement bodies are stored with explicit labels so the title and the
 * message stay readable as separate fields anywhere a raw notification string
 * is shown (list rows, detail dialogs, history views).
 *
 *   "Title : <title>" + blank line + "Message : <message>"
 */
export const ANNOUNCEMENT_TITLE_LABEL = "Title";
export const ANNOUNCEMENT_MESSAGE_LABEL = "Message";

/** Build the stored body for an announcement notification. */
export function formatAnnouncementBody(title, content) {
  return `${ANNOUNCEMENT_TITLE_LABEL} : ${title}\n\n${ANNOUNCEMENT_MESSAGE_LABEL} : ${content}`;
}

/**
 * Split a stored announcement body back into its title and message.
 *
 * Understands both shapes:
 *   "Title : x\n\nMessage : y"  (current)
 *   "x\n\ny"                    (legacy - first paragraph was the title)
 *
 * @returns {{title: string, content: string}|null} null when there is nothing
 *   to split, so callers can fall back to rendering the raw text.
 */
export function parseAnnouncementBody(message) {
  const text = String(message ?? "").replace(/\r\n/g, "\n").trim();
  if (!text) return null;

  const titleMatch = text.match(/^title\s*:\s*(.+)$/im);
  if (titleMatch) {
    const remainder = text.slice(titleMatch.index + titleMatch[0].length).trim();
    const messageMatch = remainder.match(/^message\s*:\s*([\s\S]*)$/i);
    return {
      title: titleMatch[1].trim(),
      content: (messageMatch ? messageMatch[1] : remainder).trim(),
    };
  }

  // Legacy body: the first paragraph was the title, the rest the message.
  const paragraphs = text.split(/\n{2,}/);
  const content = paragraphs.slice(1).join("\n\n").trim();
  if (!content) return null;
  return { title: paragraphs[0].trim(), content };
}

/**
 * Categories a program coordinator's staff inbox shows. Announcements sent to
 * a coordinator role must not be filtered out of their inbox.
 */
export const COORDINATOR_INBOX_CATEGORIES = [
  "announcement",
  "reschedule",
  "document",
  "other",
];

/** Staff inbox items for program coordinators (not client copies). */
export function isCoordinatorInboxNotification(notification) {
  const category = categorizeNotificationType(notification?.type);
  // Announcements are always addressed to the recipient by name, so the
  // "Your ..." client-copy heuristic must never filter them out.
  if (category === "announcement") return true;
  if (!COORDINATOR_INBOX_CATEGORIES.includes(category)) return false;
  const message = String(notification?.message || "").trim();
  if (/^your\b/i.test(message)) return false;
  return true;
}

export const NOTIFICATION_FILTER_PRESETS = {
  client: [
    { id: "all", label: "All" },
    { id: "announcement", label: "Announcements" },
    { id: "payment", label: "Payments" },
    { id: "reservation", label: "Reservations" },
    { id: "reschedule", label: "Rescheduling" },
    { id: "document", label: "Documents" },
    { id: "other", label: "Other" },
  ],
  provincial: [
    { id: "all", label: "All" },
    { id: "announcement", label: "Announcements" },
    { id: "payment", label: "Payments" },
    { id: "reservation", label: "Reservations" },
    { id: "reschedule", label: "Rescheduling" },
    { id: "document", label: "Documents" },
    { id: "other", label: "Other" },
  ],
  coordinator: [
    { id: "all", label: "All" },
    { id: "announcement", label: "Announcements" },
    { id: "reschedule", label: "Rescheduling" },
    { id: "document", label: "Documents" },
    { id: "other", label: "Other" },
  ],
  staff: [
    { id: "all", label: "All" },
    { id: "announcement", label: "Announcements" },
    { id: "booking", label: "Bookings" },
    { id: "reservation", label: "Reservations" },
    { id: "payment", label: "Payments" },
    { id: "document", label: "Documents" },
    { id: "reschedule", label: "Rescheduling" },
    { id: "other", label: "Other" },
  ],
};
