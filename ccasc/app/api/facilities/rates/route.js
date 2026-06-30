import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request) {
  try {
    const data = await request.json();
    const { dayRate, nightRate } = data;

    const rate = await prisma.facilityRate.create({
      data: {
        dayRate: parseFloat(dayRate) || 0,
        nightRate: parseFloat(nightRate) || 0,
      }
    });

    return NextResponse.json({
      rateId: rate.rateId,
      dayRate: Number(rate.dayRate),
      nightRate: Number(rate.nightRate),
    });
  } catch (error) {
    console.error("Failed to create rate:", error);
    return NextResponse.json(
      { error: "Failed to create rate" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const rates = await prisma.facilityRate.findMany({
      orderBy: { rateId: "asc" }
    });

    return NextResponse.json(rates.map(r => ({
      rateId: r.rateId,
      dayRate: Number(r.dayRate),
      nightRate: Number(r.nightRate),
    })));
  } catch (error) {
    console.error("Failed to fetch rates:", error);
    return NextResponse.json(
      { error: "Failed to fetch rates" },
      { status: 500 }
    );
  }
}