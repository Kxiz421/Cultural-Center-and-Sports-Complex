import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
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

class VerificationPendingError extends CredentialsSignin {
  constructor() {
    super();
    this.code = "verification_pending";
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

/** bcrypt.compare throws on malformed hashes (legacy plain-text rows). */
async function passwordsMatch(plain, hash) {
  if (!hash || typeof hash !== "string") return false;
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

function findStaffByIdentifier(identifier) {
  return prisma.staff
    .findUnique({
      where: { email: identifier },
      include: { staffRole: true, staffOrg: true },
    })
    .then(
      (found) =>
        found ??
        prisma.staff.findUnique({
          where: { username: identifier },
          include: { staffRole: true, staffOrg: true },
        }),
    );
}

function findClientByIdentifier(identifier) {
  return prisma.client
    .findUnique({
      where: { email: identifier },
      include: { clientRole: true },
    })
    .then(
      (found) =>
        found ??
        prisma.client.findUnique({
          where: { username: identifier },
          include: { clientRole: true },
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

          const isDeclined = client.verificationStatus === "Declined";
          const isPending =
            client.accountStatus === "Pending" ||
            client.verificationStatus === "Pending";

          // A declined Certificate of Employment gets a deliberately
          // restricted session: resubmission flow only, never a panel.
          if (isDeclined) {
            clearLoginAttempts(ip);
            return {
              id: `CLT-${client.clientId}`,
              type: USER_TYPE.RESUBMIT_ONLY,
              role: client.clientRole?.roleName ?? null,
              firstName: client.firstName,
              lastName: client.lastName,
              email: client.email,
              clientId: client.clientId,
              orgName: null,
              remarks: client.remarks ?? null,
            };
          }

          if (isPending) throw new VerificationPendingError();

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
          };
        }

        recordFailedLogin(ip);
        throw new InvalidCredentialsError();
      },
    }),
  ],
});
