import nodemailer from "nodemailer";
import { formatPhp } from "@/lib/utils";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send an OTP email to the user for password reset
 * @param {string} to - Recipient email address
 * @param {string} otp - The 6-digit OTP code
 * @returns {Promise<boolean>} - Whether the email was sent successfully
 */
export async function sendOtpEmail(
  to,
  otp,
  { purpose = "reset", expiresInMinutes = 5 } = {}
) {
  const isVerification = purpose === "verify";
  const heading = isVerification ? "✅ Verify Your Email" : "🔐 Password Recovery";
  const intro = isVerification
    ? "Use the code below to verify your email address for your CSASC account."
    : "We received a request to reset the password for your CSASC account. Use the recovery code below to proceed.";
  const note = isVerification
    ? `<strong>⚠️ Didn't create this account?</strong><br>
                If you did not try to register a CSASC account, you can safely ignore this email.`
    : `<strong>⚠️ Didn't request this?</strong><br>
                If you did not request a password reset, please ignore this email. Your account remains secure.`;
  const closing = isVerification
    ? "For security, never share this code with anyone. Our team will never ask you for a verification code."
    : "For security, never share this code with anyone. Our team will never ask for your password or recovery code.";

  try {
    const info = await transporter.sendMail({
      from: `"CSASC - Provincial Government of South Cotabato" <${process.env.SMTP_USER}>`,
      to,
      subject: isVerification
        ? "Your CSASC Verification Code"
        : "Your Password Recovery Code - CSASC",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              margin: 0;
              padding: 0;
              background-color: #f4f4f4;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #1a365d, #2563eb);
              color: white;
              padding: 30px 20px;
              text-align: center;
              border-radius: 12px 12px 0 0;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: 700;
              letter-spacing: 1px;
            }
            .header p {
              margin: 8px 0 0;
              font-size: 14px;
              opacity: 0.9;
            }
            .body {
              background: white;
              padding: 30px 20px;
              border-radius: 0 0 12px 12px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            }
            .otp-code {
              background: #f0f5ff;
              border: 2px dashed #2563eb;
              border-radius: 12px;
              padding: 20px;
              text-align: center;
              margin: 20px 0;
              font-size: 36px;
              font-weight: 800;
              letter-spacing: 8px;
              color: #1a365d;
              font-family: 'Courier New', monospace;
            }
            .note {
              background: #fff8e1;
              border-left: 4px solid #f59e0b;
              padding: 12px 16px;
              margin: 16px 0;
              font-size: 13px;
              color: #92400e;
              border-radius: 4px;
            }
            .footer {
              text-align: center;
              padding: 20px;
              color: #6b7280;
              font-size: 12px;
              line-height: 1.6;
            }
            .footer a {
              color: #2563eb;
              text-decoration: none;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${heading}</h1>
              <p>Provincial Government of South Cotabato</p>
              <p>Gymnasium & Cultural Center / Sports Complex</p>
            </div>
            <div class="body">
              <p>Hello,</p>
              <p>${intro}</p>
              
              <div class="otp-code">${otp}</div>
              
              <p style="text-align: center; font-size: 14px; color: #4b5563;">
                This code will expire in <strong>${expiresInMinutes} minutes</strong>.
              </p>

              <div class="note">
                ${note}
              </div>
              
              <p style="font-size: 13px; color: #6b7280; margin-top: 20px;">
                ${closing}
              </p>
            </div>
            <div class="footer">
              <p>
                <strong>CSASC - Provincial Government of South Cotabato</strong><br>
                Gymnasium & Cultural Center / Sports Complex Management System
              </p>
              <p>
                This is an automated message, please do not reply directly to this email.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log(`OTP email sent to ${to}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error("Failed to send OTP email:", error);
    return false;
  }
}

/**
 * Escape a value for safe interpolation into HTML.
 * @param {unknown} value
 * @returns {string}
 */
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Partially hide an email address for display, keeping the first two
 * characters of the local part and the whole domain.
 * @param {unknown} value
 * @returns {string}
 */
export function maskEmail(value) {
  const email = String(value ?? "").trim();
  const at = email.indexOf("@");
  if (at <= 0) return "";
  const local = email.slice(0, at);
  const domain = email.slice(at);
  const visible = local.slice(0, 2);
  return `${visible}${"•".repeat(Math.max(local.length - visible.length, 1))}${domain}`;
}

/**
 * Notify a user that an admin updated their account details.
 * @param {string} to - Recipient email address
 * @param {object} details
 * @param {string} details.firstName - User's first name
 * @param {string} [details.lastName] - User's last name
 * @param {Array<{label: string, from: string|null, to: string|null, masked?: boolean}>} details.changes
 * @param {string} [details.updatedByName] - Name of the admin who made the change
 * @returns {Promise<boolean>} - Whether the email was sent successfully
 */
export async function sendUserUpdatedEmail(to, { firstName, lastName, changes = [], updatedByName } = {}) {
  try {
    const safeName = escapeHtml([firstName, lastName].filter(Boolean).join(" ") || "there");
    const rows = changes
      .map(
        (change) => `
          <tr>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #1a365d; white-space: nowrap;">${escapeHtml(change.label)}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; color: #374151;">${
              change.masked
                ? "•••••••• <span style=\"color:#6b7280;\">(updated)</span>"
                : `${escapeHtml(change.from ?? "—")} <span style="color:#9ca3af;">&rarr;</span> ${escapeHtml(change.to ?? "—")}`
            }</td>
          </tr>`
      )
      .join("");

    const info = await transporter.sendMail({
      from: `"CSASC - Provincial Government of South Cotabato" <${process.env.SMTP_USER}>`,
      to,
      subject: "Your Account Details Were Updated - CSASC",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              margin: 0;
              padding: 0;
              background-color: #f4f4f4;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #1a365d, #2563eb);
              color: white;
              padding: 30px 20px;
              text-align: center;
              border-radius: 12px 12px 0 0;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: 700;
              letter-spacing: 1px;
            }
            .header p {
              margin: 8px 0 0;
              font-size: 14px;
              opacity: 0.9;
            }
            .body {
              background: white;
              padding: 30px 20px;
              border-radius: 0 0 12px 12px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            }
            .changes {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              overflow: hidden;
            }
            .changes th {
              background: #f0f5ff;
              padding: 10px 12px;
              text-align: left;
              font-size: 13px;
              color: #1a365d;
            }
            .note {
              background: #fff8e1;
              border-left: 4px solid #f59e0b;
              padding: 12px 16px;
              margin: 16px 0;
              font-size: 13px;
              color: #92400e;
              border-radius: 4px;
            }
            .footer {
              text-align: center;
              padding: 20px;
              color: #6b7280;
              font-size: 12px;
              line-height: 1.6;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✏️ Account Details Updated</h1>
              <p>Provincial Government of South Cotabato</p>
              <p>Gymnasium &amp; Cultural Center / Sports Complex</p>
            </div>
            <div class="body">
              <p>Hello ${safeName},</p>
              <p>Your CSASC account details were updated by an administrator${
                updatedByName ? ` (${escapeHtml(updatedByName)})` : ""
              }. Here is a summary of the changes:</p>

              <table class="changes">
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Change</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows}
                </tbody>
              </table>

              <div class="note">
                <strong>⚠️ Didn't expect this?</strong><br>
                If you believe this change was made in error, please contact the CSASC administrator immediately.
              </div>

              <p style="font-size: 13px; color: #6b7280; margin-top: 20px;">
                For your security, never share your password with anyone. Our team will never ask for it.
              </p>
            </div>
            <div class="footer">
              <p>
                <strong>CSASC - Provincial Government of South Cotabato</strong><br>
                Gymnasium &amp; Cultural Center / Sports Complex Management System
              </p>
              <p>
                This is an automated message, please do not reply directly to this email.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log(`Account update email sent to ${to}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error("Failed to send account update email:", error);
    return false;
  }
}

/**
 * Notify a client whether their account verification was approved or declined.
 * @param {string} to - Recipient email address
 * @param {object} details
 * @param {string} [details.firstName] - Client's first name
 * @param {string} [details.lastName] - Client's last name
 * @param {"Verified"|"Declined"} details.status - The new verification status
 * @param {string} [details.remarks] - Reason shown when declined
 * @returns {Promise<boolean>} - Whether the email was sent successfully
 */
export async function sendAccountVerificationEmail(
  to,
  { firstName, lastName, status, remarks } = {}
) {
  if (!to) return false;
  try {
    const safeName = escapeHtml(
      [firstName, lastName].filter(Boolean).join(" ") || "there"
    );
    const isVerified = status === "Verified";
    const remarksBlock =
      !isVerified && remarks
        ? `<div class="note"><strong>Reason:</strong><br>${escapeHtml(remarks)}</div>`
        : "";

    const info = await transporter.sendMail({
      from: `"CSASC - Provincial Government of South Cotabato" <${process.env.SMTP_USER}>`,
      to,
      subject: isVerified
        ? "Your CSASC Account Has Been Verified"
        : "Your CSASC Account Verification Was Declined",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              margin: 0;
              padding: 0;
              background-color: #f4f4f4;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #1a365d, #2563eb);
              color: white;
              padding: 30px 20px;
              text-align: center;
              border-radius: 12px 12px 0 0;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: 700;
              letter-spacing: 1px;
            }
            .header p {
              margin: 8px 0 0;
              font-size: 14px;
              opacity: 0.9;
            }
            .body {
              background: white;
              padding: 30px 20px;
              border-radius: 0 0 12px 12px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            }
            .note {
              background: #fff8e1;
              border-left: 4px solid #f59e0b;
              padding: 12px 16px;
              margin: 16px 0;
              font-size: 13px;
              color: #92400e;
              border-radius: 4px;
            }
            .footer {
              text-align: center;
              padding: 20px;
              color: #6b7280;
              font-size: 12px;
              line-height: 1.6;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${isVerified ? "✅ Account Verified" : "⚠️ Verification Declined"}</h1>
              <p>Provincial Government of South Cotabato</p>
              <p>Gymnasium &amp; Cultural Center / Sports Complex</p>
            </div>
            <div class="body">
              <p>Hello ${safeName},</p>
              ${
                isVerified
                  ? `<p>Your CSASC account has been verified by an administrator. You can now sign in and start using the system.</p>`
                  : `<p>Your CSASC account verification was declined by an administrator.</p>`
              }
              ${remarksBlock}
              ${
                isVerified
                  ? ""
                  : `<p style="font-size: 13px; color: #6b7280;">Please contact the CSASC administrator if you believe this is a mistake.</p>`
              }
            </div>
            <div class="footer">
              <p>
                <strong>CSASC - Provincial Government of South Cotabato</strong><br>
                Gymnasium &amp; Cultural Center / Sports Complex Management System
              </p>
              <p>
                This is an automated message, please do not reply directly to this email.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log(`Account verification email sent to ${to}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error("Failed to send account verification email:", error);
    return false;
  }
}

/**
 * Remind a client that their reservation still has no payment and will be
 * automatically removed if nothing is paid by the removal date.
 * @param {string} to - Recipient email address
 * @param {object} details
 * @param {string} [details.clientName]
 * @param {string} [details.eventType]
 * @param {string} [details.venue]
 * @param {string} [details.eventDate] - Event date (YYYY-MM-DD)
 * @param {string} [details.removalDate] - Date the reservation is auto-removed (YYYY-MM-DD)
 * @param {string} [details.reservationRef] - e.g. RES-12
 * @param {number} [details.amountDue] - Minimum amount expected (50% down + 10% deposit)
 * @returns {Promise<boolean>} - Whether the email was sent successfully
 */
export async function sendUnpaidReservationReminderEmail(to, {
  clientName,
  eventType,
  venue,
  eventDate,
  removalDate,
  reservationRef,
  amountDue,
} = {}) {
  if (!to) return false;
  try {
    const safeName = escapeHtml(clientName || "there");
    const safeEventType = escapeHtml(eventType || "your scheduled event");
    const safeVenue = escapeHtml(venue || "the venue");
    const safeEventDate = escapeHtml(eventDate || "N/A");
    const safeRemovalDate = escapeHtml(removalDate || "N/A");
    const safeRef = escapeHtml(reservationRef || "N/A");
    const amountLine =
      amountDue != null && Number.isFinite(Number(amountDue))
        ? `<p>Minimum payment expected: <strong>${escapeHtml(formatPhp(amountDue))}</strong> (50% down payment + 10% deposit).</p>`
        : "";

    const info = await transporter.sendMail({
      from: `"CSASC - Provincial Government of South Cotabato" <${process.env.SMTP_USER}>`,
      to,
      subject: `Payment Reminder: Reservation ${safeRef} May Be Cancelled - CSASC`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              margin: 0;
              padding: 0;
              background-color: #f4f4f4;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #b45309, #f59e0b);
              color: white;
              padding: 30px 20px;
              text-align: center;
              border-radius: 12px 12px 0 0;
            }
            .header h1 {
              margin: 0;
              font-size: 22px;
              font-weight: 700;
            }
            .header p {
              margin: 8px 0 0;
              font-size: 14px;
              opacity: 0.9;
            }
            .body {
              background: white;
              padding: 30px 20px;
              border-radius: 0 0 12px 12px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            }
            .details {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              overflow: hidden;
            }
            .details td {
              padding: 10px 12px;
              border-bottom: 1px solid #e5e7eb;
              font-size: 14px;
            }
            .details td:first-child {
              font-weight: 600;
              color: #92400e;
              white-space: nowrap;
              width: 40%;
            }
            .note {
              background: #fef2f2;
              border-left: 4px solid #dc2626;
              padding: 12px 16px;
              margin: 16px 0;
              font-size: 13px;
              color: #991b1b;
              border-radius: 4px;
            }
            .footer {
              text-align: center;
              padding: 20px;
              color: #6b7280;
              font-size: 12px;
              line-height: 1.6;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⏳ Payment Reminder</h1>
              <p>Provincial Government of South Cotabato</p>
              <p>Gymnasium &amp; Cultural Center / Sports Complex</p>
            </div>
            <div class="body">
              <p>Hello ${safeName},</p>
              <p>We have not yet received any payment for your reservation. To keep it, please settle at least the down payment and deposit before the date below.</p>

              <table class="details">
                <tr><td>Reference</td><td>${safeRef}</td></tr>
                <tr><td>Event</td><td>${safeEventType}</td></tr>
                <tr><td>Venue</td><td>${safeVenue}</td></tr>
                <tr><td>Event date</td><td>${safeEventDate}</td></tr>
                <tr><td>Pay before</td><td>${safeRemovalDate}</td></tr>
              </table>

              ${amountLine}

              <div class="note">
                <strong>Please note:</strong><br>
                If no payment is recorded by ${safeRemovalDate} (2 days before the event), your reservation will be automatically cancelled and removed from the facility calendar.
              </div>

              <p style="font-size: 13px; color: #6b7280; margin-top: 20px;">
                If you have already settled your payment, please disregard this message or contact our office for assistance.
              </p>
            </div>
            <div class="footer">
              <p>
                <strong>CSASC - Provincial Government of South Cotabato</strong><br>
                Gymnasium &amp; Cultural Center / Sports Complex Management System
              </p>
              <p>
                This is an automated message, please do not reply directly to this email.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log(`Unpaid reservation reminder email sent to ${to}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error("Failed to send unpaid reservation reminder email:", error);
    return false;
  }
}