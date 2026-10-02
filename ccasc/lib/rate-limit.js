/**
 * Simple in-memory rate limiter for auth endpoints.
 *
 * Tracks attempts per IP address using rolling time windows.
 * Limits:
 *   - Login:        5 failed attempts per 3 minutes
 *   - Password Reset: 5 requests per 30 minutes (per IP)
 *   - OTP send:     1 request per minute (per account email)
 *   - Register:      NOT rate-limited (by design)
 */

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

/** @type {Map<string, { timestamps: number[] }>} */
const loginAttempts = new Map();

/** @type {Map<string, { timestamps: number[] }>} */
const passwordResetAttempts = new Map();

/** @type {Map<string, { timestamps: number[] }>} */
const otpSendAttempts = new Map();

// Periodic cleanup every 5 minutes to prevent unbounded memory growth
const CLEANUP_MS = 300_000;
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of loginAttempts) {
    record.timestamps = record.timestamps.filter((t) => now - t < 180_000);
    if (record.timestamps.length === 0) loginAttempts.delete(key);
  }
  for (const [key, record] of passwordResetAttempts) {
    record.timestamps = record.timestamps.filter((t) => now - t < 1_800_000);
    if (record.timestamps.length === 0) passwordResetAttempts.delete(key);
  }
  for (const [key, record] of otpSendAttempts) {
    record.timestamps = record.timestamps.filter((t) => now - t < OTP_SEND_COOLDOWN_MS);
    if (record.timestamps.length === 0) otpSendAttempts.delete(key);
  }
  for (const [key, record] of otpVerifyAttempts) {
    record.timestamps = record.timestamps.filter((t) => now - t < OTP_WINDOW_MS);
    if (record.timestamps.length === 0) otpVerifyAttempts.delete(key);
  }
}, CLEANUP_MS);

// Avoid memory leak if the Node process exits
if (typeof process !== "undefined" && typeof process.on === "function") {
  process.on("SIGINT", () => setInterval(() => {}, 9999));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract the client IP from the request headers.
 * Works for Vercel/Cloudflare/local dev.
 */
export function getClientIP(request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1"
  );
}

// ---------------------------------------------------------------------------
// LOGIN – failed-attempt tracking
// ---------------------------------------------------------------------------

const LOGIN_WINDOW_MS = 180_000; // 3 minutes
const LOGIN_MAX = 5;

/**
 * Check whether the given IP is currently blocked from logging in.
 * @returns {{ allowed: true } | { allowed: false, retryAfter: number }}
 */
export function checkLoginRateLimit(ip) {
  const record = loginAttempts.get(ip);
  if (!record) return { allowed: true };

  const now = Date.now();
  // Keep only timestamps still inside the window
  record.timestamps = record.timestamps.filter(
    (t) => now - t < LOGIN_WINDOW_MS,
  );

  if (record.timestamps.length >= LOGIN_MAX) {
    const oldest = record.timestamps[0]; // earliest in the window
    const waitMs = LOGIN_WINDOW_MS - (now - oldest);
    return { allowed: false, retryAfter: Math.ceil(waitMs / 1000) };
  }

  return { allowed: true };
}

/** Record a failed login attempt for the given IP. */
export function recordFailedLogin(ip) {
  let record = loginAttempts.get(ip);
  if (!record) {
    record = { timestamps: [] };
    loginAttempts.set(ip, record);
  }
  record.timestamps.push(Date.now());
}

/** Clear all failed-login records for the given IP (called on success). */
export function clearLoginAttempts(ip) {
  loginAttempts.delete(ip);
}

// ---------------------------------------------------------------------------
// PASSWORD RESET – request tracking
// ---------------------------------------------------------------------------

const PWRESET_WINDOW_MS = 1_800_000; // 30 minutes
const PWRESET_MAX = 5;

/**
 * Check whether the given IP is currently blocked from requesting a password
 * reset.
 * @returns {{ allowed: true } | { allowed: false, retryAfter: number }}
 */
export function checkPasswordResetRateLimit(ip) {
  const record = passwordResetAttempts.get(ip);
  if (!record) return { allowed: true };

  const now = Date.now();
  record.timestamps = record.timestamps.filter(
    (t) => now - t < PWRESET_WINDOW_MS,
  );

  if (record.timestamps.length >= PWRESET_MAX) {
    const oldest = record.timestamps[0];
    const waitMs = PWRESET_WINDOW_MS - (now - oldest);
    return { allowed: false, retryAfter: Math.ceil(waitMs / 1000) };
  }

  return { allowed: true };
}

/** Record a password-reset request for the given IP. */
export function recordPasswordReset(ip) {
  let record = passwordResetAttempts.get(ip);
  if (!record) {
    record = { timestamps: [] };
    passwordResetAttempts.set(ip, record);
  }
  record.timestamps.push(Date.now());
}

// ---------------------------------------------------------------------------
// OTP SEND – 1 code per minute, keyed by account email
//
// A double-tap on "Send code" / "Resend code" used to fire as many emails as
// taps. This cooldown is keyed by the account (not the IP) so one address can
// receive at most one code per minute, whichever network it comes from.
// ---------------------------------------------------------------------------

const OTP_SEND_COOLDOWN_MS = 60_000; // 1 minute
const OTP_SEND_MAX = 1;

/**
 * Check whether a code may be sent to this account right now.
 * @returns {{ allowed: true } | { allowed: false, retryAfter: number }}
 */
export function checkOtpSendCooldown(key) {
  const record = otpSendAttempts.get(key);
  if (!record) return { allowed: true };

  const now = Date.now();
  record.timestamps = record.timestamps.filter(
    (t) => now - t < OTP_SEND_COOLDOWN_MS,
  );

  if (record.timestamps.length >= OTP_SEND_MAX) {
    const oldest = record.timestamps[0];
    const waitMs = OTP_SEND_COOLDOWN_MS - (now - oldest);
    return { allowed: false, retryAfter: Math.ceil(waitMs / 1000) };
  }

  return { allowed: true };
}

/** Reserve a send slot for the given account (call before the async send). */
export function recordOtpSend(key) {
  let record = otpSendAttempts.get(key);
  if (!record) {
    record = { timestamps: [] };
    otpSendAttempts.set(key, record);
  }
  record.timestamps.push(Date.now());
}

/** Release the send slot (e.g. when the SMTP send failed, so retry is free). */
export function clearOtpSend(key) {
  otpSendAttempts.delete(key);
}

// ---------------------------------------------------------------------------
// OTP VERIFICATION – failed-attempt tracking (keyed by IP + email)
//
// Without this, a 6-digit code could be brute-forced: PATCH/PUT had no limit
// at all, so guessing the code granted a full password reset.
// ---------------------------------------------------------------------------

const OTP_WINDOW_MS = 900_000; // 15 minutes
const OTP_MAX = 5;

/** @type {Map<string, { timestamps: number[] }>} */
const otpVerifyAttempts = new Map();

/**
 * Check whether OTP verification is currently blocked for this key.
 * @returns {{ allowed: true } | { allowed: false, retryAfter: number }}
 */
export function checkOtpVerifyRateLimit(key) {
  const record = otpVerifyAttempts.get(key);
  if (!record) return { allowed: true };

  const now = Date.now();
  record.timestamps = record.timestamps.filter((t) => now - t < OTP_WINDOW_MS);

  if (record.timestamps.length >= OTP_MAX) {
    const oldest = record.timestamps[0];
    const waitMs = OTP_WINDOW_MS - (now - oldest);
    return { allowed: false, retryAfter: Math.ceil(waitMs / 1000) };
  }

  return { allowed: true };
}

/** Record a failed OTP verification attempt. */
export function recordOtpVerifyFailure(key) {
  let record = otpVerifyAttempts.get(key);
  if (!record) {
    record = { timestamps: [] };
    otpVerifyAttempts.set(key, record);
  }
  record.timestamps.push(Date.now());
}

/** Clear failed OTP attempts (called after a successful password reset). */
export function clearOtpVerifyAttempts(key) {
  otpVerifyAttempts.delete(key);
}