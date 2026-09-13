import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { noCacheJson } from "@/lib/api-cache-control";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "y"; // y = yearly, m = monthly, w = weekly
    const venue = searchParams.get("venue") || "all"; // sports, cultural, all
    const userId = searchParams.get("userId") || "";
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth()));

    // Build the date range based on period
    let startDate, endDate;
    const now = new Date();

    if (period === "y") {
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31, 23, 59, 59);
    } else if (period === "m") {
      startDate = new Date(year, month, 1);
      endDate = new Date(year, month + 1, 0, 23, 59, 59);
    } else if (period === "w") {
      const dayOfWeek = now.getDay();
      startDate = new Date(now);
      startDate.setDate(now.getDate() - dayOfWeek);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    }

    // Build venue filter conditions
    let venueFilter = {};
    if (venue === "sports") {
      venueFilter = { venue: { contains: "Sports" } };
    } else if (venue === "cultural") {
      venueFilter = { venue: { contains: "Cultural" } };
    }
    // "all" means no venue filter

    // Build user filter
    let userFilter = {};
    if (userId) {
      userFilter = { clientId: parseInt(userId) };
    }

    // Fetch all transactions in the date range with their full relationship chain
    const transactions = await prisma.transaction.findMany({
      where: {
        paymentDate: { gte: startDate, lte: endDate },
        payment: {
          booking: {
            reservation: {
              venue: venueFilter,
              ...(userId ? { clientId: parseInt(userId) } : {}),
            },
          },
        },
      },
      include: {
        payment: {
          include: {
            booking: {
              include: {
                reservation: {
                  include: {
                    client: {
                      select: {
                        clientId: true,
                        firstName: true,
                        lastName: true,
                        clientRoleId: true,
                      },
                    },
                    venue: {
                      select: {
                        venueId: true,
                        venue: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { paymentDate: "asc" },
    });

    // Summarize the data based on period grouping
    const salesMap = new Map();

    for (const txn of transactions) {
      const amount = Number(txn.payment?.amountPaid || 0);
      const paymentDate = new Date(txn.paymentDate);
      let groupKey;

      if (period === "y") {
        // Group by month
        const monthIndex = paymentDate.getMonth();
        const monthNames = [
          "January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December",
        ];
        groupKey = monthNames[monthIndex];
      } else if (period === "m") {
        // Group by week (approx: week 1, 2, 3, 4)
        const dayOfMonth = paymentDate.getDate();
        const weekIndex = Math.ceil(dayOfMonth / 7);
        groupKey = `Week ${weekIndex}`;
      } else if (period === "w") {
        // Group by day of week
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        groupKey = days[paymentDate.getDay()];
      }

      if (!salesMap.has(groupKey)) {
        salesMap.set(groupKey, {
          label: groupKey,
          totalAmount: 0,
          transactionCount: 0,
          bookingCount: 0,
          clientNames: new Set(),
        });
      }

      const entry = salesMap.get(groupKey);
      entry.totalAmount += amount;
      entry.transactionCount += 1;
      if (txn.payment?.booking?.reservation?.client) {
        const client = txn.payment.booking.reservation.client;
        entry.clientNames.add(`${client.firstName} ${client.lastName}`);
      }
    }

    // Convert map to array and compute totals
    const salesData = Array.from(salesMap.values()).map((entry) => ({
      label: entry.label,
      totalAmount: entry.totalAmount,
      transactionCount: entry.transactionCount,
      uniqueClients: entry.clientNames.size,
    }));

    const grandTotal = salesData.reduce((sum, d) => sum + d.totalAmount, 0);
    const totalTransactions = salesData.reduce((sum, d) => sum + d.transactionCount, 0);

    // Fetch all users (clients) for the filter dropdown
    const users = await prisma.client.findMany({
      select: {
        clientId: true,
        firstName: true,
        lastName: true,
      },
      orderBy: { firstName: "asc" },
    });

    return noCacheJson({
      period,
      venue,
      year,
      month: month + 1,
      salesData,
      grandTotal,
      totalTransactions,
      users,
    });
  } catch (error) {
    console.error("Admin reports GET error:", error);
    return noCacheJson(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}