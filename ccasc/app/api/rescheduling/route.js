import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { formatDbDate, parseSqlDate } from "@/lib/utils";
import {
  validateAdvanceBookingDates,
  getMinEventDateKey,
} from "@/lib/reservation-advance-booking";
import {
  applyRescheduleDateChanges,
  toDateOnly,
  formatRescheduleDateChanges,
  validateRescheduleAvailability,
} from "@/lib/reschedule-utils";
import {
  isCulturalCenterVenue,
  notifyCulturalCenterCoordinators,
} from "@/lib/coordinator-notifications";

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

    const reservation = await prisma.reservation.findUnique({
      where: { reservationId: parseInt(reservationId, 10) },
      include: {
        additionalDates: {
          select: { reservationDateId: true, eventDate: true },
        },
        venue: { select: { venue: true } },
        client: { select: { clientId: true, firstName: true, lastName: true } },
      },
    });

    if (!reservation) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
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
    if (normalized.error) {
      return NextResponse.json({ error: normalized.error }, { status: 400 });
    }

    const { changes } = normalized;
    const advanceCheck = validateAdvanceBookingDates(
      changes.map((c) => c.requestedDate)
    );
    if (!advanceCheck.valid) {
      return NextResponse.json(
        { error: advanceCheck.error, minDate: advanceCheck.minDate },
        { status: 400 }
      );
    }

    const availability = await validateRescheduleAvailability(reservation, changes);
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

    const primaryChange = changes.find((c) => c.isPrimary) || changes[0];

    const rescheduleRequest = await prisma.rescheduleRequest.create({
      data: {
        reservationId: parseInt(reservationId, 10),
        requestedDate: toDateOnly(primaryChange.requestedDate),
        reason: trimmedReason,
        status: "Pending",
        dateChanges: {
          create: changes.map((c) => ({
            originalDate: toDateOnly(c.originalDate),
            requestedDate: toDateOnly(c.requestedDate),
            reservationDateId: c.reservationDateId,
            isPrimary: c.isPrimary,
          })),
        },
      },
      include: { dateChanges: true },
    });

    if (isCulturalCenterVenue(reservation.venueId)) {
      const clientName = `${reservation.client.firstName} ${reservation.client.lastName}`;
      const dateSummary = changes
        .map((c) => `${c.originalDate} → ${c.requestedDate}`)
        .join("; ");
      await notifyCulturalCenterCoordinators({
        clientId: reservation.client.clientId,
        type: "reschedule",
        message: `New rescheduling request from ${clientName} for "${reservation.eventType}" at ${reservation.venue?.venue || "Cultural Center"}. Change(s): ${dateSummary}. Reason: ${trimmedReason}`,
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
      const result = await applyRescheduleDateChanges(id);
      if (result.error) {
        return NextResponse.json(
          {
            error: result.error,
            conflictDates: result.conflictDates,
          },
          { status: result.status || 400 }
        );
      }
      return NextResponse.json(result.existing);
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
  try {
    const { searchParams } = new URL(request.url);
    const reservationId = searchParams.get("reservationId");
    const clientId = searchParams.get("clientId");

    const where = {};
    if (reservationId) {
      where.reservationId = parseInt(reservationId, 10);
    } else if (clientId) {
      where.reservation = {
        clientId: parseInt(String(clientId).replace(/^CLT-/, ""), 10),
      };
    } else {
      return NextResponse.json(
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
      reason: r.reason,
      status: r.status,
      declineReason: r.declineReason || null,
      createdAt: r.createdAt.toISOString(),
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Reschedule fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch rescheduling requests" },
      { status: 500 }
    );
  }
}
