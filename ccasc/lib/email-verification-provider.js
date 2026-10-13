/**
 * Third-party mailbox verification (ZeroBounce).
 *
 * A DNS/MX check only proves a domain can receive mail - not that a specific
 * mailbox exists. ZeroBounce performs an SMTP-level probe and can report
 * whether an address exists (including Gmail), at the cost of one API credit
 * per lookup.
 *
 * The API key is server-side only - never expose it to the browser. Results
 * are cached and per-IP limited so the paid credits are not burned by the
 * registration form's as-you-type checks.
 */

const ZEROBOUNCE_ENDPOINT = "https://api.zerobounce.net/v2/validate";

/** Reuse a cached verdict for a day; repeat lookups of the same address are free. */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** Cap paid lookups per IP to protect credits from abuse. */
const LOOKUP_WINDOW_MS = 60 * 60 * 1000;
const LOOKUP_MAX_PER_WINDOW = 30;

/** email -> { result, expiresAt } */
const resultCache = new Map();
/** ip -> number[] (lookup timestamps) */
const ipLookups = new Map();

/** True when a verification provider API key is configured. */
export function isEmailVerificationProviderConfigured() {
  return Boolean(process.env.ZEROBOUNCE_API_KEY);
}

function withinLookupLimit(ip) {
  if (!ip) return true;
  const now = Date.now();
  const stamps = (ipLookups.get(ip) || []).filter((t) => now - t < LOOKUP_WINDOW_MS);
  ipLookups.set(ip, stamps);
  return stamps.length < LOOKUP_MAX_PER_WINDOW;
}

function recordLookup(ip) {
  if (!ip) return;
  const stamps = ipLookups.get(ip) || [];
  stamps.push(Date.now());
  ipLookups.set(ip, stamps);
}

/**
 * Ask the provider about a single address.
 *
 * @param {string} email
 * @param {{ ip?: string }} [options]
 * @returns {Promise<{ provider: string, status: string, didYouMean: string|null }|null>}
 *   null when the provider is not configured, rate-limited, or unreachable
 *   (callers then fall back to the DNS check).
 */
export async function verifyEmailWithProvider(email, { ip } = {}) {
  const apiKey = process.env.ZEROBOUNCE_API_KEY;
  if (!apiKey) return null;

  const normalized = String(email ?? "").trim().toLowerCase();
  if (!normalized) return null;

  const cached = resultCache.get(normalized);
  if (cached && cached.expiresAt > Date.now()) return cached.result;

  if (!withinLookupLimit(ip)) {
    console.warn("Email verification lookup rate limit reached; skipping provider call.");
    return null;
  }
  recordLookup(ip);

  try {
    const url =
      `${ZEROBOUNCE_ENDPOINT}?api_key=${encodeURIComponent(apiKey)}` +
      `&email=${encodeURIComponent(normalized)}&ip_address=`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;

    const json = await res.json();
    // ZeroBounce reports API problems (bad key, out of credits) as an `error`.
    if (!json || json.error || typeof json.status !== "string") {
      if (json?.error) console.warn("ZeroBounce error:", json.error);
      return null;
    }

    const result = {
      provider: "zerobounce",
      status: json.status,
      didYouMean: json.did_you_mean || null,
    };
    // Only successful verdicts are cached; transient failures may retry.
    resultCache.set(normalized, { result, expiresAt: Date.now() + CACHE_TTL_MS });
    return result;
  } catch (err) {
    console.warn("Email verification provider request failed:", err?.message || err);
    return null;
  }
}
