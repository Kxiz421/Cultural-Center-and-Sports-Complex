import prisma from "@/lib/prisma";
import { sendClientNotificationEmail } from "@/lib/email";
import { sendNotificationSms } from "@/lib/sms";
import { toE164Ph } from "@/lib/phone";
import { SYSTEM_NOTIFICATION_STAFF_ID } from "@/lib/coordinator-notifications";

/**
 * Notify a client (or a provincial-agency account — also a `Client` row) about
 * a progress change on **all three channels**:
 *
 *   1. the in-app inbox (Notification row),
 *   2. email to the address on file,
 *   3. SMS to the mobile number on file (Infobip, or SMSGate fallback).
 *
 * Every channel is best-effort: a failed email/SMS is logged and never fails the
 * calling request.
 *
 * @param {object} input
 * @param {number} input.clientId
 * @param {string} [input.type] - Notification category (payment/document/booking/...)
 * @param {string} input.message - In-app text (also the default SMS text)
 * @param {object|null} [input.email] - Passed to sendClientNotificationEmail;
 *   omit/null to skip email. If `sms` is omitted the message is texted as-is.
 * @param {string|null} [input.sms] - Override the SMS text; `null` skips SMS.
 * @param {string|null} [input.link] - Optional in-app deep link.
 * @returns {Promise<{ inApp: boolean, email: boolean, sms: boolean }>}
 */
export async function notifyClientEvent({
  clientId,
  type,
  message,
  email = null,
  sms,
  link = null,
} = {}) {
  const id = Number(clientId);
  const body = String(message ?? "").trim();
  if (!Number.isFinite(id) || id <= 0 || !body) {
    return { inApp: false, email: false, sms: false };
  }

  let inApp = false;
  try {
    await prisma.notification.create({
      data: {
        clientId: id,
        staffId: SYSTEM_NOTIFICATION_STAFF_ID,
        type: type || "General",
        message: body,
        link: link || null,
        sentAt: new Date(),
      },
    });
    inApp = true;
  } catch (err) {
    console.error("Failed to create client notification:", err);
  }

  let client = null;
  try {
    client = await prisma.client.findUnique({
      where: { clientId: id },
      select: { firstName: true, email: true, contactNumber: true },
    });
  } catch (err) {
    console.error("Failed to load client contact details:", err);
  }

  let emailSent = false;
  if (email && client?.email) {
    try {
      emailSent = await sendClientNotificationEmail(client.email, {
        clientName: client.firstName,
        ...email,
      });
    } catch (err) {
      console.error("Failed to send client notification email:", err);
    }
  }

  let smsSent = false;
  const smsText = sms === undefined ? body : sms;
  const phone = toE164Ph(client?.contactNumber);
  if (smsText && phone) {
    try {
      smsSent = await sendNotificationSms(phone, smsText);
    } catch (err) {
      console.error("Failed to send client notification SMS:", err);
    }
  }

  return { inApp, email: emailSent, sms: smsSent };
}
