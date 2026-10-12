"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { SESSION_REPLACED_REASON } from "@/lib/session-reason";

/**
 * Keeps exactly one active session per account. While a panel is open this
 * polls /api/session/check (and re-checks on focus), and when the account has
 * signed in somewhere else it signs out here and redirects to the login page
 * with an explanatory message.
 */
export function useSessionGuard() {
  const router = useRouter();

  React.useEffect(() => {
    let cancelled = false;
    let disposed = false;

    async function check() {
      if (disposed) return;
      try {
        const res = await fetch("/api/session/check", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (cancelled || disposed) return;
        if (res.status === 401 || data.valid === false) {
          disposed = true;
          await signOut({ redirect: false });
          router.replace(`/login?reason=${SESSION_REPLACED_REASON}`);
        }
      } catch {
        /* offline / transient - try again on the next tick */
      }
    }

    check();
    const interval = setInterval(check, 20000);
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [router]);
}
