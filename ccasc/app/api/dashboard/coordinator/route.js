import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get("venueId");
    const venueFilter = venueId === "2" ? [2] : [1];
    const venueLabel = venueId === "2" ? "Sports Complex" : "Cultural Center";

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    // Today's payments for selected venue
    const todayTransactions = await prisma.transaction.findMany({
      where: {
        paymentDate: { gte: startOfDay },
        payment: {
          booking: {
            reservation: { venueId: { in: venueFilter } },
          },
        },
      },
      include: { payment: { select: { amountPaid: true } } },
    });
    const dailyRevenue = todayTransactions.reduce(
      (sum, t) => sum + Number(t.payment.amountPaid), 0
    );

    // All payments for Cultural Center
    const allPayments = await prisma.payment.findMany({
      where: {
        booking: {
          reservation: { venueId: { in: venueFilter } },
        },
      },
      select: { amountPaid: true },
    });
    const totalRevenue = allPayments.reduce(
      (sum, p) => sum + Number(p.amountPaid), 0
    );

    // Count reservations by status for Cultural Center
    const pendingReservations = await prisma.reservation.count({
      where: {
        reservationStatus: "Pending",
        venueId: { in: venueFilter },
      },
    });
    const confirmedReservations = await prisma.reservation.count({
      where: {
        reservationStatus: "Confirmed",
        venueId: { in: venueFilter },
      },
    });
    const ongoingReservations = await prisma.reservation.count({
      where: {
        eventStatus: "Ongoing",
        venueId: { in: venueFilter },
      },
    });
    const completedReservations = await prisma.reservation.count({
      where: {
        eventStatus: "Completed",
        venueId: { in: venueFilter },
      },
    });

    // Recent reservations for Cultural Center
    const recentReservations = await prisma.reservation.findMany({
      where: {
        venueId: { in: venueFilter },
      },
      include: {
        venue: { select: { venue: true } },
        client: { select: { firstName: true, lastName: true, clientRole: { select: { roleName: true } } } },
        timeSlot: { select: { startTime: true, endTime: true } },
        bookings: {
          include: {
            status: { select: { status: true } },
            payments: { select: { amountPaid: true, status: { select: { status: true } } } },
          },
        },
      },
      orderBy: { submittedAt: "desc" },
      take: 10,
    });

    const formattedReservations = recentReservations.map((r) => {
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
      };
    });

    // Monthly revenue for Cultural Center (last 12 months)
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const transactions = await prisma.transaction.findMany({
      where: {
        paymentDate: { gte: twelveMonthsAgo },
        payment: {
          booking: {
            reservation: { venueId: { in: venueFilter } },
          },
        },
      },
      include: {
        payment: { select: { amountPaid: true } },
      },
    });

    const monthlyMap = {};
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];

    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      monthlyMap[key] = {
        month: monthNames[d.getMonth()],
        revenue: 0,
      };
    }

    for (const t of transactions) {
      const d = new Date(t.paymentDate);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (monthlyMap[key]) {
        monthlyMap[key].revenue += Number(t.payment.amountPaid);
      }
    }

    const monthlyRevenue = Object.values(monthlyMap).reverse();

    return NextResponse.json({
      revenue: {
        daily: dailyRevenue,
        weekly: totalRevenue,
        yearly: totalRevenue,
      },
      bookingStatus: {
        pending: pendingReservations,
        confirmed: confirmedReservations,
        ongoing: ongoingReservations,
        completed: completedReservations,
      },
      recentReservations: formattedReservations,
      monthlyRevenue,
    });
  } catch (error) {
    console.error("Failed to fetch coordinator dashboard data:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}