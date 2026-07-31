"use client";

import {
  LayoutDashboard,
  Wallet,
  BellRing,
  XCircle,
  FileText,
  FileBarChart,
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
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUserCCASC />
      </SidebarFooter>
    </Sidebar>
  );
}