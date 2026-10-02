import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { formatDbDate, parseSqlDate } from "@/lib/utils";
import {
  validateAdvanceBookingDates,
  getMinEventDateKey,
} from "@/lib/reservation-advance-booking";
import {
  applyRescheduleRequest,
  toDateOnly,
  formatRescheduleDateChanges,
  validateRescheduleAvailability,
  validateRescheduleFacilityAvailability,
} from "@/lib/reschedule-utils";
import {
  canManageReservationScope,
  describeScopeChange,
  formatScopeChange,
  normalizeScopeChangeInput,
  scopeChangeFromJson,
  scopeChangeToJson,
} from "@/lib/reschedule-scope";
import { SPORTS_COMPLEX_VENUE_ID } from "@/lib/venues";
import {
  isCulturalCenterVenue,
  notifyCulturalCenterCoordinators,
} from "@/lib/coordinator-notifications";
import { noCacheJson } from "@/lib/api-cache-control";
import { walkInDisplayName } from "@/lib/walk-in";

import { requireApiAuth, resolveClientScope, isClientRole, ownClientId } from "@/lib/api-auth";
function normalizeDateChanges(body, reservation) {
  const primaryKey = formatDbDate(reservation.eventDate);
  let raw = Array.isArray(body.dateChanges) ? body.dateChanges : null;

  if ((!raw || raw.length === 0) && body.requestedDate) {
    raw = [
      {
        originalDate: primaryKey,
        requestedDate: body.requestedDate,
        reservationDateId: null,
        isPrimary: true,
      },
    ];
  }

  if (!raw || raw.length === 0) {
    return { error: "At least one date change is required" };
  }

  const additionalById = new Map(
    (reservation.additionalDates || []).map((ad) => [
      ad.reservationDateId,
      formatDbDate(ad.eventDate),
    ])
  );
  const additionalByDate = new Map(
    (reservation.additionalDates || []).map((ad) => [
      formatDbDate(ad.eventDate),
      ad.reservationDateId,
    ])
  );

  const changes = [];
  for (const row of raw) {
    const requestedKey = parseSqlDate(row.requestedDate);
    const originalKey =
      parseSqlDate(row.originalDate) ||
      (row.isPrimary || row.reservationDateId == null ? primaryKey : null);

    if (!requestedKey || !originalKey) {
      return { error: "Each date change needs originalDate and requestedDate" };
    }
    if (requestedKey === originalKey) continue;

    let reservationDateId =
      row.reservationDateId != null && row.reservationDateId !== ""
        ? parseInt(row.reservationDateId, 10)
        : null;
    let isPrimary = Boolean(row.isPrimary) || reservationDateId == null;

    if (reservationDateId != null) {
      if (!additionalById.has(reservationDateId)) {
        return { error: `Unknown reservation date id ${reservationDateId}` };
      }
      isPrimary = false;
    } else if (!isPrimary && additionalByDate.has(originalKey)) {
      reservationDateId = additionalByDate.get(originalKey);
      isPrimary = false;
    } else {
      isPrimary = true;
      reservationDateId = null;
      if (originalKey !== primaryKey) {
        return {
          error: `Original date ${originalKey} is not the primary event date for this reservation`,
        };
      }
    }

    changes.push({
      originalDate: originalKey,
      requestedDate: requestedKey,
      reservationDateId,
      isPrimary,
    });
  }

  if (changes.length === 0) {
    return {
      error: "Select at least one new date that differs from the current date",
    };
  }

  return { changes };
}

export async function POST(request) {
  const guard = await requireApiAuth();
  if (guard.response) return guard.response;

  try {
    const body = await request.json();
    const { reservationId, reason } = body;

    if (!reservationId || !String(reason ?? "").trim()) {
      return NextResponse.json(
        { error: "Missing required fields: reservationId, reason" },
        { status: 400 }
      );
    }

    const trimmedReason = String(reason).trim();
    const parsedReservationId = parseInt(
      String(reservationId).replace(/^RES-/i, ""),
      10
    );

    const reservation = await prisma.reservation.findUnique({
      where: {
        reservationId: parsedReservationId,
      },
      include: {
        additionalDates: {
          select: { reservationDateId: true, eventDate: true },
        },
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
        timeSlot: { select: { startTime: true, endTime: true } },
        venue: { select: { venue: true } },
        client: { select: { clientId: true, firstName: true, lastName: true } },
        bookings: { select: { payments: { select: { amountPaid: true } } } },
      },
    });

    if (!reservation) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }

    // Client-role sessions may only reschedule their own reservation.
    const ownRescheduleClientId = ownClientId(guard.user);
    if (
      ownRescheduleClientId != null &&
      reservation.client?.clientId !== ownRescheduleClientId
    ) {
      return NextResponse.json(
        { error: "You do not have access to this reservation." },
        { status: 403 }
      );
    }

    // One open request per event. While a request is still Pending review a
    // second one must not be created; it frees up once staff approve
    // ("Approved") or decline ("Declined") it.
    const pendingRequest = await prisma.rescheduleRequest.findFirst({
      where: { reservationId: parsedReservationId, status: "Pending" },
      select: { rescheduleId: true },
    });
    if (pendingRequest) {
      return NextResponse.json(
        {
          error:
            "This event already has a rescheduling request pending review. You can submit another once it has been approved or declined.",
        },
        { status: 409 }
      );
    }

    const eventDate = new Date(reservation.eventDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    eventDate.setHours(0, 0, 0, 0);

    if (eventDate < today) {
      return NextResponse.json(
        { error: "Cannot reschedule an event that has already passed" },
        { status: 400 }
      );
    }

    const normalized = normalizeDateChanges(body, reservation);
    const requestedKeysForScope = (normalized.changes || []).map(
      (c) => c.requestedDate
    );

    // Facilities / particulars / time slot the client wants to manage. This is
    // allowed on the same date too, while the reservation is still editable:
    // Cultural Center until the 10% deposit is applied, Sports Complex until
    // the booking is confirmed.
    const scopeInput = normalizeScopeChangeInput(body.scopeChange);
    if (scopeInput.error) {
      return NextResponse.json({ error: scopeInput.error }, { status: 400 });
    }
    const scope = scopeInput.scope;

    // A request only fails when the caller asked for date changes it cannot
    // make; a request that only manages the scope has no date changes at all.
    const hasDateInput =
      (Array.isArray(body.dateChanges) && body.dateChanges.length > 0) ||
      Boolean(body.requestedDate);
    if (normalized.error && (hasDateInput || !scope)) {
      return NextResponse.json({ error: normalized.error }, { status: 400 });
    }

    const changes = normalized.changes || [];
    const hasDateChange = changes.length > 0;

    const paidAmount = (reservation.bookings || []).reduce(
      (sum, booking) =>
        sum +
        (booking.payments || []).reduce(
          (s, p) => s + Number(p.amountPaid || 0),
          0
        ),
      0
    );

    let scopeRecords = null;
    if (scope) {
      const allowed = canManageReservationScope({
        venueId: reservation.venueId,
        reservationStatus: reservation.reservationStatus,
        totalAmount: reservation.totalAmount,
        paidAmount,
      });
      if (!allowed.allowed) {
        return NextResponse.json({ error: allowed.reason }, { status: 409 });
      }

      // Facilities belong to the venue of the reservation.
      if (scope.facilities.length > 0) {
        const facilities = await prisma.facility.findMany({
          where: {
            facilityId: { in: scope.facilities.map((f) => f.facilityId) },
          },
          select: { facilityId: true, facilityName: true, venueId: true },
        });
        if (facilities.length !== scope.facilities.length) {
          return NextResponse.json(
            { error: "One of the selected facilities no longer exists." },
            { status: 400 }
          );
        }
        const foreign = facilities.filter(
          (f) => Number(f.venueId) !== Number(reservation.venueId)
        );
        if (foreign.length > 0) {
          return NextResponse.json(
            {
              error: `Facilities must belong to the ${
                reservation.venue?.venue || "reservation's venue"
              }: ${foreign.map((f) => f.facilityName).join(", ")} cannot be booked here.`,
            },
            { status: 400 }
          );
        }
        scopeRecords = { facilities };
      }

      // The Sports Complex is booked per facility - at least one must stay.
      if (
        Number(reservation.venueId) === SPORTS_COMPLEX_VENUE_ID &&
        scope.facilities.length === 0
      ) {
        return NextResponse.json(
          { error: "Please keep at least one Sports Complex facility." },
          { status: 400 }
        );
      }

      if (scope.particulars.length > 0) {
        const particulars = await prisma.particular.findMany({
          where: {
            particularId: { in: scope.particulars.map((p) => p.particularId) },
          },
          select: { particularId: true, particularName: true },
        });
        if (particulars.length !== scope.particulars.length) {
          return NextResponse.json(
            { error: "One of the selected particulars no longer exists." },
            { status: 400 }
          );
        }
        scopeRecords = { ...(scopeRecords || {}), particulars };
      }

      // Facilities must be free on every day the event runs. Date changes are
      // not applied yet, so validate against the requested dates.
      const targetKeys = hasDateChange
        ? requestedKeysForScope
        : [
            formatDbDate(reservation.eventDate),
            ...(reservation.additionalDates || []).map((ad) =>
              formatDbDate(ad.eventDate)
            ),
          ];
      const facilityCheck = await validateRescheduleFacilityAvailability(
        reservation,
        scope,
        targetKeys
      );
      if (!facilityCheck.ok) {
        return NextResponse.json(
          {
            error: facilityCheck.error,
            conflictDates: facilityCheck.conflictDates,
          },
          { status: facilityCheck.status || 409 }
        );
      }
    }

    if (hasDateChange) {
      const advanceCheck = validateAdvanceBookingDates(requestedKeysForScope);
      if (!advanceCheck.valid) {
        return NextResponse.json(
          { error: advanceCheck.error, minDate: advanceCheck.minDate },
          { status: 400 }
        );
      }

      const availability = await validateRescheduleAvailability(
        reservation,
        changes
      );
      if (availability.error) {
        return NextResponse.json(
          {
            error: availability.error,
            conflictDates: availability.conflictDates,
            bookedDates: availability.bookedDates,
            blockedDates: availability.blockedDates,
          },
          { status: availability.status || 400 }
        );
      }
    }

    // `requestedDate` is required by the table; a scope-only request keeps the
    // current primary date so no date moves.
    const primaryChange = changes.find((c) => c.isPrimary) || changes[0] || null;
    const requestedDate =
      primaryChange?.requestedDate || formatDbDate(reservation.eventDate);

    const rescheduleRequest = await prisma.rescheduleRequest.create({
      data: {
        reservationId: parsedReservationId,
        requestedDate: toDateOnly(requestedDate),
        reason: trimmedReason,
        status: "Pending",
        scopeChange: scopeChangeToJson(scope),
        dateChanges:
          changes.length > 0
            ? {
                create: changes.map((c) => ({
                  originalDate: toDateOnly(c.originalDate),
                  requestedDate: toDateOnly(c.requestedDate),
                  reservationDateId: c.reservationDateId,
                  isPrimary: c.isPrimary,
                })),
              }
            : undefined,
      },
      include: { dateChanges: true },
    });

    if (isCulturalCenterVenue(reservation.venueId)) {
      const clientName = reservation.client
        ? `${reservation.client.firstName} ${reservation.client.lastName}`
        : walkInDisplayName(reservation.notes);
      const changeParts = [];
      if (changes.length > 0) {
        changeParts.push(
          `date(s): ${changes
            .map((c) => `${c.originalDate} → ${c.requestedDate}`)
            .join("; ")}`
        );
      }
      if (scope) {
        changeParts.push(
          `scope: ${describeScopeChange(scope, scopeRecords || {})}`
        );
      }
      await notifyCulturalCenterCoordinators({
        clientId: reservation.client?.clientId,
        type: "reschedule",
        message: `New rescheduling request from ${clientName} for "${reservation.eventType}" at ${reservation.venue?.venue || "Cultural Center"}. Change(s): ${changeParts.join(" | ") || "none"}. Reason: ${trimmedReason}`,
      });
    }

    return NextResponse.json(
      {
        id: rescheduleRequest.rescheduleId,
        message: "Rescheduling request submitted successfully",
        dateChanges: formatRescheduleDateChanges(
          rescheduleRequest,
          reservation.eventDate
        ),
        scopeChange: scope
          ? formatScopeChange(scope, scopeRecords || {})
          : null,
        earliestDate: getMinEventDateKey(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Reschedule request error:", error);
    return NextResponse.json(
      { error: "Failed to submit rescheduling request" },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  // Approving/declining a reschedule is staff-only; a client must never be
  // able to approve their own request.
  const guard = await requireApiAuth(["admin", "accounting clerk", "local treasury operations officer", "program coordinator cultural", "program coordinator sports"]);
  if (guard.response) return guard.response;

  try {
    const { rescheduleId, status } = await request.json();

    if (!rescheduleId || !status) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const id = parseInt(rescheduleId, 10);

    if (status === "Approved") {
      const result = await applyRescheduleRequest(id);
      if (result.error) {
        return NextResponse.json(
          {
            error: result.error,
            conflictDates: result.conflictDates,
          },
          { status: result.status || 400 }
        );
      }
      return NextResponse.json({
        ...result.existing,
        dateChanges: result.dateChanges,
        scopeChange: result.scopeChange,
      });
    }

    const rescheduleRequest = await prisma.rescheduleRequest.update({
      where: { rescheduleId: id },
      data: { status },
    });

    return NextResponse.json(rescheduleRequest);
  } catch (error) {
    console.error("Reschedule update error:", error);
    return NextResponse.json(
      { error: "Failed to update rescheduling request" },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  const guard = await requireApiAuth();
  if (guard.response) return guard.response;

  try {
    const { searchParams } = new URL(request.url);
    const reservationId = searchParams.get("reservationId");
    // Client-role sessions are pinned to their own reschedule requests.
    const clientId = resolveClientScope(guard.user, searchParams.get("clientId"));

    const where = {};
    if (isClientRole(guard.user)) {
      // Always scoped to the caller's own client; reservationId refines it.
      where.reservation = { clientId: ownClientId(guard.user) };
      if (reservationId) where.reservationId = parseInt(reservationId, 10);
    } else if (reservationId) {
      where.reservationId = parseInt(reservationId, 10);
    } else if (clientId) {
      where.reservation = { clientId };
    } else {
      return noCacheJson(
        { error: "Reservation ID or client ID required" },
        { status: 400 }
      );
    }

    const requests = await prisma.rescheduleRequest.findMany({
      where,
      include: {
        dateChanges: {
          orderBy: [{ isPrimary: "desc" }, { originalDate: "asc" }],
        },
        reservation: {
          select: {
            reservationId: true,
            eventType: true,
            eventDate: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = requests.map((r) => ({
      id: r.rescheduleId,
      reservationId: r.reservationId,
      eventType: r.reservation?.eventType || null,
      requestedDate: formatDbDate(r.requestedDate),
      dateChanges: formatRescheduleDateChanges(r, r.reservation?.eventDate),
      scopeChange: scopeChangeFromJson(r.scopeChange),
      reason: r.reason,
      status: r.status,
      declineReason: r.declineReason || null,
      createdAt: r.createdAt.toISOString(),
    }));

    // Resolve facility / particular names for the requested scope changes.
    const scopeList = formatted.map((r) => r.scopeChange).filter(Boolean);
    if (scopeList.length > 0) {
      const facilityIds = [
        ...new Set(
          scopeList.flatMap((s) => (s.facilities || []).map((f) => Number(f.facilityId)))
        ),
      ];
      const particularIds = [
        ...new Set(
          scopeList.flatMap((s) =>
            (s.particulars || []).map((p) => Number(p.particularId))
          )
        ),
      ];
      const [facilities, particulars] = await Promise.all([
        facilityIds.length
          ? prisma.facility.findMany({
              where: { facilityId: { in: facilityIds } },
              select: { facilityId: true, facilityName: true },
            })
          : Promise.resolve([]),
        particularIds.length
          ? prisma.particular.findMany({
              where: { particularId: { in: particularIds } },
              select: { particularId: true, particularName: true },
            })
          : Promise.resolve([]),
      ]);

      const context = {
        facilities: facilities.map((f) => ({
          facilityId: f.facilityId,
          name: f.facilityName,
        })),
        particulars: particulars.map((p) => ({
          particularId: p.particularId,
          name: p.particularName,
        })),
      };

      for (const row of formatted) {
        if (!row.scopeChange) continue;
        row.scopeChange = formatScopeChange(row.scopeChange, context);
        row.scopeChangeText = describeScopeChange(
          {
            timeSlotId: row.scopeChange.timeSlotId,
            facilities: row.scopeChange.facilities.map((f) => ({
              facilityId: f.facilityId,
              quantity: f.quantity,
            })),
            particulars: row.scopeChange.particulars.map((p) => ({
              particularId: p.particularId,
              quantity: p.quantity,
            })),
          },
          context
        );
      }
    }

    return noCacheJson(formatted);
  } catch (error) {
    console.error("Reschedule fetch error:", error);
    return noCacheJson(
      { error: "Failed to fetch rescheduling requests" },
      { status: 500 }
    );
  }
}
