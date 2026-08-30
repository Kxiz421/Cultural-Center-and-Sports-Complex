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

export function documentsForEventDate(documents, dateKey, primaryKey = null) {
  if (!dateKey) return documents || [];
  return (documents || []).filter(
    (doc) => documentEventDateKey(doc, primaryKey) === dateKey
  );
}

export function resolveReservationEventDate(reservation, requestedDate) {
  const keys = reservationEventDateKeys(reservation);
  if (keys.length === 0) {
    return { error: "This reservation has no event dates.", status: 400 };
  }

  const parsed = parseSqlDate(requestedDate);
  if (keys.length === 1) {
    return { eventDateKey: keys[0], eventDates: keys };
  }

  if (!parsed || !keys.includes(parsed)) {
    return {
      error: "Select a valid event date for this multi-date reservation.",
      status: 400,
      eventDates: keys,
    };
  }

  return { eventDateKey: parsed, eventDates: keys };
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

export function phaseSubmittedCount(phase) {
  if (!phase) return 0;
  return [
    phase.billingStatus,
    phase.receiptStatus,
    phase.certStatus,
    phase.leaseStatus,
  ].filter(Boolean).length;
}
