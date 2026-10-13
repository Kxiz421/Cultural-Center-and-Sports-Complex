import dns from "node:dns/promises";

import {
  isEmailVerificationProviderConfigured,
  verifyEmailWithProvider,
} from "@/lib/email-verification-provider";

/**
 * Provider-agnostic email validation used by the registration form to check an
 * address's legitimacy as the user types (not only on submit).
 *
 * It accepts any properly formed address regardless of provider (gmail, yahoo,
 * outlook, corporate domains, subdomains, +tags, long TLDs), then confirms the
 * domain can actually receive mail via DNS (MX, falling back to A/AAAA).
 */

// Pragmatic RFC 5321/5322-style pattern: a local part, an "@", and a domain of
// one or more labels. Deliberately not limited to any provider.
const EMAIL_PATTERN =
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

/** Common mistyped provider domains and their intended spelling. */
const COMMON_DOMAIN_TYPOS = {
  "gmial.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.con": "gmail.com",
  "gmail.cm": "gmail.com",
  "gmaill.com": "gmail.com",
  "yaho.com": "yahoo.com",
  "yahoo.co": "yahoo.com",
  "yahho.com": "yahoo.com",
  "hotmial.com": "hotmail.com",
  "outlok.com": "outlook.com",
  "outlook.co": "outlook.com",
};

export function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

export function getEmailDomain(email) {
  const normalized = normalizeEmail(email);
  const at = normalized.lastIndexOf("@");
  return at <= 0 ? "" : normalized.slice(at + 1);
}

export function isValidEmailFormat(email) {
  const trimmed = String(email ?? "").trim();
  if (!trimmed || trimmed.length > 254) return false;
  if (!EMAIL_PATTERN.test(trimmed)) return false;
  const [local, domain] = trimmed.split("@");
  if (!local || local.length > 64 || !domain) return false;
  return true;
}

/** Intended provider domain when a common typo is detected, otherwise null. */
export function suggestEmailCorrection(email) {
  const domain = getEmailDomain(email);
  const intended = COMMON_DOMAIN_TYPOS[domain];
  if (!intended) return null;
  const local = normalizeEmail(email).split("@")[0];
  return local ? `${local}@${intended}` : null;
}

/** DNS error codes that definitively mean "the domain has no such records". */
const DEFINITIVE_MISSING_CODES = new Set(["ENODATA", "ENOTFOUND", "ENOTIMP"]);

/** DNS-over-HTTPS resolvers, used when raw DNS (UDP/53) is blocked. */
const DOH_ENDPOINTS = [
  "https://cloudflare-dns.com/dns-query",
  "https://dns.google/resolve",
];

/**
 * Look up whether a domain can receive mail, distinguishing a definitive
 * "no records" answer from an inconclusive lookup (offline/timeout/server
 * failure) so we never warn about a real domain just because DNS is down.
 *
 * @returns {Promise<{ hasRecords: boolean, definitive: boolean }>}
 */
async function domainHasMailRecords(domain) {
  const attempts = ["resolveMx", "resolve4", "resolve6"];
  for (const method of attempts) {
    try {
      const records = await dns[method](domain);
      if (Array.isArray(records) && records.length > 0) {
        return { hasRecords: true, definitive: true };
      }
    } catch (err) {
      if (!DEFINITIVE_MISSING_CODES.has(err?.code)) {
        // Could not reach DNS (ECONNREFUSED, ETIMEOUT, EAI_AGAIN, SERVFAIL...).
        return { hasRecords: false, definitive: false };
      }
    }
  }
  return { hasRecords: false, definitive: true };
}

/**
 * Query a DNS-over-HTTPS resolver. Returns null when the request could not be
 * completed (offline), otherwise the parsed answer. Google and Cloudflare share
 * the same JSON schema (Status 3 = NXDOMAIN; Answer[].type 15 = MX, 1 = A).
 */
async function queryDoh(endpoint, domain, type) {
  const url = `${endpoint}?name=${encodeURIComponent(domain)}&type=${type}`;
  try {
    const res = await fetch(url, {
      headers: { accept: "application/dns-json" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (Number(json?.Status) === 3) return { hasRecords: false, nxdomain: true };
    const wantedType = type === "MX" ? 15 : 1;
    const answer = Array.isArray(json?.Answer) ? json.Answer : [];
    return {
      hasRecords: answer.some((r) => Number(r?.type) === wantedType),
      nxdomain: false,
    };
  } catch {
    return null;
  }
}

/**
 * Fallback that resolves mail records over HTTPS, for networks/VPNs that block
 * raw DNS but allow outbound HTTPS. Returns null when no resolver was reachable.
 *
 * @returns {Promise<{ hasRecords: boolean, definitive: boolean }|null>}
 */
async function domainHasMailRecordsViaDoh(domain) {
  for (const endpoint of DOH_ENDPOINTS) {
    const mx = await queryDoh(endpoint, domain, "MX");
    if (mx === null) continue;
    if (mx.hasRecords) return { hasRecords: true, definitive: true };
    if (mx.nxdomain) return { hasRecords: false, definitive: true };

    // NOERROR with no MX answer: some domains accept mail on their A record.
    const a = await queryDoh(endpoint, domain, "A");
    if (a === null) return null;
    if (a.hasRecords) return { hasRecords: true, definitive: true };
    if (a.nxdomain) return { hasRecords: false, definitive: true };
    return { hasRecords: false, definitive: true };
  }
  return null;
}

/** Translate a provider verdict into this module's result shape. */
function mapProviderResult(provider, email) {
  const status = String(provider.status || "").toLowerCase();

  if (
    provider.didYouMean &&
    isValidEmailFormat(provider.didYouMean) &&
    normalizeEmail(provider.didYouMean) !== normalizeEmail(email)
  ) {
    return {
      status: "typo",
      valid: true,
      suggestion: provider.didYouMean,
      message: `That looks like a typo - did you mean ${provider.didYouMean}?`,
    };
  }

  if (status === "valid") {
    return { status: "valid", valid: true, message: "" };
  }
  if (status === "invalid") {
    return {
      status: "undeliverable",
      valid: false,
      message: "This email address doesn't exist. Please check it.",
    };
  }
  if (status === "spamtrap" || status === "abuse" || status === "do_not_mail") {
    return {
      status: "undeliverable",
      valid: false,
      message: "This email address can't be used. Please use a different one.",
    };
  }
  // catch-all / unknown - the provider cannot confirm this mailbox.
  return { status: "unknown", valid: true, message: "" };
}

/**
 * Check whether an address is well-formed and, ideally, whether the specific
 * mailbox exists.
 *
 * When a verification provider is configured and `allowProvider` is set, its
 * SMTP-based verdict is used (it can confirm a Gmail mailbox exists). Otherwise
 * it falls back to a DNS check of the domain. Unverifiable results degrade to
 * "unknown" (non-blocking) rather than a false negative.
 *
 * @param {string} email
 * @param {{ ip?: string, allowProvider?: boolean }} [options]
 * @returns {Promise<{status: "empty"|"invalid"|"typo"|"undeliverable"|"valid"|"unknown", valid: boolean, message: string, suggestion?: string}>}
 */
export async function checkEmailDeliverability(email, { ip, allowProvider = true } = {}) {
  const trimmed = String(email ?? "").trim();
  if (!trimmed) {
    return { status: "empty", valid: false, message: "" };
  }
  if (!isValidEmailFormat(trimmed)) {
    return {
      status: "invalid",
      valid: false,
      message: "Enter a valid email address (e.g., name@gmail.com).",
    };
  }

  const suggestion = suggestEmailCorrection(trimmed);
  if (suggestion) {
    return {
      status: "typo",
      valid: true,
      suggestion,
      message: `That domain looks like a typo - did you mean ${suggestion}?`,
    };
  }

  // A configured provider can confirm the mailbox itself, which a DNS check
  // never can. Only run it for definitive ("full") checks to protect credits.
  if (allowProvider && isEmailVerificationProviderConfigured()) {
    const provider = await verifyEmailWithProvider(trimmed, { ip });
    if (provider) return mapProviderResult(provider, trimmed);
  }

  const domain = getEmailDomain(trimmed);

  try {
    let result = await domainHasMailRecords(domain);

    // Raw DNS was inconclusive (e.g. blocked): try DNS-over-HTTPS.
    if (!result.definitive) {
      const dohResult = await domainHasMailRecordsViaDoh(domain);
      if (dohResult) result = dohResult;
    }

    if (result.hasRecords) {
      return { status: "valid", valid: true, message: "" };
    }

    if (!result.definitive) {
      return {
        status: "unknown",
        valid: true,
        message: "We couldn't verify this email right now, but you can continue.",
      };
    }

    return {
      status: "undeliverable",
      valid: false,
      message: `The email domain "${domain}" doesn't appear to receive mail. Please double-check the address.`,
    };
  } catch {
    return {
      status: "unknown",
      valid: true,
      message: "We couldn't verify this email right now, but you can continue.",
    };
  }
}
