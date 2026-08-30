"use client";

import { PanelNotificationsInbox } from "@/components/panel-notifications-inbox";
import { NOTIFICATION_FILTER_PRESETS } from "@/lib/panel-notifications";

export default function CoordinatorNotificationsPage() {
  return (
    <PanelNotificationsInbox
      audience="staff"
      scope="coordinator"
      filters={NOTIFICATION_FILTER_PRESETS.coordinator}
      description="Stay updated on rescheduling requests, document submissions, and announcements."
      listDescription="Filter by rescheduling, documents, and other announcements."
    />
  );
}
