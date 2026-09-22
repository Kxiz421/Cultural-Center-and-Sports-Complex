"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AppSidebarCoordinator } from "@/components/app-sidebar-coordinator";
import { SiteHeaderCCASC } from "@/components/site-header-ccasc";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

const TITLES = {
  "/panel/program-coordinator/dashboard": "Dashboard",
  "/panel/program-coordinator/calendar": "Facility Calendar",
  "/panel/program-coordinator/bookings": "Booking Confirmation",
  "/panel/program-coordinator/rescheduling": "Rescheduling",
  "/panel/program-coordinator/notifications": "Notifications",
  "/panel/program-coordinator/reports": "Report Generation",
  "/panel/program-coordinator/reservations": "Reservations",
};

function CoordinatorAuthShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = React.useState(false);
  const [displayName, setDisplayName] = React.useState("");
  const { data: session, status } = useSession();
  const [venueType, setVenueType] = React.useState("");

  React.useEffect(() => {
    if (status === "loading") return;

    try {
      // Identity comes from the signed session cookie (proxy.js gates first).
      const userId = session?.user?.userId ?? null;
      const role = session?.user?.type ?? null;

      if (!userId || !role) {
        router.replace("/login");
        return;
      }

      const first = session?.user?.firstName ?? "";
      const last = session?.user?.lastName ?? "";
      const name = `${first} ${last}`.trim() || "Program Coordinator";

      // Venue comes from the coordinator's session type
      const userType = session?.user?.type ?? "";
      const venue = userType === "program coordinator sports" ? "Sports Complex" : "Cultural Center";

      requestAnimationFrame(() => {
        setDisplayName(name);
        setVenueType(venue);
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

  const title = TITLES[pathname] ?? "Program Coordinator";

  return (
    <SidebarProvider>
      <AppSidebarCoordinator venueType={venueType} />
      <SidebarInset>
        <SiteHeaderCCASC title={title} />
        <div className="border-b bg-muted/50 px-4 py-2.5 text-sm text-foreground lg:px-6">
          Signed in as{" "}
          <span className="font-medium text-foreground">{displayName}</span>
          {" · "}
          <span className="text-foreground/75">Program Coordinator — {venueType}</span>
        </div>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function CoordinatorLayout({ children }) {
  return <CoordinatorAuthShell>{children}</CoordinatorAuthShell>;
}