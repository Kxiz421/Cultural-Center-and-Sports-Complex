"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppSidebarCCASC } from "@/components/app-sidebar-ccasc";
import { SiteHeaderCCASC } from "@/components/site-header-ccasc";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

const TITLES = {
  "/panel/admin/dashboard": "Dashboard",
  "/panel/admin/user-management": "User Management",
  "/panel/admin/facilities": "Facility Management",
  "/panel/admin/calendar/cultural": "Cultural Calendar",
  "/panel/admin/calendar/sports": "Sports Complex Calendar",
  "/panel/admin/bookings": "Bookings",
  "/panel/admin/particulars": "Particulars Management",
  "/panel/admin/packages": "Packages Management",
  "/panel/admin/amenities": "Amenities Overview",
  "/panel/admin/announcements": "Announcements",
};

function AdminAuthShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = React.useState(false);
  const [displayName, setDisplayName] = React.useState("");

  React.useEffect(() => {
    try {
      const userId = window.localStorage.getItem("user_id");
      const role = window.localStorage.getItem("role");
      const first = window.localStorage.getItem("firstname") ?? "";
      const last = window.localStorage.getItem("lastname") ?? "";
      if (!userId || role !== "admin") {
        router.replace("/login");
        return;
      }
      setDisplayName(`${first} ${last}`.trim() || "Administrator");
    } catch {
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  const title = TITLES[pathname] ?? "Administration";

  return (
    <SidebarProvider>
      <AppSidebarCCASC />
      <SidebarInset>
        <SiteHeaderCCASC title={title} />
        <div className="border-b bg-muted/40 px-4 py-2 text-sm lg:px-6">
          Signed in as{" "}
          <span className="font-medium text-foreground">{displayName}</span>
          {" · "}
          <span className="text-muted-foreground">Administrator</span>
        </div>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function AdminLayout({ children }) {
  return <AdminAuthShell>{children}</AdminAuthShell>;
}
