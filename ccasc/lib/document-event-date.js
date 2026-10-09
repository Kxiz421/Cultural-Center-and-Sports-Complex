import { formatDbDate, parseSqlDate } from "@/lib/utils";

export function reservationEventDateKeys(reservation) {
  if (!reservation) return [];
  const keys = [formatDbDate(reservation.eventDate)];
  for (const ad of reservation.additionalDates || []) {
    const key = formatDbDate(ad.eventDate);
    if (key && !keys.includes(key)) keys.push(key);
  }
  return keys.filter(Boolean);
}

export function documentEventDateKey(doc, primaryKey = null) {
  if (doc?.eventDate) return formatDbDate(doc.eventDate);
  return primaryKey || null;
}

export function formatEventDateLabel(value) {
  const key = parseSqlDate(value) || formatDbDate(value);
  if (!key) return "—";
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}
