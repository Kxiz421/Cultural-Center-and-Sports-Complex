"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function NavUserCCASC() {
  const router = useRouter();
  const [logoutOpen, setLogoutOpen] = React.useState(false);

  const confirmLogout = async () => {
    if (typeof window === "undefined") return;
    // Drop the display-only mirrors, then destroy the real session cookie.
    [
      "user_id",
      "user_name",
      "role",
      "userType",
      "firstname",
      "lastname",
      "email",
      "token", // legacy value left behind by the pre-Auth.js build
    ].forEach((key) => localStorage.removeItem(key));
    setLogoutOpen(false);
    await signOut({ redirect: false });
    toast.success("You have been logged out.");
    router.push("/login");
  };

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            type="button"
            onClick={() => setLogoutOpen(true)}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="mr-2 size-4 shrink-0" />
            Log out
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>

      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Do you want to log out?</DialogTitle>
            <DialogDescription>
              You will need to sign in again to access the admin portal.
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
