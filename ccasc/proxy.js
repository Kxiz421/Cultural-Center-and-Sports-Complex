import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/auth.config";
import {
  ALL_AUTHENTICATED_TYPES,
  PUBLIC_API,
  PUBLIC_PAGE_PREFIXES,
  USER_TYPE,
  apiTypesAllowed,
  homeForUserType,
  isPublicApiRequest,
  pageTypesAllowed,
} from "@/lib/auth-roles";

/**
 * Next.js 16 "Proxy" (formerly Middleware).
 *
 * Runs before every matched request and enforces authorization from the
 * signed session cookie - the browser can no longer fake identity by writing
 * to localStorage.
 *
 * This is the first of two layers:
 *   1. proxy.js          - blocks anonymous/role-mismatched requests early.
 *   2. lib/api-auth.js   - per-route guard inside each API handler.
 *
 * The Edge runtime can only verify the JWT, which is why the Prisma-backed
 * Credentials provider lives in auth.js and is intentionally absent from
 * auth.config.js.
 */
const { auth } = NextAuth(authConfig);

function jsonError(message, status) {
  return NextResponse.json({ error: message }, { status });
}

export default auth((request) => {
  const { nextUrl } = request;
  const pathname = nextUrl.pathname;
  const origin = nextUrl.origin;
  const userType = request.auth?.user?.type ?? null;

  /* ---------------- API routes ---------------- */
  if (pathname.startsWith("/api")) {
    // Public endpoints (sign-in, register, password reset, ID upload, orgs).
    if (isPublicApiRequest(pathname, request.method)) {
      return NextResponse.next();
    }

    if (!userType) {
      return jsonError("Authentication required. Please sign in to continue.", 401);
    }

    const rule = apiTypesAllowed(pathname);
    const allowed =
      rule && rule !== PUBLIC_API ? rule : ALL_AUTHENTICATED_TYPES;

    if (!allowed.includes(userType)) {
      return jsonError("You do not have access to this resource.", 403);
    }

    return NextResponse.next();
  }

  /* ------------- Restricted resubmission flow ------------- */
  if (pathname === "/resubmit" || pathname.startsWith("/resubmit/")) {
    if (!userType) {
      return NextResponse.redirect(new URL("/login", origin));
    }
    // Only a declined client's limited session may resubmit documents.
    if (userType !== USER_TYPE.RESUBMIT_ONLY) {
      return NextResponse.redirect(new URL(homeForUserType(userType), origin));
    }
    return NextResponse.next();
  }

  /* ---------------- Public pages ---------------- */
  if (
    PUBLIC_PAGE_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  ) {
    // Already signed in? Skip the login screen.
    if (userType && pathname.startsWith("/login")) {
      return NextResponse.redirect(new URL(homeForUserType(userType), origin));
    }
    return NextResponse.next();
  }

  /* ---------------- Panel pages ---------------- */
  if (pathname.startsWith("/panel")) {
    if (!userType) {
      return NextResponse.redirect(new URL("/login", origin));
    }

    const allowed = pageTypesAllowed(pathname);
    if (allowed && !allowed.includes(userType)) {
      return NextResponse.redirect(new URL(homeForUserType(userType), origin));
    }

    return NextResponse.next();
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Every API route except /api/auth/* - Auth.js manages the CSRF and
    // session cookies on its own endpoints, so the proxy must not run (or
    // re-issue cookies) for them.
    "/api/((?!auth/).*)",
    "/panel/:path*",
    "/login",
    "/register",
    "/resubmit",
  ],
};
