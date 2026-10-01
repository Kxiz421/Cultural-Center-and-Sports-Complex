import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { noCacheJson } from "@/lib/api-cache-control";
import { revenueQueryStart, summarizeRevenue } from "@/lib/revenue-summary";

import { requireApiAuth } from "@/lib/api-auth";
export const dynamic = "force-dynamic";


export async function GET() {
  const guard = await requireApiAuth(["local treasury operations officer","admin"]);
  if (guard.response) return guard.response;

  try {
    const now = new Date();

    const totalPayments = await prisma.payment.count();

    const pendingNotifications = await prisma.notification.count({
      where: { isRead: false },
    });

    const totalDocuments = await prisma.document.count();

    // Daily / weekly / monthly / yearly revenue for the cards, from the same
    // receipt rows the payments module lists (see lib/revenue-summary.js).
    const transactions = await prisma.transaction.findMany({
      where: { paymentDate: { gte: revenueQueryStart(now) } },
      include: { payment: { select: { amountPaid: true } } },
    });
    const revenue = summarizeRevenue(transactions, now);

    return noCacheJson({
      totalPayments,
      pendingNotifications,
      totalDocuments,
      revenue,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return noCacheJson(
      { error: "Failed to load dashboard data" },
      { status: 500 }
    );
  }
}