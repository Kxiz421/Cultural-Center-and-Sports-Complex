import prisma from "@/lib/prisma";
import { formatDbDate, parseSqlDate } from "@/lib/utils";
import { validateAdvanceBookingDates } from "@/lib/reservation-advance-booking";
import {
  findVenueDateConflicts,
  formatVenueDateConflictError,
} from "@/lib/venue-date-availability";

export function toDateOnly(value) {
  const key = parseSqlDate(value) || formatDbDate(value);
  if (!key) return null;
  return new Date(`${key}T00:00:00.000Z`);
}

export function buildRescheduleTargetDates(reservation, changes) {
  const primaryOriginal = formatDbDate(reservation.eventDate);
  let nextPrimary = primaryOriginal;
  const nextAdditional = new Map(
    (reservation.additionalDates || []).map((ad) => [
      ad.reservationDateId,
      formatDbDate(ad.eventDate),
    ])
  );

  for (const change of changes) {
    const requestedKey = formatDbDate(change.requestedDate);
    if (change.isPrimary || change.reservationDateId == null) {
      nextPrimary = requestedKey;
    } else if (nextAdditional.has(change.reservationDateId)) {
      nextAdditional.set(change.reservationDateId, requestedKey);
    }
  }

  const allNextDates = [nextPrimary, ...nextAdditional.values()];
  return { nextPrimary, nextAdditional, allNextDates, primaryOriginal };
}

export function validateRescheduleTargetDates(allNextDates) {
  const seen = new Set();
  for (const dateKey of allNextDates) {
    if (seen.has(dateKey)) {
      return {
        valid: false,
        error: "Each event day must use a different date.",
      };
    }
    seen.add(dateKey);
  }
  return { valid: true };
}

export async function validateRescheduleAvailability(reservation, changes) {
  const target = buildRescheduleTargetDates(reservation, changes);
  const uniqueCheck = validateRescheduleTargetDates(target.allNextDates);
  if (!uniqueCheck.valid) {
    return { error: uniqueCheck.error, status: 400 };
  }

  const conflicts = await findVenueDateConflicts({
    venueId: reservation.venueId,
    dateKeys: target.allNextDates,
    excludeReservationId: reservation.reservationId,
  });

  if (conflicts.conflictDates.length > 0) {
    return {
      error: formatVenueDateConflictError(conflicts),
      status: 409,
      conflictDates: conflicts.conflictDates,
      bookedDates: conflicts.bookedDates,
      blockedDates: conflicts.blockedDates,
    };
  }

  return { ok: true, target };
}

export function formatRescheduleDateChanges(request, reservationEventDate) {
  if (request.dateChanges?.length > 0) {
    return request.dateChanges.map((c) => ({
      originalDate: formatDbDate(c.originalDate),
      requestedDate: formatDbDate(c.requestedDate),
      reservationDateId: c.reservationDateId,
      isPrimary: c.isPrimary,
    }));
  }
  return [
    {
      originalDate: formatDbDate(reservationEventDate || request.requestedDate),
      requestedDate: formatDbDate(request.requestedDate),
      reservationDateId: null,
      isPrimary: true,
    },
  ];
}

/**
 * Apply approved reschedule date changes to the reservation.
 * @returns {{ ok: true, existing: object } | { error: string, status: number }}
 */
export async function applyRescheduleDateChanges(rescheduleId) {
  const existing = await prisma.rescheduleRequest.findUnique({
    where: { rescheduleId },
    include: {
      dateChanges: true,
      reservation: {
        include: {
          additionalDates: true,
          client: { select: { clientId: true, firstName: true, lastName: true } },
          venue: { select: { venueId: true, venue: true } },
        },
      },
    },
  });

  if (!existing) return { error: "Reschedule request not found", status: 404 };

  const reservation = existing.reservation;

  let changes = existing.dateChanges || [];
  if (changes.length === 0) {
    changes = [
      {
        isPrimary: true,
        reservationDateId: null,
        originalDate: reservation.eventDate,
        requestedDate: existing.requestedDate,
      },
    ];
  }

  const requestedKeys = changes.map((c) => formatDbDate(c.requestedDate));
  const advanceCheck = validateAdvanceBookingDates(requestedKeys);
  if (!advanceCheck.valid) {
    return { error: advanceCheck.error, status: 400 };
  }

  const availability = await validateRescheduleAvailability(reservation, changes);
  if (availability.error) {
    return {
      error: availability.error,
      status: availability.status || 400,
      conflictDates: availability.conflictDates,
    };
  }

  const { nextPrimary, nextAdditional, primaryOriginal } = availability.target;

  await prisma.$transaction(async (tx) => {
    if (nextPrimary !== primaryOriginal) {
      await tx.reservation.update({
        where: { reservationId: reservation.reservationId },
        data: { eventDate: new Date(`${nextPrimary}T00:00:00.000Z`) },
      });
    }

    for (const [reservationDateId, dateKey] of nextAdditional.entries()) {
      const current = reservation.additionalDates.find(
        (ad) => ad.reservationDateId === reservationDateId
      );
      if (!current) continue;
      if (formatDbDate(current.eventDate) === dateKey) continue;
      await tx.reservationDate.update({
        where: { reservationDateId },
        data: { eventDate: new Date(`${dateKey}T00:00:00.000Z`) },
      });
    }

    await tx.rescheduleRequest.update({
      where: { rescheduleId },
      data: { status: "Approved" },
    });
  });

  return {
    ok: true,
    existing,
    dateChanges: formatRescheduleDateChanges(existing, reservation.eventDate),
    nextPrimary,
  };
}
