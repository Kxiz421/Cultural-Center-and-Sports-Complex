import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { ALL_AUTHENTICATED_TYPES, CLIENT_TYPES } from "@/lib/auth-roles";

function jsonError(message, status) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Server-side authorization guard for API route handlers.
 *
 * Usage (first statement inside a handler):
 *
 *   const guard = await requireApiAuth(["admin"]);
 *   if (guard.response) return guard.response;
 *   // guard.session / guard.user are now guaranteed to exist
 *
 * Unlike the old client-side `localStorage` checks, this reads the signed
 * session cookie, so it cannot be forged from the browser.
 *
 * @param {string[]|null} [allowedTypes] user types allowed to call the route.
 *   Omit to require "any authenticated user" (RESUBMIT_ONLY still excluded).
 */
export async function requireApiAuth(allowedTypes = null) {
  const session = await auth();
  const user = session?.user;

  if (!user?.type) {
    return {
      response: jsonError(
        "Authentication required. Please sign in to continue.",
        401,
      ),
    };
  }

  const allowed =
    allowedTypes && allowedTypes.length ? allowedTypes : ALL_AUTHENTICATED_TYPES;

  if (!allowed.includes(user.type)) {
    return {
      response: jsonError("You do not have access to this resource.", 403),
    };
  }

  return { session, user };
}

/**
 * Identity of the authenticated caller, for audit-log attribution.
 *
 * Write routes must attribute actions to the SESSION user - never to a
 * caller-supplied `performedBy` / `performedByName` body field, which any
 * client could forge to frame another staff member.
 */
export function actingAs(user) {
  const name =
    `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() ||
    user?.email ||
    "Unknown";
  return {
    performedBy: user?.userId ?? "system",
    performedByName: name,
  };
}

/**
 * Resolve which client's data a request may read.
 *
 * Client-role sessions are pinned to their own clientId so a crafted
 * `?clientId=` query parameter can no longer expose another client's records
 * (previously the panels hard-coded `clientId=1`).
 *
 * @returns {number|null} the client id to scope the query by, or null when
 *   the caller is staff and no explicit client id was requested.
 */
export function resolveClientScope(user, requestedClientId) {
  const parsed =
    requestedClientId === null || requestedClientId === undefined || requestedClientId === ""
      ? null
      : Number.parseInt(String(requestedClientId).replace(/^CLT-/i, ""), 10);

  const safeRequested = Number.isNaN(parsed) ? null : parsed;

  if (user && CLIENT_TYPES.includes(user.type)) {
    // Ignore whatever the caller asked for - clients only see their own data.
    return user.clientId ?? null;
  }

  return safeRequested;
}

/** True when the session belongs to a client-role (client / provincial agency). */
export function isClientRole(user) {
  return !!user && CLIENT_TYPES.includes(user.type);
}

/** The caller's own clientId for a client-role session, else null. */
export function ownClientId(user) {
  return isClientRole(user) ? user.clientId ?? null : null;
}

/**
 * Verify the caller may act on a reservation. Staff may act on any;
 * client-role sessions only on their own.
 *
 * @returns {Promise<NextResponse|null>} a 400/403/404 response on failure,
 *   or null when access is allowed.
 */
export async function assertReservationAccess(user, reservationId) {
  const id = Number.parseInt(String(reservationId).replace(/^RES-/i, ""), 10);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid reservation ID" }, { status: 400 });
  }
  const reservation = await prisma.reservation.findUnique({
    where: { reservationId: id },
    select: { reservationId: true, clientId: true },
  });
  if (!reservation) {
    return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
  }
  const own = ownClientId(user);
  if (own != null && reservation.clientId !== own) {
    return NextResponse.json(
      { error: "You do not have access to this reservation." },
      { status: 403 },
    );
  }
  return null;
}
