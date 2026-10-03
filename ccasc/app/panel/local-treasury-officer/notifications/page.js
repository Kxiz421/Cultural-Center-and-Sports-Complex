"use client";

import { PanelNotificationsInbox } from "@/components/panel-notifications-inbox";
import { NOTIFICATION_FILTER_PRESETS } from "@/lib/panel-notifications";

export default function TreasuryNotificationsPage() {
  return (
    <PanelNotificationsInbox
      audience="staff"
      filters={NOTIFICATION_FILTER_PRESETS.staff}
      title="Notifications"
      description="Document submissions from clients and provincial agencies, plus account updates."
      listDescription="Filter by category to find what you need."
    />
  );
}
