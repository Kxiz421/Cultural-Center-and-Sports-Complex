/**
 * Walk-in reservations are created on behalf of a client who has no registered
 * account. The reservation carries no `client_id`; the client's identity is
 * stored in `Reservation.notes` as:
 *
 *   "Walk-in client: {Name} | Contact: {contact|N/A} | Email: {email|N/A}[ | Notes: ...][ | Facilities: ...]"
 *
 * These helpers are the single place that reads that convention, so every API
 * that displays a reservation's client can fall back to the walk-in name.
 */

const PREFIX = "Walk-in client:";

/** True when a reservation's notes mark it as a walk-in. */
export function isWalkInReservation(notes) {
  return typeof notes === "string" && notes.startsWith(PREFIX);
}

/**
 * Parse the walk-in client's details out of a reservation's notes.
 * @param {string|null|undefined} notes
 * @returns {{ name: string, contact: string|null, email: string|null }}
 */
export function parseWalkInClient(notes) {
  const result = { name: "", contact: null, email: null };
  if (!isWalkInReservation(notes)) return result;

  const parts = notes.slice(PREFIX.length).split("|").map((p) => p.trim());
  result.name = parts.shift() || "";

  for (const part of parts) {
    const idx = part.indexOf(":");
    if (idx === -1) continue;
    const label = part.slice(0, idx).trim().toLowerCase();
    const value = part.slice(idx + 1).trim();
    if (label === "contact") result.contact = value || null;
    else if (label === "email") result.email = value || null;
  }

  return result;
}

/** Best display name: the walk-in name from notes, or a generic fallback. */
export function walkInDisplayName(notes, fallback = "Walk-in Client") {
  return parseWalkInClient(notes).name || fallback;
}
