import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const statusFilter = searchParams.get("status");
  const clientType = searchParams.get("clientType");
  const search = searchParams.get("search");

  try {
    const whereClause = clientId
      ? { reservation: { client: { clientId: parseInt(clientId, 10) } } }
      : {};

    // Status filter
    if (statusFilter && statusFilter !== "all") {
      whereClause.status = {
        status: statusFilter,
      };
    }

    const bookings = await prisma.booking.findMany({
      where: whereClause,
      include: {
        reservation: {
          include: {
            venue: { select: { venue: true, venueId: true } },
            client: {
              select: {
                firstName: true,
                lastName: true,
                clientRoleId: true,
                clientRole: { select: { roleName: true } },
                clientOrg: { select: { organizationName: true } },
              },
            },
            timeSlot: { select: { startTime: true, endTime: true } },
            package: {
              select: {
                packageName: true,
                dayRate: true,
                nightRate: true,
              },
            },
          },
        },
        venue: { select: { venue: true, venueId: true } },
        status: { select: { status: true, bookingStatusId: true } },
        staff: { select: { firstName: true, lastName: true } },
        payments: { select: { amountPaid: true, status: { select: { status: true } } } },
        schedules: {
          include: {
            facility: {
              select: {
                facilityName: true,
                description: true,
                capacity: true,
              },
            },
          },
        },
      },
      orderBy: { confirmationDate: { sort: "desc", nulls: "last" } },
    });

    let filtered = bookings;
    if (clientId) {
      filtered = filtered.filter(b => b.reservation.clientId === parseInt(clientId, 10));
    }

    // Date range filter
    if (dateFrom) {
      const from = new Date(dateFrom);
      filtered = filtered.filter(b => new Date(b.reservation.eventDate) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      filtered = filtered.filter(b => new Date(b.reservation.eventDate) <= to);
    }

    // Client name search
    if (search) {
      const term = search.toLowerCase();
      filtered = filtered.filter(b =>
        b.reservation.client.firstName.toLowerCase().includes(term) ||
        b.reservation.client.lastName.toLowerCase().includes(term) ||
        `${b.reservation.client.firstName} ${b.reservation.client.lastName}`.toLowerCase().includes(term)
      );
    }

    // Client type filter (based on client role: PROV = Provincial Government, PUB = Public Client)
    if (clientType && clientType !== "all") {
      filtered = filtered.filter(b =>
        b.reservation.client.clientRoleId === clientType
      );
    }

    const formatted = filtered.map((b) => ({
      id: `BK-${b.bookingId}`,
      bookingId: b.bookingId,
      reservationId: `RES-${b.reservationId}`,
      rawReservationId: b.reservationId,
      venueId: b.venueId || b.reservation.venueId,
      venue: b.venue?.venue || b.reservation.venue.venue,
      clientName: `${b.reservation.client.firstName} ${b.reservation.client.lastName}`,
      clientOrg: b.reservation.client.clientOrg?.organizationName || "N/A",
      clientRole: b.reservation.client.clientRole?.roleName || "N/A",
      eventType: b.reservation.eventType,
      eventDate: b.reservation.eventDate.toISOString().split("T")[0],
      status: b.status.status,
      staffName: b.staff ? `${b.staff.firstName} ${b.staff.lastName}` : null,
      confirmationDate: b.confirmationDate?.toISOString().split("T")[0] || null,
      amountPaid: b.payments.reduce((sum, p) => sum + Number(p.amountPaid), 0),
      timeSlot: `${b.reservation.timeSlot.startTime} — ${b.reservation.timeSlot.endTime}`,
      packageName: b.reservation.package?.packageName || null,
      packageDayRate: b.reservation.package?.dayRate ? Number(b.reservation.package.dayRate) : null,
      packageNightRate: b.reservation.package?.nightRate ? Number(b.reservation.package.nightRate) : null,
      facilities: b.schedules.map((s) => ({
        facilityName: s.facility.facilityName,
        description: s.facility.description,
        capacity: s.facility.capacity,
      })),
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Failed to fetch bookings:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}