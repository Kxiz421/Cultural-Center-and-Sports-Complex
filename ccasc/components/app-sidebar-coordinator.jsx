"use client";

import {
  LayoutDashboard,
  CalendarDays,
  ClipboardCheck,
  CalendarSync,
  Package,
  FileBarChart,
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

const navMain = [
  {
    title: "Dashboard",
    url: "/panel/program-coordinator/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Facility Calendar",
    url: "/panel/program-coordinator/calendar",
    icon: CalendarDays,
  },
  {
    title: "Booking Confirmation",
    url: "/panel/program-coordinator/bookings",
    icon: ClipboardCheck,
  },
  {
    title: "Rescheduling",
    url: "/panel/program-coordinator/rescheduling",
    icon: CalendarSync,
  },
  {
    title: "Amenities Management",
    url: "/panel/program-coordinator/amenities",
    icon: Package,
  },
  {
    title: "Notifications",
    url: "/panel/program-coordinator/notifications",
    icon: Bell,
  },
  {
    title: "Report Generation",
    url: "/panel/program-coordinator/reports",
    icon: FileBarChart,
  },
];

export function AppSidebarCoordinator(props) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="h-auto py-3">
              <span className="text-base font-semibold leading-tight">
                South Cotabato Gymnasium
                <span className="text-muted-foreground block text-xs font-normal">
                  Cultural Center — Program Coordinator
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