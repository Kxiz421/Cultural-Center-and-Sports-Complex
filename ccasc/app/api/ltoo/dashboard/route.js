import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { noCacheJson } from "@/lib/api-cache-control";

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

    return noCacheJson({
      totalPayments,
      pendingNotifications,
      totalDocuments,
      monthlyRevenue,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return noCacheJson(
      { error: "Failed to load dashboard data" },
      { status: 500 }
    );
  }
}