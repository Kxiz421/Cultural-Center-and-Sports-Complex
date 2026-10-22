"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Calendar, CalendarRange, FileText, History, LogOut, Menu, X, ClipboardEdit } from "lucide-react";
import { useLogout } from "@/hooks/use-logout";
import { PAGE_LOGO } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/notification-bell";
import { useSessionGuard } from "@/hooks/use-session-guard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/panel/client/calendar", label: "Facility Calendar", icon: Calendar },
  { href: "/panel/client/reservations", label: "Reservations", icon: ClipboardEdit },
  { href: "/panel/client/rescheduling", label: "Rescheduling", icon: CalendarRange },
  { href: "/panel/client/documents", label: "Documents", icon: FileText },
  // `wrap` lets this longer label break onto a second line instead of running
  // past the fixed-width rail and overlapping the page content.
  { href: "/panel/client/history", label: "Booking & Reservation History", icon: History, wrap: true },
];

export default function ClientLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const isOrderOfPayment = pathname?.includes("/order-of-payment");
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [logoutOpen, setLogoutOpen] = React.useState(false);
  const { data: session } = useSession();
  const logout = useLogout();
  useSessionGuard();

  const displayName =
    [session?.user?.firstName, session?.user?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() || "Client";

  const confirmLogout = async () => {
    localStorage.clear();
    setLogoutOpen(false);
    // Cookie destroyed, then the curtain-covered landing page (see
    // `hooks/use-logout.js`). Never `/login`: a signed-out visitor belongs on
    // the public page, not on a form they just left.
    await logout();
  };

  return (
    <>
    <div className={cn("flex min-h-screen bg-muted/40", isOrderOfPayment && "print:bg-white")}>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "navbar-surface fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-white/20 text-white transition-transform duration-200 lg:static lg:translate-x-0 print:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b border-white/20 px-4">
          <img src={PAGE_LOGO} alt="" className="size-8 shrink-0" />
          <span
            className="min-w-0 flex-1 truncate text-sm font-semibold"
            title={displayName}
          >
            {displayName}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-white hover:bg-white/10 hover:text-white lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="size-5" />
          </Button>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Button
                key={item.href}
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 relative text-white/85 hover:bg-white/10 hover:text-white",
                  isActive && "bg-white/15 font-semibold text-white hover:bg-white/20 hover:text-white",
                  item.wrap && "h-auto py-2"
                )}
                onClick={() => {
                  router.push(item.href);
                  setSidebarOpen(false);
                }}
              >
                <Icon className="size-4 shrink-0" />
                <span
                  className={cn(
                    "min-w-0 flex-1 text-left",
                    item.wrap && "whitespace-normal leading-snug"
                  )}
                >
                  {item.label}
                </span>
              </Button>
            );
          })}
        </nav>

        <div className="border-t border-white/20 p-3">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-red-200 hover:bg-white/10 hover:text-white"
            onClick={() => setLogoutOpen(true)}
          >
            <LogOut className="size-4" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        <header className="navbar-surface flex h-16 items-center gap-4 border-b border-white/20 px-4 text-white lg:px-6 print:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10 hover:text-white lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="size-5" />
          </Button>
          <div className="flex-1" />
          <NotificationBell audience="client" />
          <ThemeToggle />
        </header>
        <main className={cn("flex-1", isOrderOfPayment ? "p-4 lg:p-6 print:p-0" : "p-4 lg:p-6")}>
          {children}
        </main>
      </div>
    </div>

    <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>Do you want to log out?</DialogTitle>
          <DialogDescription>
            You will need to sign in again to access the client portal.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => setLogoutOpen(false)}
          >
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={confirmLogout}>
            Log out
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
