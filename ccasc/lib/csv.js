/**
 * Tiny CSV helpers shared by the report exports.
 *
 * Every generated report (List of Activities, Revenue) writes the same plain
 * comma-separated format, so the escaping rules live here instead of being
 * copied into each export module.
 */

/** Quotes a CSV field only when it contains a comma, quote or newline. */
export function esc(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Bare 2-decimal figure — avoids thousands separators breaking CSV columns. */
export function money(value) {
  return (Number(value) || 0).toFixed(2);
}
