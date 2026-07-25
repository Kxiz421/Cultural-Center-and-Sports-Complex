"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppSidebarCoordinator } from "@/components/app-sidebar-coordinator";
import { SiteHeaderCCASC } from "@/components/site-header-ccasc";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

const TITLES = {
  "/panel/program-coordinator/dashboard": "Dashboard",
  "/panel/program-coordinator/calendar": "Facility Calendar",
  "/panel/program-coordinator/bookings": "Booking Confirmation",
  "/panel/program-coordinator/rescheduling": "Rescheduling",
  "/panel/program-coordinator/amenities": "Amenities Management",
  "/panel/program-coordinator/reports": "Report Generation",
};

function CoordinatorAuthShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = React.useState(false);
  const [displayName, setDisplayName] = React.useState("");

  React.useEffect(() => {
    try {
      const userId = window.localStorage.getItem("user_id");
      const role = window.localStorage.getItem("role");

      if (!userId || role !== "program coordinator") {
        router.replace("/login");
        return;
      }

      const first = window.localStorage.getItem("firstname") ?? "";
      const last = window.localStorage.getItem("lastname") ?? "";
      const name = `${first} ${last}`.trim() || "Program Coordinator";

      requestAnimationFrame(() => {
        setDisplayName(name);
        setReady(true);
      });
    } catch {
      router.replace("/login");
      return;
    }
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  const title = TITLES[pathname] ?? "Program Coordinator";

  return (
    <SidebarProvider>
      <AppSidebarCoordinator />
      <SidebarInset>
        <SiteHeaderCCASC title={title} />
        <div className="border-b bg-muted/40 px-4 py-2 text-sm lg:px-6">
          Signed in as{" "}
          <span className="font-medium text-foreground">{displayName}</span>
          {" · "}
          <span className="text-muted-foreground">Program Coordinator — Cultural Center</span>
        </div>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function CoordinatorLayout({ children }) {
  return <CoordinatorAuthShell>{children}</CoordinatorAuthShell>;
}