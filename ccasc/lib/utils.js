import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as Philippine Peso (PHP) with exactly 2 decimal places.
 */
export function roundMoney(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

/** Format a numeric amount for currency input fields (2 decimal places). */
export function formatMoneyInput(amount) {
  return roundMoney(amount).toFixed(2);
}

/**
 * Restrict currency text input: max 2 decimal places, no runaway leading zeros,
 * and never above max. Returns the sanitized string to show in the input.
 */
export function sanitizeMoneyInput(raw, max) {
  const limit = roundMoney(max);
  if (raw === "" || raw === null || raw === undefined) return "";

  let s = String(raw).replace(/[^\d.]/g, "");
  const firstDot = s.indexOf(".");
  if (firstDot !== -1) {
    s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, "");
  }
  if (firstDot !== -1 && s.length - firstDot - 1 > 2) {
    s = s.slice(0, firstDot + 3);
  }

  if (s === "." || s === "") return s === "." ? "0." : "";

  const dotIdx = s.indexOf(".");
  let intPart = dotIdx === -1 ? s : s.slice(0, dotIdx);
  const decPart = dotIdx === -1 ? null : s.slice(dotIdx + 1);

  if (intPart.length > 1) {
    intPart = intPart.replace(/^0+/, "") || "0";
  }

  const MAX_INT_DIGITS = 12;
  if (intPart.length > MAX_INT_DIGITS) {
    intPart = intPart.slice(0, MAX_INT_DIGITS);
  }

  s = decPart !== null ? `${intPart}.${decPart}` : intPart;

  const numeric = Number(s);
  if (Number.isFinite(numeric) && numeric > limit) {
    return formatMoneyInput(limit);
  }

  return s;
}

export function formatPhp(amount) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(roundMoney(amount));
}

/** Format a Prisma/MySQL DATE value as YYYY-MM-DD (UTC calendar day). */
export function formatDbDate(value) {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Format a JS Date as YYYY-MM-DD using local calendar day (for UI month grids). */
export function formatLocalDateKey(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Normalize an input date string to YYYY-MM-DD for MySQL DATE columns. */
export function parseSqlDate(value) {
  if (!value) return null;
  const s = String(value).trim();
  const match = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const formatted = formatDbDate(s);
  return formatted || null;
}
