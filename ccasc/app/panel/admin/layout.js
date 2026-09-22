"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AppSidebarCCASC } from "@/components/app-sidebar-ccasc";
import { SiteHeaderCCASC } from "@/components/site-header-ccasc";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

const TITLES = {
  "/panel/admin/dashboard": "Dashboard",
  "/panel/admin/user-management": "User Management",
  "/panel/admin/facilities": "Facility Management",
  "/panel/admin/calendar": "Combined Calendar",
  "/panel/admin/bookings": "Bookings",
  "/panel/admin/particulars": "Particulars Management",
  "/panel/admin/packages": "Packages Management",
  "/panel/admin/amenities": "Amenities Overview",
  "/panel/admin/announcements": "Announcements",
  "/panel/admin/reports": "Sales Reports",
};

function AdminAuthShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = React.useState(false);
  const [displayName, setDisplayName] = React.useState("");
  const { data: session, status } = useSession();

  React.useEffect(() => {
    if (status === "loading") return;

    try {
      // Identity comes from the signed session cookie (proxy.js gates first).
      const userId = session?.user?.userId ?? null;
      const role = session?.user?.type ?? null;
      
      if (!userId || role !== "admin") {
        router.replace("/login");
        return;
      }
      
      // Move display name logic outside setReady to prevent cascade
      const first = session?.user?.firstName ?? "";
      const last = session?.user?.lastName ?? "";
      const name = `${first} ${last}`.trim() || "Administrator";
      
      requestAnimationFrame(() => {
        setDisplayName(name);
        setReady(true); 
      });
    } catch {
      router.replace("/login");
      return;
    } 
  }, [router, session, status]);

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
        <div className="border-b bg-muted/50 px-4 py-2.5 text-sm text-foreground lg:px-6">
          Signed in as{" "}
          <span className="font-medium text-foreground">{displayName}</span>
          {" · "}
          <span className="text-foreground/75">Administrator</span>
        </div>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function AdminLayout({ children }) {
  return <AdminAuthShell>{children}</AdminAuthShell>;
}