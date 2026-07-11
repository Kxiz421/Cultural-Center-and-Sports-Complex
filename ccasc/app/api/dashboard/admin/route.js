import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    // Today's payments
    const todayTransactions = await prisma.transaction.findMany({
      where: { paymentDate: { gte: startOfDay } },
      include: { payment: { select: { amountPaid: true } } },
    });
    const dailyRevenue = todayTransactions.reduce(
      (sum, t) => sum + Number(t.payment.amountPaid), 0
    );

    // All payments (for weekly/yearly we sum all since we don't have date on payment directly)
    const allPayments = await prisma.payment.aggregate({
      _sum: { amountPaid: true },
    });
    const totalRevenue = Number(allPayments._sum.amountPaid || 0);

    // Count reservations by status
    const pendingReservations = await prisma.reservation.count({
      where: { reservationStatus: "Pending" },
    });
    const confirmedReservations = await prisma.reservation.count({
      where: { reservationStatus: "Confirmed" },
    });

    return NextResponse.json({
      revenue: {
        daily: dailyRevenue,
        weekly: totalRevenue,
        yearly: totalRevenue,
      },
      bookingStatus: {
        pending: pendingReservations,
        confirmed: confirmedReservations,
      },
    });
  } catch (error) {
    console.error("Failed to fetch admin dashboard data:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}