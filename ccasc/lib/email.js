import nodemailer from "nodemailer";

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
export async function sendOtpEmail(to, otp) {
  try {
    const info = await transporter.sendMail({
      from: `"CSASC - Provincial Government of South Cotabato" <${process.env.SMTP_USER}>`,
      to,
      subject: "Your Password Recovery Code - CSASC",
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
              <h1>🔐 Password Recovery</h1>
              <p>Provincial Government of South Cotabato</p>
              <p>Gymnasium & Cultural Center / Sports Complex</p>
            </div>
            <div class="body">
              <p>Hello,</p>
              <p>We received a request to reset the password for your CSASC account. Use the recovery code below to proceed.</p>
              
              <div class="otp-code">${otp}</div>
              
              <p style="text-align: center; font-size: 14px; color: #4b5563;">
                This code will expire in <strong>10 minutes</strong>.
              </p>

              <div class="note">
                <strong>⚠️ Didn't request this?</strong><br>
                If you did not request a password reset, please ignore this email. Your account remains secure.
              </div>
              
              <p style="font-size: 13px; color: #6b7280; margin-top: 20px;">
                For security, never share this code with anyone. Our team will never ask for your password or recovery code.
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