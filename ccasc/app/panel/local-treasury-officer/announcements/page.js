"use client";

import { PanelNotificationsInbox } from "@/components/panel-notifications-inbox";
import { NOTIFICATION_FILTER_PRESETS } from "@/lib/panel-notifications";

export default function TreasuryInboxPage() {
  return (
    <PanelNotificationsInbox
      audience="staff"
      filters={NOTIFICATION_FILTER_PRESETS.staff}
      title="Announcements"
      description="Notices sent by the administration, marked as announcements."
      listDescription="Filter by category to find announcements and account updates."
    />
  );
}