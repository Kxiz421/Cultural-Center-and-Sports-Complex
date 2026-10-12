"use client";

import {
  LayoutDashboard,
  Wallet,
  BellRing,
  XCircle,
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
import { PAGE_LOGO } from "@/lib/constants";
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
    title: "Notifications",
    url: "/panel/local-treasury-officer/notifications",
    icon: BellRing,
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
            <SidebarMenuButton className="h-auto items-center gap-2 py-3">
              <img src={PAGE_LOGO} alt="" className="size-8 shrink-0" />
              <span className="min-w-0 text-base font-semibold leading-tight">
                South Cotabato Gymnasium
                <span className="block text-xs font-normal text-white/70">
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