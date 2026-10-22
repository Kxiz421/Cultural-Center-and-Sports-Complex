import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

import prisma from "@/lib/prisma";
import { authConfig } from "@/auth.config";
import { USER_TYPE } from "@/lib/auth-roles";
import {
  checkLoginRateLimit,
  clearLoginAttempts,
  getClientIP,
  recordFailedLogin,
} from "@/lib/rate-limit";

/* -------------------------------------------------------------------------
 * Sign-in failure reasons (surfaced to the login page through `code`).
 * Codes never contain sensitive data - they travel in the URL.
 * ---------------------------------------------------------------------- */

class InvalidCredentialsError extends CredentialsSignin {
  constructor() {
    super();
    this.code = "invalid_credentials";
  }
}

class AccountDeactivatedError extends CredentialsSignin {
  constructor() {
    super();
    this.code = "account_deactivated";
  }
}

class RateLimitedError extends CredentialsSignin {
  constructor() {
    super();
    this.code = "rate_limited";
  }
}

/** Account statuses that must never produce a usable session. */
const BLOCKED_STATUSES = ["Deactivated", "Inactive", "Suspended"];

/**
 * Overwrite the account's single active-session token. Signing in on one device
 * invalidates every other device holding the previous token. If the column has
 * not been migrated yet the login still succeeds (it just isn't enforced).
 */
async function rotateSessionToken(kind, id) {
  const token = randomUUID();
  try {
    if (kind === "staff") {
      await prisma.staff.update({
        where: { staffId: id },
        data: { activeSession: token },
      });
    } else {
      await prisma.client.update({
        where: { clientId: id },
        data: { activeSession: token },
      });
    }
  } catch (err) {
    console.error("Failed to record active session:", err.message);
    return null;
  }
  return token;
}

/** bcrypt.compare throws on malformed hashes (legacy plain-text rows). */
async function passwordsMatch(plain, hash) {
  if (!hash || typeof hash !== "string") return false;
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

// Explicit field lists so the sign-in lookup never selects `active_session`
// (a session can still be validated even if that column is missing).
const STAFF_AUTH_SELECT = {
  staffId: true,
  password: true,
  status: true,
  firstName: true,
  lastName: true,
  email: true,
  staffOrgId: true,
  staffRole: { select: { roleName: true } },
  staffOrg: { select: { orgName: true } },
};

const CLIENT_AUTH_SELECT = {
  clientId: true,
  password: true,
  accountStatus: true,
  firstName: true,
  lastName: true,
  email: true,
  clientRole: { select: { roleName: true, clientRoleId: true } },
};

function findStaffByIdentifier(identifier) {
  return prisma.staff
    .findUnique({ where: { email: identifier }, select: STAFF_AUTH_SELECT })
    .then(
      (found) =>
        found ??
        prisma.staff.findUnique({
          where: { username: identifier },
          select: STAFF_AUTH_SELECT,
        }),
    );
}

function findClientByIdentifier(identifier) {
  return prisma.client
    .findUnique({ where: { email: identifier }, select: CLIENT_AUTH_SELECT })
    .then(
      (found) =>
        found ??
        prisma.client.findUnique({
          where: { username: identifier },
          select: CLIENT_AUTH_SELECT,
        }),
    );
}

/** Map a staff row onto a portal user type (mirrors the panel routing). */
function staffUserType(staff) {
  if (staff.staffRole.roleName === "Program Coordinator") {
    // staffOrgId 1 = Sports Complex, 2 = Cultural Center
    return staff.staffOrgId === 1
      ? USER_TYPE.COORDINATOR_SPORTS
      : USER_TYPE.COORDINATOR_CULTURAL;
  }
  return staff.staffRole.roleName.toLowerCase();
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email or username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials, request) {
        const identifier = String(rawCredentials?.email ?? "").trim();
        const password = String(rawCredentials?.password ?? "");

        if (!identifier || !password) throw new InvalidCredentialsError();

        // Rate limiting lives here (not in a separate endpoint) so it cannot
        // be bypassed by posting straight to the Auth.js callback.
        const ip = request ? getClientIP(request) : "unknown";
        const limit = checkLoginRateLimit(ip);
        if (!limit.allowed) throw new RateLimitedError();

        const staff = await findStaffByIdentifier(identifier);
        if (staff) {
          if (!(await passwordsMatch(password, staff.password))) {
            recordFailedLogin(ip);
            throw new InvalidCredentialsError();
          }
          if (BLOCKED_STATUSES.includes(String(staff.status ?? ""))) {
            throw new AccountDeactivatedError();
          }

          clearLoginAttempts(ip);
          return {
            id: `STF-${staff.staffId}`,
            type: staffUserType(staff),
            role: staff.staffRole.roleName,
            firstName: staff.firstName,
            lastName: staff.lastName,
            email: staff.email,
            clientId: null,
            orgName: staff.staffOrg?.orgName ?? null,
            remarks: null,
            sessionToken: await rotateSessionToken("staff", staff.staffId),
          };
        }

        const client = await findClientByIdentifier(identifier);
        if (client) {
          if (!(await passwordsMatch(password, client.password))) {
            recordFailedLogin(ip);
            throw new InvalidCredentialsError();
          }
          if (BLOCKED_STATUSES.includes(String(client.accountStatus ?? ""))) {
            throw new AccountDeactivatedError();
          }

          // Registration no longer requires admin verification: a newly created
          // client can sign in immediately. Only deactivated (archived) accounts
          // are blocked, so archiving/restoring remains the access control.
          clearLoginAttempts(ip);
          return {
            id: `CLT-${client.clientId}`,
            type:
              client.clientRole?.clientRoleId === "PROV"
                ? USER_TYPE.PROVINCIAL_AGENCY
                : USER_TYPE.CLIENT,
            role: client.clientRole?.roleName ?? null,
            firstName: client.firstName,
            lastName: client.lastName,
            email: client.email,
            clientId: client.clientId,
            orgName: null,
            remarks: null,
            sessionToken: await rotateSessionToken("client", client.clientId),
          };
        }

        recordFailedLogin(ip);
        throw new InvalidCredentialsError();
      },
    }),
  ],
});
