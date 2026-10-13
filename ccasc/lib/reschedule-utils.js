import prisma from "@/lib/prisma";
import { formatDbDate, parseSqlDate } from "@/lib/utils";
import { validateAdvanceBookingDates } from "@/lib/reservation-advance-booking";
import {
  ACTIVE_STATUSES,
  buildReservedFacilitiesByDate,
  findFacilityConflicts,
} from "@/lib/facility-reservation-availability";
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

  const currentKey = formatDbDate(reservationEventDate);
  const requestedKey = formatDbDate(request.requestedDate);
  // A request that only manages facilities / particulars / time slot stores the
  // current date, which is not a date change.
  if (!requestedKey || requestedKey === currentKey) return [];

  return [
    {
      originalDate: currentKey || requestedKey,
      requestedDate: requestedKey,
      reservationDateId: null,
      isPrimary: true,
    },
  ];
}

/**
 * Facilities requested by a scope change must be free on every event day of the
 * reservation (the day itself still belongs to this reservation).
 */
export async function validateRescheduleFacilityAvailability(
  reservation,
  scope,
  dateKeys
) {
  const requestedIds = [
    ...new Set((scope?.facilities || []).map((f) => Number(f.facilityId))),
  ].filter((id) => Number.isInteger(id));
  if (requestedIds.length === 0) return { ok: true };

  const uniqueKeys = [...new Set((dateKeys || []).filter(Boolean))];
  if (uniqueKeys.length === 0) return { ok: true };

  const dateObjects = uniqueKeys.map((d) => new Date(`${d}T00:00:00.000Z`));
  const others = await prisma.reservation.findMany({
    where: {
      venueId: reservation.venueId,
      reservationId: { not: reservation.reservationId },
      reservationStatus: { in: ACTIVE_STATUSES },
      OR: [
        { eventDate: { in: dateObjects } },
        { additionalDates: { some: { eventDate: { in: dateObjects } } } },
      ],
    },
    select: {
      notes: true,
      eventDate: true,
      additionalDates: { select: { eventDate: true } },
      schedules: { select: { facilityId: true } },
    },
  });

  const reservedByDate = buildReservedFacilitiesByDate(others);
  const assignments = {};
  for (const key of uniqueKeys) assignments[key] = requestedIds;

  const conflicts = findFacilityConflicts(reservedByDate, assignments);
  if (conflicts.length === 0) return { ok: true };

  const conflictDates = [...new Set(conflicts.map((c) => c.date))].sort();
  const conflictFacilities = [...new Set(conflicts.map((c) => c.facilityId))];

  return {
    ok: false,
    status: 409,
    conflictDates,
    conflictFacilityIds: conflictFacilities,
    error: `The selected facility is already reserved on ${conflictDates.join(
      ", "
    )}. Please choose another facility or keep the current schedule.`,
  };
}

/**
 * Apply an approved reschedule request: only its date changes. Facilities,
 * particulars and the time slot always stay as they were.
 *
 * @returns {{ ok: true, existing: object } | { error: string, status: number }}
 */
export async function applyRescheduleRequest(rescheduleId) {
  const existing = await prisma.rescheduleRequest.findUnique({
    where: { rescheduleId },
    include: {
      dateChanges: true,
      reservation: {
        include: {
          additionalDates: true,
          reservedParticulars: {
            include: {
              particular: {
                select: {
                  particularId: true,
                  particularName: true,
                  inventory: { select: { unitCost: true } },
                },
              },
            },
          },
          schedules: { select: { facilityId: true } },
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
    // Legacy request with no date rows: apply it only when it actually moves the
    // date. (Scope-only requests no longer change anything.)
    const currentKey = formatDbDate(reservation.eventDate);
    const requestedKey = formatDbDate(existing.requestedDate);
    if (requestedKey && requestedKey !== currentKey) {
      changes = [
        {
          isPrimary: true,
          reservationDateId: null,
          originalDate: reservation.eventDate,
          requestedDate: existing.requestedDate,
        },
      ];
    }
  }

  const requestedKeys = changes.map((c) => formatDbDate(c.requestedDate));
  if (requestedKeys.length > 0) {
    const advanceCheck = validateAdvanceBookingDates(requestedKeys);
    if (!advanceCheck.valid) {
      return { error: advanceCheck.error, status: 400 };
    }
  }

  const availability =
    changes.length > 0
      ? await validateRescheduleAvailability(reservation, changes)
      : {
          ok: true,
          target: buildRescheduleTargetDates(reservation, []),
        };
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
    scopeChange: null,
  };
}

/** @deprecated Use `applyRescheduleRequest` (kept as an alias for older callers). */
export const applyRescheduleDateChanges = applyRescheduleRequest;
