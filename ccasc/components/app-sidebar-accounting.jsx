"use client";

import {
  LayoutDashboard,
  CalendarDays,
  ClipboardList,
  UserPlus,
  FileBarChart,
  Trophy,
  Bell,
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
    url: "/panel/accounting-clerk/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Reservations",
    url: "/panel/accounting-clerk/reservations",
    icon: ClipboardList,
  },
  {
    title: "Facility Calendar",
    url: "/panel/accounting-clerk/calendar",
    icon: CalendarDays,
  },
  {
    title: "Walk-In Reservation",
    url: "/panel/accounting-clerk/walk-in",
    icon: UserPlus,
  },
  {
    title: "Notifications",
    url: "/panel/accounting-clerk/notifications",
    icon: Bell,
    showBadge: true,
  },
  {
    title: "Report Generation",
    url: "/panel/accounting-clerk/reports",
    icon: FileBarChart,
  },
];

export function AppSidebarAccounting(props) {
  const { unreadCount } = useUnreadNotificationCount("staff");

  const navItems = navMain.map((item) =>
    item.url === "/panel/accounting-clerk/notifications"
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
                  Cultural Center & Sports Complex
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