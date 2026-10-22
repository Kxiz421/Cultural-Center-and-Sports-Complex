/**
 * Password reset - account resolution.
 *
 * The reset endpoints are keyed by a single identifier - an email, a username
 * or a mobile number - but an email or a username can exist in BOTH the
 * `Staff` and the `Client` table: the two tables have independent unique
 * indexes and are queried separately, so an old duplicate does not raise a
 * conflict. (Registration and Admin > User Management check both tables, so
 * this only affects rows created before those checks, or seeded by hand.)
 *
 * When that happens, the reset must resolve the account in the SAME order the
 * login provider does (`auth.js` resolves Staff before Client, email before
 * username). Otherwise the reset writes the new password to one row while
 * login authenticates the other: the user is told "Password reset successful"
 * and then cannot sign in, which looks like the new password was silently
 * ignored.
 *
 * This module is the single source of truth for POST (send code), PATCH
 * (verify code) and PUT (set password) so all three always agree on the row.
 *
 * Prisma is imported here (not in `auth.config.js`) and this file is only
 * imported by the Node-runtime reset route, per AGENTS.md rule 4.
 */

import prisma from "@/lib/prisma";
import { phLookupForms } from "@/lib/phone";

/** Account tables a password reset can target. */
export const RESET_ACCOUNT = {
  STAFF: "staff",
  CLIENT: "client",
};

const STAFF_RESET_SELECT = {
  staffId: true,
  email: true,
  contactNumber: true,
  otp: true,
  otpExpiration: true,
};

const CLIENT_RESET_SELECT = {
  clientId: true,
  email: true,
  contactNumber: true,
  otp: true,
  otpExpiration: true,
};

function shapeStaff(row) {
  return {
    userType: RESET_ACCOUNT.STAFF,
    id: row.staffId,
    email: row.email ?? null,
    contactNumber: row.contactNumber ?? null,
    otp: row.otp,
    otpExpiration: row.otpExpiration,
  };
}

function shapeClient(row) {
  return {
    userType: RESET_ACCOUNT.CLIENT,
    id: row.clientId,
    email: row.email ?? null,
    contactNumber: row.contactNumber ?? null,
    otp: row.otp,
    otpExpiration: row.otpExpiration,
  };
}

/**
 * Resolve the account a password reset applies to, by email.
 *
 * Precedence mirrors the Credentials provider in `auth.js` exactly: a matching
 * Staff row wins over a matching Client row. Keeping the two in lockstep is
 * what makes "the reset changed my password" and "login accepted my password"
 * refer to the same row.
 *
 * @param {string} email
 * @param {import("@prisma/client").PrismaClient} [db] - injectable for tests.
 * @returns {Promise<object|null>}
 */
export async function resolvePasswordResetAccount(email, db = prisma) {
  // Normalise the same way the login provider does (auth.js trims the
  // identifier) so a padded address cannot pass login yet fail the reset
  // existence check. Case is left to the database collation, as in login.
  const normalizedEmail = String(email ?? "").trim();

  const staff = await db.staff.findUnique({
    where: { email: normalizedEmail },
    select: STAFF_RESET_SELECT,
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

    return shapeStaff(staff);
  }

  const client = await db.client.findUnique({
    where: { email: normalizedEmail },
    select: CLIENT_RESET_SELECT,
  });

  if (client) {
    return shapeClient(client);
  }

  return null;
}

/**
 * Resolve the account a password reset applies to, by username.
 *
 * Login accepts a username as well as an email, so "forgot password" must too -
 * otherwise a user who only remembers their username has no way back in. The
 * Staff-before-Client order is the same as `auth.js`.
 *
 * @param {string} username
 * @param {import("@prisma/client").PrismaClient} [db] - injectable for tests.
 * @returns {Promise<object|null>}
 */
export async function resolvePasswordResetAccountByUsername(username, db = prisma) {
  const normalized = String(username ?? "").trim();
  if (!normalized) return null;

  const staff = await db.staff.findUnique({
    where: { username: normalized },
    select: STAFF_RESET_SELECT,
  });
  if (staff) return shapeStaff(staff);

  const client = await db.client.findUnique({
    where: { username: normalized },
    select: CLIENT_RESET_SELECT,
  });
  if (client) return shapeClient(client);

  return null;
}

/**
 * Resolve the account a password reset applies to, by mobile number.
 *
 * `contactNumber` has no unique index, so a number can be shared by more than
 * one account (or left blank / "N/A" on rows created by hand). Only an
 * unambiguous single match is returned: when two or more rows carry the number
 * there is no way to know which account the requester wants, and writing the
 * new password to a guessed row would hand the reset to the wrong account.
 *
 * @param {string} phone
 * @param {import("@prisma/client").PrismaClient} [db] - injectable for tests.
 * @returns {Promise<object|null>}
 */
export async function resolvePasswordResetAccountByPhone(phone, db = prisma) {
  const forms = phLookupForms(phone);
  if (forms.length === 0) return null;

  const [staff, client] = await Promise.all([
    db.staff.findMany({
      where: { contactNumber: { in: forms } },
      take: 2,
      select: STAFF_RESET_SELECT,
    }),
    db.client.findMany({
      where: { contactNumber: { in: forms } },
      take: 2,
      select: CLIENT_RESET_SELECT,
    }),
  ]);

  const total = staff.length + client.length;
  if (total === 0) return null;
  if (total > 1) return { ambiguous: true };

  return staff.length === 1 ? shapeStaff(staff[0]) : shapeClient(client[0]);
}

/**
 * Resolve the account from whatever the user typed into the single
 * "email, username or mobile number" field.
 *
 * The order is deliberate: email, then username (exactly as login resolves
 * them), then mobile number - which login does not accept at all, and so is
 * only reached when nothing else matched.
 *
 * @param {string} identifier
 * @param {import("@prisma/client").PrismaClient} [db] - injectable for tests.
 * @returns {Promise<object|null>}
 */
export async function resolvePasswordResetAccountByIdentifier(identifier, db = prisma) {
  const raw = String(identifier ?? "").trim();
  if (!raw) return null;

  const byEmail = await resolvePasswordResetAccount(raw, db);
  if (byEmail) return byEmail;

  const byUsername = await resolvePasswordResetAccountByUsername(raw, db);
  if (byUsername) return byUsername;

  return resolvePasswordResetAccountByPhone(raw, db);
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
