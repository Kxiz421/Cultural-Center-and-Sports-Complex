"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { SESSION_REPLACED_REASON } from "@/lib/session-reason";

/**
 * Keeps exactly one active session per account.
 *
 * The session is checked on mount, on every route change, on window focus and
 * on a short interval. Any API call the server rejects because the session was
 * replaced also triggers the sign-out immediately. When it fires, the stale
 * browser is signed out and sent to the login page with an explanatory message.
 */
export function useSessionGuard() {
  const pathname = usePathname();

  React.useEffect(() => {
    let disposed = false;

    async function forceLogout() {
      if (disposed) return;
      disposed = true;
      try {
        await signOut({ redirect: false });
      } catch {
        /* ignore - the redirect below still removes access */
      }
      window.location.replace(`/login?reason=${SESSION_REPLACED_REASON}`);
    }

    async function check() {
      if (disposed) return;
      try {
        const res = await fetch("/api/session/check", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (disposed) return;
        if (res.status === 401 || data.valid === false) {
          await forceLogout();
        }
      } catch {
        /* offline / transient - try again on the next tick */
      }
    }

    check();
    const interval = setInterval(check, 5000);
    const onWake = () => check();
    window.addEventListener("focus", onWake);
    document.addEventListener("visibilitychange", onWake);

    // Reject-early: as soon as any request comes back "session_replaced" the
    // browser signs itself out, so the modules stop working right away.
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      if (response.status === 401) {
        response
          .clone()
          .json()
          .then((data) => {
            if (data?.code === "session_replaced") forceLogout();
          })
          .catch(() => {});
      }
      return response;
    };

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onWake);
      document.removeEventListener("visibilitychange", onWake);
      window.fetch = originalFetch;
    };
  }, [pathname]);
}
