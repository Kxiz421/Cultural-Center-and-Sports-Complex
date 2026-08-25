import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";


export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth()));
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));

    // Date ranges
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);

    // Get all payments with transactions in the selected month
    const monthlyPayments = await prisma.payment.findMany({
      where: {
        transactions: {
          some: {
            paymentDate: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
        },
      },
      include: {
        booking: {
          include: {
            reservation: {
              include: {
                client: {
                  select: {
                    firstName: true,
                    lastName: true,
                    clientRole: { select: { clientRoleId: true } },
                  },
                },
              },
            },
          },
        },
        transactions: {
          where: {
            paymentDate: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
        },
      },
    });

    // Separate client and provincial payments
    const clientPayments = [];
    const provincialPayments = [];

    for (const p of monthlyPayments) {
      const isProvincial =
        p.booking?.reservation?.client?.clientRole?.clientRoleId === "PROV";
      const clientName = p.booking?.reservation?.client
        ? `${p.booking.reservation.client.firstName} ${p.booking.reservation.client.lastName}`
        : "Unknown";
      const paymentInfo = {
        clientName,
        activityName: p.booking?.reservation?.eventType || "",
        amount: Number(p.amountPaid),
        date: p.transactions?.[0]?.paymentDate
          ? p.transactions[0].paymentDate.toISOString().split("T")[0]
          : "",
      };

      if (isProvincial) {
        provincialPayments.push(paymentInfo);
      } else {
        clientPayments.push(paymentInfo);
      }
    }

    const totalClientRevenue = clientPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalProvincialRevenue = provincialPayments.reduce((sum, p) => sum + p.amount, 0);

    // Yearly totals
    const yearlyPayments = await prisma.payment.findMany({
      where: {
        transactions: {
          some: {
            paymentDate: {
              gte: startOfYear,
              lte: endOfYear,
            },
          },
        },
      },
      include: {
        booking: {
          include: {
            reservation: {
              include: {
                client: {
                  select: {
                    clientRole: { select: { clientRoleId: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    const yearlyClientRevenue = yearlyPayments
      .filter(
        (p) =>
          p.booking?.reservation?.client?.clientRole?.clientRoleId !== "PROV"
      )
      .reduce((sum, p) => sum + Number(p.amountPaid), 0);

    const yearlyProvincialRevenue = yearlyPayments
      .filter(
        (p) =>
          p.booking?.reservation?.client?.clientRole?.clientRoleId === "PROV"
      )
      .reduce((sum, p) => sum + Number(p.amountPaid), 0);

    return NextResponse.json({
      clientPayments,
      provincialPayments,
      totalClientRevenue,
      totalProvincialRevenue,
      yearlyClientRevenue,
      yearlyProvincialRevenue,
      month: month + 1,
      year,
    });
  } catch (error) {
    console.error("Reports GET error:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}