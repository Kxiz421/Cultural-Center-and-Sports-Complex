const SMSGATE_DEFAULT_URL = "https://api.sms-gate.app/3rdparty/v1";

function username() {
  return String(process.env.SMSGATE_USERNAME ?? "").trim();
}

function password() {
  return String(process.env.SMSGATE_PASSWORD ?? "").trim();
}

function apiBase() {
  const configured = String(process.env.SMSGATE_API_URL ?? "").trim();
  return (configured || SMSGATE_DEFAULT_URL).replace(/\/+$/, "");
}

export function isSmsEnabled() {
  return Boolean(username() && password());
}

/** Low-level SMSGate POST. Returns true when the message was queued. */
async function postMessage(toE164, text) {
  if (!toE164 || !text || !isSmsEnabled()) return false;

  try {
    const res = await fetch(`${apiBase()}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(
          `${username()}:${password()}`,
        ).toString("base64")}`,
      },
      body: JSON.stringify({
        textMessage: { text },
        phoneNumbers: [toE164],
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const raw = await res.text().catch(() => "");
      console.error(
        `SMSGate rejected the send (HTTP ${res.status}): ${raw.slice(0, 300)}`,
      );
      return false;
    }

    console.log(`SMS queued to ${toE164}`);
    return true;
  } catch (error) {
    console.error("Failed to send SMS:", error.message);
    return false;
  }
}

export async function sendOtpSms(
  toE164,
  otp,
  { purpose = "reset", expiresInMinutes = 5 } = {},
) {
  if (!toE164 || !isSmsEnabled()) return false;

  const label =
    purpose === "verify" ? "verification code" : "password reset code";

  return postMessage(
    toE164,
    `CCASC: Your ${label} is ${otp}. Valid for ${expiresInMinutes} minutes. Do not share it.`,
  );
}

/**
 * Send a plain progress/reminder text to a client. No-op when SMSGate is not
 * configured or the number is invalid.
 */
export async function sendNotificationSms(toE164, text) {
  const body = String(text ?? "").trim();
  if (!body) return false;
  // Keep a single message from running away; SMSGate splits long texts.
  const clipped = body.length > 480 ? `${body.slice(0, 477)}...` : body;
  return postMessage(toE164, clipped);
}
