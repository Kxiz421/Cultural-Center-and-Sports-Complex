const PHILSMS_ENDPOINT = "https://app.philsms.com/api/v3/sms/send";

export function isSmsEnabled() {
  return Boolean(process.env.PHILSMS_API_TOKEN);
}

export async function sendOtpSms(toE164, otp) {
  if (!toE164 || !isSmsEnabled()) return false;

  try {
    const res = await fetch(PHILSMS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${process.env.PHILSMS_API_TOKEN}`,
      },
      body: JSON.stringify({
        recipient: toE164,
        sender_id: process.env.PHILSMS_SENDER_ID || "CSASC",
        type: "plain",
        message: `CSASC: Your password reset code is ${otp}. Valid for 5 minutes. Do not share it.`,
      }),
      signal: AbortSignal.timeout(10000),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || data?.status !== "success") {
      console.error(
        `Failed to send OTP SMS to ${toE164}: HTTP ${res.status} ${data?.message ?? ""}`,
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
