import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const CULTURAL_VENUE_IDS = [1];

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const facility = searchParams.get("facility");
    const eventType = searchParams.get("eventType");

    // Build date filter
    const dateFilter = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    // Build where clause
    const where = {
      venueId: { in: CULTURAL_VENUE_IDS },
    };
    if (Object.keys(dateFilter).length > 0) {
      where.eventDate = dateFilter;
    }
    if (eventType) {
      where.eventType = { contains: eventType };
    }

    const reservations = await prisma.reservation.findMany({
      where,
      include: {
        venue: { select: { venue: true } },
        client: { select: { firstName: true, lastName: true, clientRole: { select: { roleName: true } } } },
        timeSlot: { select: { startTime: true, endTime: true } },
        package: { select: { packageName: true } },
        bookings: {
          include: {
            payments: {
              include: {
                status: { select: { status: true } },
              },
            },
          },
        },
        reservedParticulars: {
          include: {
            particular: { select: { particularName: true } },
          },
        },
      },
      orderBy: { eventDate: "asc" },
    });

    const formatted = reservations.map((r) => {
      const totalPaid = r.bookings.reduce(
        (sum, b) => sum + b.payments.reduce((s, p) => s + Number(p.amountPaid), 0),
        0
      );
      const isFullyPaid = r.bookings.some((b) =>
        b.payments.some((p) => p.status?.status === "Fully paid")
      );

      return {
        id: `RES-${r.reservationId}`,
        clientName: `${r.client.firstName} ${r.client.lastName}`,
        clientType: r.client.clientRole?.roleName || "N/A",
        venue: r.venue.venue,
        eventType: r.eventType,
        eventDate: r.eventDate.toISOString().split("T")[0],
        timeSlot: `${r.timeSlot.startTime} - ${r.timeSlot.endTime}`,
        status: r.reservationStatus,
        eventStatus: r.eventStatus,
        payment: isFullyPaid ? "Fully paid" : totalPaid > 0 ? "Partially paid" : "Unpaid",
        amountPaid: totalPaid,
        packageName: r.package?.packageName || "N/A",
        particulars: r.reservedParticulars.map((rp) => rp.particular.particularName),
      };
    });

    // Summary stats
    const totalReservations = formatted.length;
    const totalRevenue = formatted.reduce((sum, r) => sum + r.amountPaid, 0);
    const confirmedCount = formatted.filter((r) => r.status === "Confirmed").length;
    const pendingCount = formatted.filter((r) => r.status === "Pending").length;

    return NextResponse.json({
      summary: {
        totalReservations,
        totalRevenue,
        confirmedCount,
        pendingCount,
      },
      reservations: formatted,
    });
  } catch (error) {
    console.error("Failed to fetch reports:", error);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}