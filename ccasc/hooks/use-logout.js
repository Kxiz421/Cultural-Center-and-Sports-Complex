"use client";

import * as React from "react";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { useRouteTransition } from "@/components/route-transition";

/**
 * Shared sign-out.
 *
 * Every logout button used to do its own `signOut()` + `router.push("/login")`,
 * which had two problems:
 *
 * 1. It landed on the sign-in screen instead of the landing page.
 * 2. The panels that wrap themselves in a `useSession()` guard
 *    (`app/panel/admin/layout.js` and friends) push `/login` themselves the
 *    moment the session clears, so two client-side navigations raced — the
 *    destination depended on which one committed last.
 *
 * This hook fixes both by doing a **hard** navigation to the landing page
 * *after* the cookie is gone: nothing can race it, the panel's in-memory state
 * is discarded, and the route transition curtain covers the swap.
 */

/** Where a signed-out user lands. */
export const LOGOUT_HOME = "/";

/** Display-only mirrors written at sign-in (see `app/login/page.js`). */
const SESSION_MIRROR_KEYS = [
  "user_id",
  "user_name",
  "role",
  "userType",
  "firstname",
  "lastname",
  "email",
  "token", // legacy value left behind by the pre-Auth.js build
];

export function useLogout() {
  const { start } = useRouteTransition();

  return React.useCallback(async () => {
    if (typeof window === "undefined") return;

    // Drop the display-only mirrors. The signed session cookie is destroyed
    // below — identity is never derived from these again.
    for (const key of SESSION_MIRROR_KEYS) localStorage.removeItem(key);

    // Clear the cookie *before* navigating: unloading the page while this
    // request is in flight would cancel it and leave the user signed in.
    await signOut({ redirect: false });

    toast.success("You have been logged out.");

    // `hard` on purpose — see the file header. If the curtain declines (only
    // possible when another transition is mid-flight), navigate directly so a
    // logout can never silently do nothing.
    if (!start(LOGOUT_HOME, "Signing you out…", { hard: true })) {
      window.location.assign(LOGOUT_HOME);
    }
  }, [start]);
}
