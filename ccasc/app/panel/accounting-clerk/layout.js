"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AppSidebarAccounting } from "@/components/app-sidebar-accounting";
import { SiteHeaderCCASC } from "@/components/site-header-ccasc";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

const TITLES = {
  "/panel/accounting-clerk/dashboard": "Dashboard",
  "/panel/accounting-clerk/reservations": "Reservations",
  "/panel/accounting-clerk/calendar": "Facility Calendar",
  "/panel/accounting-clerk/cultural": "Cultural Calendar",
  "/panel/accounting-clerk/walk-in": "Walk-In Reservation",
  "/panel/accounting-clerk/notifications": "Notifications",
  "/panel/accounting-clerk/reports": "Report Generation",
};

function AccountingAuthShell({ children }) {
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

      if (!userId || role !== "accounting clerk") {
        router.replace("/login");
        return;
      }

      const first = session?.user?.firstName ?? "";
      const last = session?.user?.lastName ?? "";
      const name = `${first} ${last}`.trim() || "Accounting Clerk";

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

  const title = TITLES[pathname] ?? "Accounting Clerk";

  return (
    <SidebarProvider>
      <AppSidebarAccounting />
      <SidebarInset>
        <SiteHeaderCCASC title={title} />
        <div className="border-b bg-muted/50 px-4 py-2.5 text-sm text-foreground lg:px-6">
          Signed in as{" "}
          <span className="font-medium text-foreground">{displayName}</span>
          {" · "}
          <span className="text-foreground/75">Accounting Clerk</span>
        </div>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function AccountingLayout({ children }) {
  return <AccountingAuthShell>{children}</AccountingAuthShell>;
}