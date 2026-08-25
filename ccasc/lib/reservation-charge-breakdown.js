const CHARGE_BREAKDOWN_RE = /\n?<!--CHARGE_BREAKDOWN:(.*?)-->$/;

/** Embed charge lines JSON in reservation notes for order-of-payment display. */
export function embedChargeBreakdownInNotes(notes, chargeLines) {
  const clean = stripChargeBreakdownFromNotes(notes);
  if (!chargeLines?.length) return clean || null;
  const payload = JSON.stringify(chargeLines);
  return `${clean || ""}\n<!--CHARGE_BREAKDOWN:${payload}-->`.trim();
}

/** Extract stored charge lines from reservation notes. */
export function extractChargeBreakdownFromNotes(notes) {
  if (!notes) return null;
  const match = String(notes).match(CHARGE_BREAKDOWN_RE);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Remove embedded charge breakdown from notes for user-visible remarks. */
export function stripChargeBreakdownFromNotes(notes) {
  if (!notes) return null;
  const stripped = String(notes).replace(CHARGE_BREAKDOWN_RE, "").trim();
  return stripped || null;
}

export function sumChargeLineAmounts(chargeLines) {
  if (!Array.isArray(chargeLines)) return 0;
  return chargeLines.reduce((sum, line) => sum + Number(line.amount || 0), 0);
}

/** Normalize charge lines from client summary builder. */
export function normalizeChargeLines(chargeLines) {
  if (!Array.isArray(chargeLines)) return [];
  return chargeLines
    .map((line) => ({
      date: line.date || null,
      label: String(line.label || "").trim(),
      amount: Number(line.amount) || 0,
    }))
    .filter((line) => line.label && line.amount > 0);
}
