"use client";

import {
  LayoutDashboard,
  CalendarDays,
  ClipboardList,
  UserPlus,
  FileBarChart,
  Trophy,
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
    title: "Report Generation",
    url: "/panel/accounting-clerk/reports",
    icon: FileBarChart,
  },
];

export function AppSidebarAccounting(props) {
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
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUserCCASC />
      </SidebarFooter>
    </Sidebar>
  );
}