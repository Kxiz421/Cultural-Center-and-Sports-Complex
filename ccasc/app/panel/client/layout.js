"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { Building2, Calendar, CalendarRange, FileText, Bell, History, LayoutDashboard, LogOut, Menu, X, ClipboardEdit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  { href: "/panel/client/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/panel/client/calendar", label: "Facility Calendar", icon: Calendar },
  { href: "/panel/client/reservations", label: "Reservations", icon: ClipboardEdit },
  { href: "/panel/client/rescheduling", label: "Rescheduling", icon: CalendarRange },
  { href: "/panel/client/documents", label: "Documents", icon: FileText },
  { href: "/panel/client/notifications", label: "Notifications", icon: Bell, showBadge: true },
  { href: "/panel/client/history", label: "Booking History", icon: History },
];

export default function ClientLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const isOrderOfPayment = pathname?.includes("/order-of-payment");
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [logoutOpen, setLogoutOpen] = React.useState(false);

  React.useEffect(() => {
    async function fetchUnreadCount() {
      const clientId = localStorage.getItem("user_id")?.replace("CLT-", "");
      if (!clientId) return;
      try {
        const res = await fetch(`/api/notifications?clientId=${clientId}`);
        const data = await res.json();
        const count = Array.isArray(data) ? data.filter((n) => !n.isRead).length : 0;
        setUnreadCount(count);
      } catch (err) {
        console.error("Failed to fetch notification count:", err);
      }
    }
    fetchUnreadCount();
    // Poll every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const confirmLogout = () => {
    localStorage.clear();
    setLogoutOpen(false);
    toast.success("You have been logged out.");
    router.push("/login");
  };

  return (
    <>
    <div className={cn("flex min-h-screen bg-gray-50", isOrderOfPayment && "print:bg-white")}>
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
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-white transition-transform duration-200 lg:static lg:translate-x-0 print:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <Building2 className="size-6 text-primary" />
            <span className="text-sm font-semibold">Client Portal</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="size-5" />
          </Button>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Button
                key={item.href}
                variant={isActive ? "secondary" : "ghost"}
                className="w-full justify-start gap-3 relative"
                onClick={() => {
                  router.push(item.href);
                  setSidebarOpen(false);
                }}
              >
                <Icon className="size-4" />
                {item.label}
                {item.showBadge && unreadCount > 0 && (
                  <Badge className="absolute right-2 size-5 flex items-center justify-center p-0 text-[10px] bg-red-500 text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Badge>
                )}
              </Button>
            );
          })}
        </nav>

        <div className="border-t p-3">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-red-600 hover:text-red-700"
            onClick={() => setLogoutOpen(true)}
          >
            <LogOut className="size-4" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center gap-4 border-b bg-white px-4 lg:px-6 print:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="size-5" />
          </Button>
          <div className="flex-1" />
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