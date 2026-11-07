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
import { PAGE_LOGO } from "@/lib/constants";

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
            <SidebarMenuButton className="h-auto items-center gap-2 py-3">
              <img src={PAGE_LOGO} alt="" className="size-8 shrink-0" />
              <span className="min-w-0 text-base font-semibold leading-tight">
                South Cotabato Gymnasium
                <span className="block text-xs font-normal text-white/70">
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