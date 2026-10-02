/**
 * Password reset - account resolution.
 *
 * The reset endpoints are keyed by email, but an email can exist in BOTH the
 * `Staff` and the `Client` table: the two tables have independent unique
 * indexes and are queried separately, so an old duplicate does not raise a
 * conflict. (Registration and Admin > User Management check both tables, so
 * this only affects rows created before those checks, or seeded by hand.)
 *
 * When that happens, the reset must resolve the account in the SAME order the
 * login provider does (`auth.js` resolves Staff before Client). Otherwise the
 * reset writes the new password to one row while login authenticates the
 * other: the user is told "Password reset successful" and then cannot sign in,
 * which looks like the new password was silently ignored.
 *
 * This module is the single source of truth for POST (send code), PATCH
 * (verify code) and PUT (set password) so all three always agree on the row.
 *
 * Prisma is imported here (not in `auth.config.js`) and this file is only
 * imported by the Node-runtime reset route, per AGENTS.md rule 4.
 */

import prisma from "@/lib/prisma";

/** Account tables a password reset can target. */
export const RESET_ACCOUNT = {
  STAFF: "staff",
  CLIENT: "client",
};

/**
 * Resolve the account a password reset applies to.
 *
 * Precedence mirrors the Credentials provider in `auth.js` exactly: a matching
 * Staff row wins over a matching Client row. Keeping the two in lockstep is
 * what makes "the reset changed my password" and "login accepted my password"
 * refer to the same row.
 *
 * @param {string} email
 * @param {import("@prisma/client").PrismaClient} [db] - injectable for tests.
 * @returns {Promise<{ userType: "staff"|"client", id: number, otp: string|null, otpExpiration: Date|null } | null>}
 */
export async function resolvePasswordResetAccount(email, db = prisma) {
  // Normalise the same way the login provider does (auth.js trims the
  // identifier) so a padded address cannot pass login yet fail the reset
  // existence check. Case is left to the database collation, as in login.
  const normalizedEmail = String(email ?? "").trim();

  const staff = await db.staff.findUnique({
    where: { email: normalizedEmail },
    select: { staffId: true, otp: true, otpExpiration: true },
  });

  if (staff) {
    // Surface the duplicate so the shadowed account can be cleaned up: the
    // Client row with this email can still be signed into, but no longer has
    // a working "forgot password" because resets always target the Staff row.
    const shadowedClient = await db.client.findUnique({
      where: { email: normalizedEmail },
      select: { clientId: true },
    });
    if (shadowedClient) {
      console.warn(
        `[password-reset] "${normalizedEmail}" exists in both Staff (#${staff.staffId}) ` +
          `and Client (#${shadowedClient.clientId}). Updating the Staff account ` +
          `to match the login provider; change one of the two emails to remove ` +
          `the shadowed account.`,
      );
    }

    return {
      userType: RESET_ACCOUNT.STAFF,
      id: staff.staffId,
      otp: staff.otp,
      otpExpiration: staff.otpExpiration,
    };
  }

  const client = await db.client.findUnique({
    where: { email: normalizedEmail },
    select: { clientId: true, otp: true, otpExpiration: true },
  });

  if (client) {
    return {
      userType: RESET_ACCOUNT.CLIENT,
      id: client.clientId,
      otp: client.otp,
      otpExpiration: client.otpExpiration,
    };
  }

  return null;
}

/**
 * Write to the row returned by {@link resolvePasswordResetAccount}.
 *
 * Addressing the row by primary key (not by `email`) guarantees the write
 * lands on the same row that was read, even when the email is ambiguous.
 *
 * @param {{ userType: "staff"|"client", id: number }} account
 * @param {object} data - Prisma `data` payload.
 * @param {import("@prisma/client").PrismaClient} [db] - injectable for tests.
 */
export async function updatePasswordResetAccount(account, data, db = prisma) {
  if (account.userType === RESET_ACCOUNT.STAFF) {
    return db.staff.update({ where: { staffId: account.id }, data });
  }
  return db.client.update({ where: { clientId: account.id }, data });
}