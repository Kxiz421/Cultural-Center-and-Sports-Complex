import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { noCacheJson } from "@/lib/api-cache-control";


import { requireApiAuth } from "@/lib/api-auth";
export async function POST(request) {
  const guard = await requireApiAuth(["admin"]);
  if (guard.response) return guard.response;

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
  const guard = await requireApiAuth(["admin"]);
  if (guard.response) return guard.response;

  try {
    const rates = await prisma.facilityRate.findMany({
      orderBy: { rateId: "asc" }
    });

    return noCacheJson(rates.map(r => ({
      rateId: r.rateId,
      dayRate: Number(r.dayRate),
      nightRate: Number(r.nightRate),
    })));
  } catch (error) {
    console.error("Failed to fetch rates:", error);
    return noCacheJson(
      { error: "Failed to fetch rates" },
      { status: 500 }
    );
  }
}