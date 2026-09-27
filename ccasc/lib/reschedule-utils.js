import prisma from "@/lib/prisma";
import { formatDbDate, parseSqlDate, roundMoney } from "@/lib/utils";
import { validateAdvanceBookingDates } from "@/lib/reservation-advance-booking";
import {
  ACTIVE_STATUSES,
  buildReservedFacilitiesByDate,
  findFacilityConflicts,
} from "@/lib/facility-reservation-availability";
import {
  embedChargeBreakdownInNotes,
  stripChargeBreakdownFromNotes,
} from "@/lib/reservation-charge-breakdown";
import {
  canManageReservationScope,
  computeScopeAmounts,
  describeScopeChange,
  isScopeEmpty,
  scopeChangeFromJson,
} from "@/lib/reschedule-scope";
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
 * Resolve the requested scope into the records the apply step needs.
 * @returns {{ error?: string, facilities?: object[], particulars?: object[] }}
 */
async function resolveScopeRecords(scope) {
  const facilityIds = (scope.facilities || []).map((f) => Number(f.facilityId));
  const particularIds = (scope.particulars || []).map((p) =>
    Number(p.particularId)
  );

  const [facilities, particulars] = await Promise.all([
    facilityIds.length
      ? prisma.facility.findMany({
          where: { facilityId: { in: facilityIds } },
          select: {
            facilityId: true,
            facilityName: true,
            venueId: true,
            rate: { select: { dayRate: true, nightRate: true } },
            status: { select: { statusName: true } },
          },
        })
      : Promise.resolve([]),
    particularIds.length
      ? prisma.particular.findMany({
          where: { particularId: { in: particularIds } },
          select: {
            particularId: true,
            particularName: true,
            inventory: { select: { unitCost: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  if (facilities.length !== facilityIds.length) {
    return { error: "One of the selected facilities no longer exists." };
  }
  if (particulars.length !== particularIds.length) {
    return { error: "One of the selected particulars no longer exists." };
  }

  return {
    facilities: facilities.map((f) => ({
      facilityId: f.facilityId,
      name: f.facilityName,
      venueId: f.venueId,
      rateDay: Number(f.rate?.dayRate || 0),
      rateNight: Number(f.rate?.nightRate || 0),
      statusName: f.status?.statusName || "",
    })),
    particulars: particulars.map((p) => ({
      particularId: p.particularId,
      name: p.particularName,
      unitCost: Number(p.inventory?.unitCost || 0),
    })),
  };
}

/**
 * Apply an approved reschedule request: its date changes AND - when the request
 * carried a scope change - the facilities, particulars and time slot, with the
 * reservation amount recomputed from the new scope.
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
  const scope = scopeChangeFromJson(existing.scopeChange);
  const hasScopeChange = !isScopeEmpty(scope);

  let changes = existing.dateChanges || [];
  if (changes.length === 0 && !hasScopeChange) {
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
  const eventDayKeys = [nextPrimary, ...nextAdditional.values()];

  // ── Scope change (facilities / particulars / time slot) ────────────────
  let scopeApply = null;
  if (hasScopeChange) {
    const allowed = canManageReservationScope({
      venueId: reservation.venueId,
      reservationStatus: reservation.reservationStatus,
      totalAmount: reservation.totalAmount,
      paidAmount: await sumReservationPayments(reservation.reservationId),
    });
    if (!allowed.allowed) return { error: allowed.reason, status: 409 };

    const facilityCheck = await validateRescheduleFacilityAvailability(
      reservation,
      scope,
      eventDayKeys
    );
    if (!facilityCheck.ok) {
      return {
        error: facilityCheck.error,
        status: facilityCheck.status || 409,
        conflictDates: facilityCheck.conflictDates,
      };
    }

    const records = await resolveScopeRecords(scope);
    if (records.error) return { error: records.error, status: 400 };

    const timeSlotId = scope.timeSlotId ?? reservation.timeSlotId;
    const packages = await prisma.package.findMany({
      select: {
        packageId: true,
        packageName: true,
        dayRate: true,
        nightRate: true,
        ledWallDayRate: true,
        ledWallNightRate: true,
        timeSlotId: true,
      },
    });

    const facilityRates =
      records.facilities.length > 0
        ? records.facilities
        : await loadCurrentFacilityRates(reservation);

    const particularsForPricing = scope.particulars.length
      ? records.particulars.map((p) => {
          const requested = scope.particulars.find(
            (x) => Number(x.particularId) === p.particularId
          );
          return { ...p, quantity: Number(requested?.quantity) || 0 };
        })
      : [];

    const { lines, total } = computeScopeAmounts({
      packages,
      packageId: reservation.packageId,
      timeSlotId,
      eventDayCount: eventDayKeys.length,
      facilityRates: facilityRates.map((f) => ({
        facilityId: f.facilityId,
        name: f.name || f.facilityName,
        rateDay: f.rateDay,
        rateNight: f.rateNight,
      })),
      facilities: scope.facilities,
      particulars: particularsForPricing,
    });

    scopeApply = {
      timeSlotId,
      facilityIds: scope.facilities.map((f) => Number(f.facilityId)),
      particulars: scope.particulars.map((p) => ({
        particularId: Number(p.particularId),
        quantity: Number(p.quantity) || 0,
      })),
      lines,
      total,
      previousTotal: Number(reservation.totalAmount || 0),
      notes: embedChargeBreakdownInNotes(
        stripChargeBreakdownFromNotes(reservation.notes),
        lines
      ),
      description: describeScopeChange(scope, {
        facilities: records.facilities,
        particulars: records.particulars,
      }),
    };
  }

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

    // Facilities / particulars / time slot of the approved request.
    if (scopeApply) {
      await tx.reservation.update({
        where: { reservationId: reservation.reservationId },
        data: {
          timeSlotId: scopeApply.timeSlotId,
          totalAmount: scopeApply.total > 0 ? scopeApply.total : null,
          notes: scopeApply.notes,
        },
      });

      if (hasScopeChange) {
        await tx.schedule.deleteMany({
          where: { reservationId: reservation.reservationId },
        });
        if (scopeApply.facilityIds.length > 0) {
          await tx.schedule.createMany({
            data: scopeApply.facilityIds.map((facilityId) => ({
              reservationId: reservation.reservationId,
              facilityId,
            })),
          });
        }

        await tx.reservedParticular.deleteMany({
          where: { reservationId: reservation.reservationId },
        });
        if (scopeApply.particulars.length > 0) {
          await tx.reservedParticular.createMany({
            data: scopeApply.particulars.map((item) => ({
              reservationId: reservation.reservationId,
              particularId: item.particularId,
              quantity: item.quantity,
            })),
          });
        }
      }
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
    scopeChange: scopeApply
      ? {
          description: scopeApply.description,
          total: scopeApply.total,
          previousTotal: scopeApply.previousTotal,
          lines: scopeApply.lines,
        }
      : null,
  };
}

/** @deprecated Use `applyRescheduleRequest` (kept as an alias for older callers). */
export const applyRescheduleDateChanges = applyRescheduleRequest;

/** Everything the client has paid on a reservation so far. */
async function sumReservationPayments(reservationId) {
  const bookings = await prisma.booking.findMany({
    where: { reservationId },
    select: { payments: { select: { amountPaid: true } } },
  });
  return roundMoney(
    bookings.reduce(
      (sum, booking) =>
        sum +
        booking.payments.reduce((s, p) => s + Number(p.amountPaid || 0), 0),
      0
    )
  );
}

/** Rates of the facilities a reservation already booked (legacy scope-change pricing). */
async function loadCurrentFacilityRates(reservation) {
  const ids = [
    ...new Set((reservation.schedules || []).map((s) => Number(s.facilityId))),
  ].filter((id) => Number.isInteger(id));
  if (ids.length === 0) return [];

  const facilities = await prisma.facility.findMany({
    where: { facilityId: { in: ids } },
    select: {
      facilityId: true,
      facilityName: true,
      rate: { select: { dayRate: true, nightRate: true } },
    },
  });

  return facilities.map((f) => ({
    facilityId: f.facilityId,
    name: f.facilityName,
    rateDay: Number(f.rate?.dayRate || 0),
    rateNight: Number(f.rate?.nightRate || 0),
  }));
}
