/**
 * SMS delivery.
 *
 * Primary provider: **Infobip** (`INFOBIP_BASE_URL` + `INFOBIP_API_KEY`, and
 * optionally `INFOBIP_SENDER` for the displayed sender).
 *
 * The previous SMSGate gateway is kept as a fallback so a deployment can switch
 * over gradually: Infobip is used whenever it is configured, otherwise SMSGate
 * (if set). With neither configured, every send is a no-op and the SMS option
 * on the sign-in screen stays hidden.
 */

/* ------------------------------------------------------------------ Infobip */

function infobipBase() {
  const raw = String(process.env.INFOBIP_BASE_URL ?? "").trim();
  if (!raw) return "";
  // Accept "xxxxx.api.infobip.com" or a full URL.
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withScheme.replace(/\/+$/, "");
}

function infobipApiKey() {
  return String(process.env.INFOBIP_API_KEY ?? "").trim();
}

function infobipSender() {
  return String(process.env.INFOBIP_SENDER ?? "").trim();
}

export function isInfobipEnabled() {
  return Boolean(infobipBase() && infobipApiKey());
}

/** Infobip status groups that mean the message will not be delivered. */
const INFOBIP_FAILED_GROUPS = new Set([
  2, // Undeliverable
  4, // Expired
  5, // Rejected
]);

async function sendViaInfobip(toE164, text) {
  try {
    const res = await fetch(`${infobipBase()}/sms/2/text/advanced`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `App ${infobipApiKey()}`,
      },
      body: JSON.stringify({
        messages: [
          {
            // Infobip expects the number without the leading "+".
            destinations: [{ to: String(toE164).replace(/^\+/, "") }],
            ...(infobipSender() ? { from: infobipSender() } : {}),
            text,
          },
        ],
      }),
      signal: AbortSignal.timeout(15000),
    });

    const raw = await res.text().catch(() => "");

    if (!res.ok) {
      console.error(
        `Infobip rejected the send (HTTP ${res.status}): ${raw.slice(0, 300)}`,
      );
      return false;
    }

    let parsed = null;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      // A 2xx with a non-JSON body still counts as queued.
    }
    const status = parsed?.messages?.[0]?.status;
    if (
      status?.groupId != null &&
      INFOBIP_FAILED_GROUPS.has(Number(status.groupId))
    ) {
      console.error(
        `Infobip could not deliver the SMS: ${
          status.groupName || status.name || "failed"
        } (${status.id ?? status.groupId})`,
      );
      return false;
    }

    console.log(`SMS queued via Infobip to ${toE164}`);
    return true;
  } catch (error) {
    console.error("Failed to send SMS via Infobip:", error.message);
    return false;
  }
}

/* ------------------------------------------------- SMSGate (legacy fallback) */

const SMSGATE_DEFAULT_URL = "https://api.sms-gate.app/3rdparty/v1";

function smsGateUsername() {
  return String(process.env.SMSGATE_USERNAME ?? "").trim();
}

function smsGatePassword() {
  return String(process.env.SMSGATE_PASSWORD ?? "").trim();
}

function smsGateApiBase() {
  const configured = String(process.env.SMSGATE_API_URL ?? "").trim();
  return (configured || SMSGATE_DEFAULT_URL).replace(/\/+$/, "");
}

export function isSmsGateEnabled() {
  return Boolean(smsGateUsername() && smsGatePassword());
}

async function sendViaSmsGate(toE164, text) {
  try {
    const res = await fetch(`${smsGateApiBase()}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(
          `${smsGateUsername()}:${smsGatePassword()}`,
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

    console.log(`SMS queued via SMSGate to ${toE164}`);
    return true;
  } catch (error) {
    console.error("Failed to send SMS via SMSGate:", error.message);
    return false;
  }
}

/* --------------------------------------------------------------- dispatcher */

/** True when any SMS provider is configured. */
export function isSmsEnabled() {
  return isInfobipEnabled() || isSmsGateEnabled();
}

/** Send one plain text message using the configured provider. */
async function postMessage(toE164, text) {
  if (!toE164 || !text) return false;
  if (isInfobipEnabled()) return sendViaInfobip(toE164, text);
  if (isSmsGateEnabled()) return sendViaSmsGate(toE164, text);
  return false;
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
 * Send a plain progress/reminder text to a client. No-op when no provider is
 * configured or the number is invalid.
 */
export async function sendNotificationSms(toE164, text) {
  const body = String(text ?? "").trim();
  if (!body) return false;
  // Keep a single message from running away; providers split long texts.
  const clipped = body.length > 480 ? `${body.slice(0, 477)}...` : body;
  return postMessage(toE164, clipped);
}
