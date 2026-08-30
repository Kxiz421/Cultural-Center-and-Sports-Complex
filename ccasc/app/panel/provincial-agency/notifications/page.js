"use client";

import { PanelNotificationsInbox } from "@/components/panel-notifications-inbox";
import { NOTIFICATION_FILTER_PRESETS } from "@/lib/panel-notifications";

export default function ProvincialNotificationsPage() {
  return (
    <PanelNotificationsInbox
      audience="client"
      filters={NOTIFICATION_FILTER_PRESETS.provincial}
      description="Stay updated on your bookings, payments, documents, and announcements."
      listDescription="Filter by category to find payments, reservations, rescheduling, and document updates."
    />
  );
}
