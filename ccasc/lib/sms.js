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

export async function sendOtpSms(toE164, otp) {
  if (!toE164 || !isSmsEnabled()) return false;

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
        textMessage: {
          text: `CCASC: Your password reset code is ${otp}. Valid for 5 minutes. Do not share it.`,
        },
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

    console.log(`OTP SMS queued to ${toE164}`);
    return true;
  } catch (error) {
    console.error("Failed to send OTP SMS:", error.message);
    return false;
  }
}
