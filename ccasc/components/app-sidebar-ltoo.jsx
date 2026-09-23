"use client";

import {
  LayoutDashboard,
  Wallet,
  BellRing,
  XCircle,
  FileText,
  FileBarChart,
  Megaphone,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { NavMain } from "@/components/nav-main";
import { NavUserCCASC } from "@/components/nav-user-ccasc";
import { useUnreadNotificationCount } from "@/hooks/use-unread-notification-count";

const navMain = [
  {
    title: "Dashboard",
    url: "/panel/local-treasury-officer/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Payment Recording",
    url: "/panel/local-treasury-officer/payments",
    icon: Wallet,
  },
  {
    title: "Notifications",
    url: "/panel/local-treasury-officer/notifications",
    icon: BellRing,
  },
  {
    title: "Announcements",
    url: "/panel/local-treasury-officer/announcements",
    icon: Megaphone,
    showBadge: true,
  },
  {
    title: "Booking Cancellation",
    url: "/panel/local-treasury-officer/cancellations",
    icon: XCircle,
  },
  {
    title: "Documents",
    url: "/panel/local-treasury-officer/documents",
    icon: FileText,
  },
  {
    title: "Report Generation",
    url: "/panel/local-treasury-officer/reports",
    icon: FileBarChart,
  },
];

export function AppSidebarLTOO(props) {
  const { unreadCount } = useUnreadNotificationCount("staff");

  const navItems = navMain.map((item) =>
    item.url === "/panel/local-treasury-officer/announcements"
      ? { ...item, showBadge: true, badgeCount: unreadCount }
      : item
  );
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="h-auto py-3">
              <span className="text-base font-semibold leading-tight">
                South Cotabato Gymnasium
                <span className="text-muted-foreground block text-xs font-normal">
                  Local Treasury Operations Officer
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUserCCASC />
      </SidebarFooter>
    </Sidebar>
  );
}