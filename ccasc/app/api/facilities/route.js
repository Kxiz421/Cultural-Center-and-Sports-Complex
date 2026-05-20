import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const facilities = await prisma.facility.findMany({
      include: {
        venue: true,
        rate: true,
        status: true,
        images: true
      },
      orderBy: {
        facilityId: "asc"
      }
    });

    return NextResponse.json(facilities.map(f => ({
      id: `FAC-${f.facilityId}`,
      name: f.facilityName,
      description: f.description,
      site: f.venue.venue,
      venueId: f.venue.venueId,
      rateHourly: Number(f.rate.dayRate),
      rateDaily: Number(f.rate.nightRate),
      capacity: f.capacity || 0,
      availability: f.status.statusName,
      revenueYtd: f.revenueYtd || 0,
      images: f.images.map(i => i.image)
    })));
  } catch (error) {
    console.error("Failed to fetch facilities:", error);
    return NextResponse.json(
      { error: "Failed to fetch facilities" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    
    if (!data.name || !data.venueId || !data.rateId || !data.statusId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const facility = await prisma.facility.create({
      data: {
        facilityName: data.name,
        description: data.description,
        rateId: parseInt(data.rateId),
        statusId: parseInt(data.statusId),
        venueId: parseInt(data.venueId)
      },
      include: {
        venue: true,
        rate: true,
        status: true
      }
    });

    return NextResponse.json({
      id: `FAC-${facility.facilityId}`,
      name: facility.facilityName,
      description: facility.description,
      site: facility.venue.venue,
      venueId: facility.venue.venueId,
      rateHourly: Number(facility.rate.dayRate),
      rateDaily: Number(facility.rate.nightRate),
      capacity: 0,
      availability: facility.status.statusName,
      revenueYtd: 0,
      images: []
    });
  } catch (error) {
    console.error("Failed to create facility:", error);
    return NextResponse.json(
      { error: "Failed to create facility" },
      { status: 500 }
    );
  }
}