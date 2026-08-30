import prisma from "@/lib/prisma";
import { formatDbDate } from "@/lib/utils";

/**
 * Find venue dates that conflict with existing reservations or calendar blocks.
 * @param {{ venueId: number, dateKeys: string[], excludeReservationId?: number }} params
 */
export async function findVenueDateConflicts({
  venueId,
  dateKeys,
  excludeReservationId,
}) {
  const uniqueKeys = [...new Set(dateKeys.filter(Boolean))];
  if (uniqueKeys.length === 0) {
    return { conflictDates: [], bookedDates: [], blockedDates: [] };
  }

  const allDates = uniqueKeys.map((d) => new Date(`${d}T00:00:00.000Z`));
  const venueIdInt = parseInt(venueId, 10);

  const reservationWhere = {
    venueId: venueIdInt,
    reservationStatus: { in: ["Pending", "Confirmed"] },
    OR: [
      { eventDate: { in: allDates } },
      { additionalDates: { some: { eventDate: { in: allDates } } } },
    ],
  };

  if (excludeReservationId != null) {
    reservationWhere.reservationId = {
      not: parseInt(excludeReservationId, 10),
    };
  }

  const conflictingReservations = await prisma.reservation.findMany({
    where: reservationWhere,
    select: {
      eventDate: true,
      additionalDates: { select: { eventDate: true } },
    },
  });

  const calendarBlocks = await prisma.calendarBlock.findMany({
    where: {
      venueId: venueIdInt,
      blockDate: { in: allDates },
    },
    select: { blockDate: true },
  });

  const bookedDates = new Set();
  for (const r of conflictingReservations) {
    const primary = formatDbDate(r.eventDate);
    const additional = r.additionalDates.map((ad) => formatDbDate(ad.eventDate));
    for (const key of uniqueKeys) {
      if (key === primary || additional.includes(key)) {
        bookedDates.add(key);
      }
    }
  }

  const blockedDates = new Set(
    calendarBlocks.map((b) => formatDbDate(b.blockDate))
  );

  const conflictDates = [...new Set([...bookedDates, ...blockedDates])].sort();

  return {
    conflictDates,
    bookedDates: [...bookedDates].sort(),
    blockedDates: [...blockedDates].sort(),
  };
}

export function formatVenueDateConflictError({
  conflictDates,
  bookedDates = [],
  blockedDates = [],
}) {
  if (!conflictDates?.length) return null;

  const parts = [];
  if (bookedDates.length > 0) {
    parts.push(`already booked: ${bookedDates.join(", ")}`);
  }
  if (blockedDates.length > 0) {
    parts.push(`blocked: ${blockedDates.join(", ")}`);
  }

  const detail =
    parts.length > 0 ? parts.join("; ") : conflictDates.join(", ");

  return `The following dates are no longer available (${detail}). Someone may have reserved or blocked them since you selected them. Please choose different dates.`;
}
