import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { noCacheJson } from "@/lib/api-cache-control";
import { revenueQueryStart, summarizeRevenue } from "@/lib/revenue-summary";

import { requireApiAuth } from "@/lib/api-auth";
export async function GET() {
  const guard = await requireApiAuth(["admin"]);
  if (guard.response) return guard.response;

  try {
    const now = new Date();

    // Every receipt feeds the daily / weekly / monthly / yearly cards, so a
    // single query bounded to the start of the year covers all four windows
    // (see lib/revenue-summary.js).
    const transactions = await prisma.transaction.findMany({
      where: { paymentDate: { gte: revenueQueryStart(now) } },
      include: { payment: { select: { amountPaid: true } } },
    });
    const revenue = summarizeRevenue(transactions, now);

    // Count reservations by status
    const pendingReservations = await prisma.reservation.count({
      where: { reservationStatus: "Pending" },
    });
    const confirmedReservations = await prisma.reservation.count({
      where: { reservationStatus: "Confirmed" },
    });

    return noCacheJson({
      revenue,
      bookingStatus: {
        pending: pendingReservations,
        confirmed: confirmedReservations,
      },
    });
  } catch (error) {
    console.error("Failed to fetch admin dashboard data:", error);
    return noCacheJson(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
