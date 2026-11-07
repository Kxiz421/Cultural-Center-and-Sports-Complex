"use client";

import {
  LayoutDashboard,
  Wallet,
  XCircle,
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
import { PAGE_LOGO } from "@/lib/constants";

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
    title: "Booking Cancellation",
    url: "/panel/local-treasury-officer/cancellations",
    icon: XCircle,
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
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUserCCASC />
      </SidebarFooter>
    </Sidebar>
  );
}