"use client";

import * as React from "react";
import { LogOut } from "lucide-react";
import { useLogout } from "@/hooks/use-logout";
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
  const logout = useLogout();
  const [logoutOpen, setLogoutOpen] = React.useState(false);

  const confirmLogout = async () => {
    setLogoutOpen(false);
    // Mirrors cleared, cookie destroyed, then a curtain-covered landing page —
    // all inside `useLogout` (see `hooks/use-logout.js`).
    await logout();
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
