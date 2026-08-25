import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";


export async function GET() {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const totalPayments = await prisma.payment.count();

    const pendingNotifications = await prisma.notification.count({
      where: { isRead: false },
    });

    const totalDocuments = await prisma.document.count();

    const monthlyPayments = await prisma.payment.findMany({
      where: {
        transactions: {
          some: {
            paymentDate: { gte: startOfMonth },
          },
        },
      },
      select: { amountPaid: true },
    });

    const monthlyRevenue = monthlyPayments.reduce(
      (sum, p) => sum + Number(p.amountPaid),
      0
    );

    return NextResponse.json({
      totalPayments,
      pendingNotifications,
      totalDocuments,
      monthlyRevenue,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard data" },
      { status: 500 }
    );
  }
}