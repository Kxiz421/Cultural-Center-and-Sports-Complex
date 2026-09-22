/**
 * Single source of truth for identity types, their landing panels, and the
 * authorization matrix used by:
 *   - proxy.js          (Edge runtime - page + API gating)
 *   - lib/api-auth.js   (Node runtime - per-route guards)
 *   - UI (login / session code)
 *
 * IMPORTANT: keep this module dependency-free (no Prisma, no bcrypt, no
 * next/server). It is imported by proxy.js, which runs in the Edge runtime.
 */

/** User types issued by the login flow (stored in the signed session JWT). */
export const USER_TYPE = {
  ADMIN: "admin",
  ACCOUNTING_CLERK: "accounting clerk",
  LTOO: "local treasury operations officer",
  COORDINATOR_CULTURAL: "program coordinator cultural",
  COORDINATOR_SPORTS: "program coordinator sports",
  CLIENT: "client",
  PROVINCIAL_AGENCY: "provincial-agency",
  /**
   * Restricted session for a client whose Certificate of Employment was
   * declined. It may ONLY reach the resubmission flow - never a panel.
   */
  RESUBMIT_ONLY: "resubmit-only",
};

export const PROGRAM_COORDINATOR_TYPES = [
  USER_TYPE.COORDINATOR_CULTURAL,
  USER_TYPE.COORDINATOR_SPORTS,
];

export const STAFF_TYPES = [
  USER_TYPE.ADMIN,
  USER_TYPE.ACCOUNTING_CLERK,
  USER_TYPE.LTOO,
  ...PROGRAM_COORDINATOR_TYPES,
];

export const CLIENT_TYPES = [USER_TYPE.CLIENT, USER_TYPE.PROVINCIAL_AGENCY];

/**
 * Types that may reach the normal (non-restricted) API surface.
 * USER_TYPE.RESUBMIT_ONLY is deliberately excluded.
 */
export const ALL_AUTHENTICATED_TYPES = [...STAFF_TYPES, ...CLIENT_TYPES];

/** Where each user type lands after a successful sign-in. */
export const PANEL_HOME = {
  [USER_TYPE.ADMIN]: "/panel/admin/dashboard",
  [USER_TYPE.ACCOUNTING_CLERK]: "/panel/accounting-clerk/dashboard",
  [USER_TYPE.LTOO]: "/panel/local-treasury-officer/dashboard",
  [USER_TYPE.COORDINATOR_CULTURAL]: "/panel/program-coordinator/dashboard",
  [USER_TYPE.COORDINATOR_SPORTS]: "/panel/program-coordinator/dashboard",
  [USER_TYPE.CLIENT]: "/panel/client/dashboard",
  [USER_TYPE.PROVINCIAL_AGENCY]: "/panel/provincial-agency/dashboard",
  [USER_TYPE.RESUBMIT_ONLY]: "/resubmit",
};

/** Landing route for a session user type (falls back to the login page). */
export function homeForUserType(userType) {
  return PANEL_HOME[userType] || "/login";
}

/**
 * Page-level rules, most specific first. A `/panel/*` path is only reachable
 * by the listed user types.
 */
export const PAGE_RULES = [
  { prefix: "/panel/admin", types: [USER_TYPE.ADMIN] },
  { prefix: "/panel/accounting-clerk", types: [USER_TYPE.ACCOUNTING_CLERK] },
  { prefix: "/panel/local-treasury-officer", types: [USER_TYPE.LTOO] },
  { prefix: "/panel/program-coordinator", types: PROGRAM_COORDINATOR_TYPES },
  { prefix: "/panel/provincial-agency", types: [USER_TYPE.PROVINCIAL_AGENCY] },
  { prefix: "/panel/client", types: [USER_TYPE.CLIENT] },
];

/** Returns the allowed types for a panel path, or null when no rule matches. */
export function pageTypesAllowed(pathname) {
  const rule = PAGE_RULES.find((entry) => pathname.startsWith(entry.prefix));
  return rule ? rule.types : null;
}

/** Paths reachable without a session (page routes). */
export const PUBLIC_PAGE_PREFIXES = ["/login", "/register", "/resubmit"];

/**
 * API rules, most specific first.
 *   - `types: PUBLIC_API` -> no session required.
 *   - omitting `types`    -> any authenticated type except RESUBMIT_ONLY.
 */
export const PUBLIC_API = "public";

export const API_RULES = [
  // ---- Auth.js internals + public pre-login endpoints -------------------
  { prefix: "/api/auth/callback", types: PUBLIC_API },
  { prefix: "/api/auth/session", types: PUBLIC_API },
  { prefix: "/api/auth/csrf", types: PUBLIC_API },
  { prefix: "/api/auth/providers", types: PUBLIC_API },
  { prefix: "/api/auth/signin", types: PUBLIC_API },
  { prefix: "/api/auth/signout", types: PUBLIC_API },
  { prefix: "/api/auth/error", types: PUBLIC_API },
  { prefix: "/api/auth/register", types: PUBLIC_API },
  { prefix: "/api/auth/password-reset", types: PUBLIC_API },
  // Restricted: only a declined client's limited session may resubmit.
  { prefix: "/api/auth/resubmit", types: [USER_TYPE.RESUBMIT_ONLY] },
  // Registration uploads happen before a session exists.
  { prefix: "/api/upload/id-proof", types: PUBLIC_API },
  // The organization list is needed by the public registration form.
  { prefix: "/api/client-organizations", types: PUBLIC_API },

  // ---- Admin only ------------------------------------------------------
  { prefix: "/api/admin/", types: [USER_TYPE.ADMIN] },
  { prefix: "/api/audit-logs", types: [USER_TYPE.ADMIN] },
  { prefix: "/api/users", types: [USER_TYPE.ADMIN] },
  { prefix: "/api/dashboard/admin", types: [USER_TYPE.ADMIN] },
  { prefix: "/api/facilities/rates", types: [USER_TYPE.ADMIN] },
  { prefix: "/api/calendar/blocks", types: [USER_TYPE.ADMIN] },
  { prefix: "/api/upload", types: STAFF_TYPES },

  // ---- Role-specific portals -------------------------------------------
  {
    prefix: "/api/dashboard/accounting",
    types: [USER_TYPE.ACCOUNTING_CLERK, USER_TYPE.ADMIN],
  },
  {
    prefix: "/api/dashboard/coordinator",
    types: [...PROGRAM_COORDINATOR_TYPES, USER_TYPE.ADMIN],
  },
  {
    prefix: "/api/dashboard/provincial-agency",
    types: [USER_TYPE.PROVINCIAL_AGENCY, USER_TYPE.ADMIN],
  },
  { prefix: "/api/dashboard/client", types: CLIENT_TYPES },
  // The provincial agency reads its own payment records through this route.
  {
    prefix: "/api/ltoo/payments",
    types: [USER_TYPE.LTOO, USER_TYPE.ADMIN, USER_TYPE.PROVINCIAL_AGENCY],
  },
  { prefix: "/api/ltoo/", types: [USER_TYPE.LTOO, USER_TYPE.ADMIN] },
  {
    prefix: "/api/coordinator/",
    types: [...PROGRAM_COORDINATOR_TYPES, USER_TYPE.ADMIN],
  },
  {
    prefix: "/api/clients/search",
    types: [
      USER_TYPE.ACCOUNTING_CLERK,
      ...PROGRAM_COORDINATOR_TYPES,
      USER_TYPE.ADMIN,
    ],
  },
  { prefix: "/api/reports/", types: STAFF_TYPES },
];

/**
 * Returns the types allowed for an API path:
 *   - PUBLIC_API -> anonymous access allowed
 *   - an array   -> only these types
 *   - null       -> any authenticated type except RESUBMIT_ONLY
 */
export function apiTypesAllowed(pathname) {
  const rule = API_RULES.find((entry) => pathname.startsWith(entry.prefix));
  if (!rule) return null;
  return rule.types;
}

/** True when the path/method pair may be called without a session. */
export function isPublicApiRequest(pathname, method) {
  if (apiTypesAllowed(pathname) !== PUBLIC_API) return false;

  // The registration form only ever GETs the organization list.
  if (pathname.startsWith("/api/client-organizations")) {
    return method === "GET" || method === "HEAD";
  }
  if (pathname.startsWith("/api/auth/password-reset")) {
    return ["POST", "PATCH", "PUT"].includes(method);
  }
  if (pathname.startsWith("/api/upload/id-proof")) {
    return ["POST", "PUT", "GET"].includes(method);
  }
  return true;
}
