import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { noCacheJson } from "@/lib/api-cache-control";
import { walkInDisplayName } from "@/lib/walk-in";
import { summarizeRevenue } from "@/lib/revenue-summary";

import { requireApiAuth } from "@/lib/api-auth";
export async function GET(request) {
  const guard = await requireApiAuth(["program coordinator cultural","program coordinator sports","admin"]);
  if (guard.response) return guard.response;

  try {
    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get("venueId");
    const venueFilter = venueId === "2" ? [2] : [1];
    const venueLabel = venueId === "2" ? "Sports Complex" : "Cultural Center";

    const now = new Date();

    // A trailing year of receipts feeds both the monthly chart below and every
    // revenue window (daily / weekly / monthly / yearly): a trailing year
    // always contains the current calendar year-to-date. See
    // lib/revenue-summary.js.
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
    const revenue = summarizeRevenue(transactions, now);

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
        clientName: r.client
          ? `${r.client.firstName} ${r.client.lastName}`
          : walkInDisplayName(r.notes),
        clientType: r.client?.clientRole?.roleName || "N/A",
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
        monthlyMap[key].revenue += Number(t.payment?.amountPaid ?? 0);
      }
    }

    const monthlyRevenue = Object.values(monthlyMap).reverse();

    return noCacheJson({
      revenue,
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
    return noCacheJson(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}