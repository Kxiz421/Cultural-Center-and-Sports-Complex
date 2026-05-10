"use client";

import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarDays,
  Trophy,
  ClipboardList,
  Package,
  Boxes,
  Warehouse,
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

const navMain = [
  {
    title: "Dashboard",
    url: "/panel/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "User Management",
    url: "/panel/admin/user-management",
    icon: Users,
  },
  {
    title: "Facility Management",
    url: "/panel/admin/facilities",
    icon: Building2,
  },
  {
    title: "Cultural Calendar",
    url: "/panel/admin/calendar/cultural",
    icon: CalendarDays,
  },
  {
    title: "Sports Complex Calendar",
    url: "/panel/admin/calendar/sports",
    icon: Trophy,
  },
  {
    title: "Bookings",
    url: "/panel/admin/bookings",
    icon: ClipboardList,
  },
  {
    title: "Particulars Management",
    url: "/panel/admin/particulars",
    icon: Package,
  },
  {
    title: "Packages Management",
    url: "/panel/admin/packages",
    icon: Boxes,
  },
  {
    title: "Amenities Overview",
    url: "/panel/admin/amenities",
    icon: Warehouse,
  },
  {
    title: "Announcements",
    url: "/panel/admin/announcements",
    icon: Megaphone,
  },
];

export function AppSidebarCCASC(props) {
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
