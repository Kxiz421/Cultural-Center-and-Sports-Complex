"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppSidebarLTOO } from "@/components/app-sidebar-ltoo";
import { SiteHeaderCCASC } from "@/components/site-header-ccasc";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

const TITLES = {
  "/panel/local-treasury-officer/dashboard": "Dashboard",
  "/panel/local-treasury-officer/payments": "Payment Recording",
  "/panel/local-treasury-officer/notifications": "Notifications",
  "/panel/local-treasury-officer/cancellations": "Booking Cancellation",
  "/panel/local-treasury-officer/documents": "Documents",
  "/panel/local-treasury-officer/reports": "Report Generation",
};

function LTOOAuthShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = React.useState(false);
  const [displayName, setDisplayName] = React.useState("");

  React.useEffect(() => {
    try {
      const userId = window.localStorage.getItem("user_id");
      const role = window.localStorage.getItem("role");

      if (!userId || role !== "local treasury operations officer") {
        router.replace("/login");
        return;
      }

      const first = window.localStorage.getItem("firstname") ?? "";
      const last = window.localStorage.getItem("lastname") ?? "";
      const name = `${first} ${last}`.trim() || "Local Treasury Operations Officer";

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

  const title = TITLES[pathname] ?? "Local Treasury Operations Officer";

  return (
    <SidebarProvider>
      <AppSidebarLTOO />
      <SidebarInset>
        <SiteHeaderCCASC title={title} />
        <div className="border-b bg-muted/40 px-4 py-2 text-sm lg:px-6">
          Signed in as{" "}
          <span className="font-medium text-foreground">{displayName}</span>
          {" · "}
          <span className="text-muted-foreground">Local Treasury Operations Officer</span>
        </div>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function LTOOLayout({ children }) {
  return <LTOOAuthShell>{children}</LTOOAuthShell>;
}