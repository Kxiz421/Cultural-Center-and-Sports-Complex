"use client";

import { PanelNotificationsInbox } from "@/components/panel-notifications-inbox";
import { NOTIFICATION_FILTER_PRESETS } from "@/lib/panel-notifications";

export default function AccountingClerkNotificationsPage() {
  return (
    <PanelNotificationsInbox
      audience="staff"
      filters={NOTIFICATION_FILTER_PRESETS.staff}
      description="Stay updated on reservations, payments, documents, and announcements."
      listDescription="Filter by category to find reservations, payments, documents, and announcements."
    />
  );
}