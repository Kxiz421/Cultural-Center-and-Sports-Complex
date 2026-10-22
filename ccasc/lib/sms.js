const PHILSMS_ENDPOINT = "https://app.philsms.com/api/v3/sms/send";

function apiToken() {
  return String(process.env.PHILSMS_API_TOKEN ?? "").trim();
}

function senderId() {
  return String(process.env.PHILSMS_SENDER_ID ?? "").trim() || "CCASC";
}

export function isSmsEnabled() {
  return Boolean(apiToken());
}

export async function sendOtpSms(toE164, otp) {
  const token = apiToken();
  if (!toE164 || !token) return false;

  try {
    const res = await fetch(PHILSMS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        recipient: toE164,
        sender_id: senderId(),
        type: "plain",
        message: `CCASC: Your password reset code is ${otp}. Valid for 5 minutes. Do not share it.`,
      }),
      signal: AbortSignal.timeout(10000),
    });

    const raw = await res.text();

    let data = null;
    try {
      data = JSON.parse(raw);
    } catch (parseError) {
      data = null;
    }

    if (!res.ok || data?.status !== "success") {
      console.error(
        `PhilSMS rejected the send (HTTP ${res.status}): ${
          data?.message ?? raw.slice(0, 300)
        }`,
      );
      return false;
    }

    console.log(`OTP SMS sent to ${toE164}`);
    return true;
  } catch (error) {
    console.error("Failed to send OTP SMS:", error.message);
    return false;
  }
}
