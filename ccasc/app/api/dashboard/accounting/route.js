import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    // Total reservations
    const totalReservations = await prisma.reservation.count();

    // Reservations with payment info - get client separately to avoid orphaned FK errors
    const reservations = await prisma.reservation.findMany({
      include: {
        venue: { select: { venue: true } },
        timeSlot: { select: { startTime: true, endTime: true } },
        bookings: {
          include: {
            status: { select: { status: true } },
            payments: { select: { amountPaid: true, status: { select: { status: true } } } },
          },
        },
      },
      orderBy: { submittedAt: "desc" },
    });

    // Fetch valid client info separately
    const distinctClientIds = [...new Set(reservations.map((r) => r.clientId))];
    const allClients = await prisma.client.findMany({
      where: { clientId: { in: distinctClientIds } },
      select: { clientId: true, firstName: true, lastName: true, clientRole: { select: { roleName: true } } },
    });
    const clientMap = Object.fromEntries(allClients.map((c) => [c.clientId, c]));

    // Calculate summary stats
    let partiallyPaid = 0;
    let fullyPaid = 0;
    let totalClientRevenue = 0;
    let pendingCount = 0;

    const formattedReservations = reservations
      .filter((r) => clientMap[r.clientId] !== undefined)
      .map((r) => {
        const client = clientMap[r.clientId];
        const totalPaid = r.bookings.reduce(
          (sum, b) => sum + b.payments.reduce((s, p) => s + Number(p.amountPaid), 0),
          0
        );
        const isFullyPaid = r.bookings.some((b) =>
          b.payments.some((p) => p.status?.status === "Fully paid")
        );

        if (totalPaid > 0 && !isFullyPaid) partiallyPaid++;
        if (isFullyPaid) fullyPaid++;
        if (r.reservationStatus === "Pending") pendingCount++;
        totalClientRevenue += totalPaid;

        return {
          id: `RES-${r.reservationId}`,
          clientName: `${client.firstName} ${client.lastName}`,
          clientType: client.clientRole?.roleName || "N/A",
          venue: r.venue.venue,
          eventType: r.eventType,
          eventDate: r.eventDate.toISOString().split("T")[0],
          timeSlot: `${r.timeSlot.startTime} - ${r.timeSlot.endTime}`,
          status: r.reservationStatus,
          payment: isFullyPaid ? "Fully paid" : totalPaid > 0 ? "Partially paid" : "Unpaid",
          amountTotal: totalPaid,
          amountPaid: totalPaid,
        };
      });

    // Monthly revenue (last 12 months)
    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const transactions = await prisma.transaction.findMany({
      where: {
        paymentDate: { gte: twelveMonthsAgo },
      },
      include: {
        payment: { select: { amountPaid: true } },
      },
    });

    // Group by month
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
        clientRevenue: 0,
        pgoCharges: 0,
      };
    }

    for (const t of transactions) {
      const d = new Date(t.paymentDate);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (monthlyMap[key]) {
        monthlyMap[key].clientRevenue += Number(t.payment.amountPaid);
      }
    }

    const monthlyRevenue = Object.values(monthlyMap).reverse();

    return NextResponse.json({
      summary: {
        total: totalReservations,
        partiallyPaid,
        fullyPaid,
      },
      pendingCount,
      totalClientRevenue,
      reservations: formattedReservations.filter(
        (r) => r.payment === "Partially paid" || r.status === "Pending"
      ),
      monthlyRevenue,
    });
  } catch (error) {
    console.error("Failed to fetch accounting dashboard data:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}