/**
 * Registration contact verification.
 *
 * A registrant must prove they own BOTH the email address and the mobile
 * number they register with, before the Client row is created - which is what
 * keeps unverified contacts (and therefore unusable login accounts) out of the
 * database. The one-time codes live in the `RegistrationOtp` table, keyed by
 * the normalised target, so this state survives across serverless instances
 * (an in-memory map would not).
 *
 * Prisma is imported here and this file is only used by Node-runtime routes.
 */

import prisma from "@/lib/prisma";
import { normalizeEmail } from "@/lib/email-validation";
import { toE164Ph } from "@/lib/phone";

export const REGISTER_CHANNEL = {
  EMAIL: "email",
  SMS: "sms",
};

/**
 * Normalise the value a registrant typed into the key used to store/look up
 * its verification row: a lowercased email, or an E.164 mobile number.
 * Returns null when the value is not a valid target for the channel.
 *
 * @param {"email"|"sms"} channel
 * @param {string} value
 * @returns {string|null}
 */
export function normalizeRegistrationTarget(channel, value) {
  if (channel === REGISTER_CHANNEL.EMAIL) {
    return normalizeEmail(value) || null;
  }
  if (channel === REGISTER_CHANNEL.SMS) {
    return toE164Ph(value);
  }
  return null;
}

/**
 * True when this exact email/phone has a verified, unexpired code on file.
 *
 * @param {"email"|"sms"} channel
 * @param {string} value
 * @param {import("@prisma/client").PrismaClient} [db]
 * @returns {Promise<boolean>}
 */
export async function isRegistrationTargetVerified(channel, value, db = prisma) {
  const target = normalizeRegistrationTarget(channel, value);
  if (!target) return false;

  const row = await db.registrationOtp.findUnique({
    where: { channel_target: { channel, target } },
    select: { verified: true },
  });
  return Boolean(row?.verified);
}

/**
 * Drop the spent verification rows once the account they vouched for has been
 * created, so the codes cannot be replayed for a second registration.
 *
 * @param {string} email
 * @param {string} phone
 * @param {import("@prisma/client").PrismaClient} [db]
 */
export async function clearRegistrationVerifications(email, phone, db = prisma) {
  const targets = [
    normalizeRegistrationTarget(REGISTER_CHANNEL.EMAIL, email),
    normalizeRegistrationTarget(REGISTER_CHANNEL.SMS, phone),
  ].filter(Boolean);

  if (targets.length === 0) return;
  await db.registrationOtp.deleteMany({ where: { target: { in: targets } } });
}
