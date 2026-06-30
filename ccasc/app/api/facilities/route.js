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
      facilityId: f.facilityId,
      name: f.facilityName,
      description: f.description,
      site: f.venue.venue,
      venueId: f.venue.venueId,
      rateId: f.rateId,
      statusId: f.statusId,
      rateHourly: Number(f.rate.dayRate),
      rateDaily: Number(f.rate.nightRate),
      capacity: f.capacity || 0,
      availability: f.status.statusName,
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
        capacity: parseInt(data.capacity) || 0,
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
      facilityId: facility.facilityId,
      name: facility.facilityName,
      description: facility.description,
      site: facility.venue.venue,
      venueId: facility.venue.venueId,
      rateId: facility.rateId,
      statusId: facility.statusId,
      rateHourly: Number(facility.rate.dayRate),
      rateDaily: Number(facility.rate.nightRate),
      capacity: facility.capacity || 0,
      availability: facility.status.statusName,
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

export async function PUT(request) {
  try {
    const data = await request.json();
    const { facilityId, name, description, capacity, rateId, statusId, venueId, rateDay, rateNight, images } = data;

    if (!facilityId) {
      return NextResponse.json(
        { error: "Facility ID is required" },
        { status: 400 }
      );
    }

    // Update rate if provided
    if (rateDay !== undefined || rateNight !== undefined) {
      const facility = await prisma.facility.findUnique({
        where: { facilityId: parseInt(facilityId) },
        select: { rateId: true }
      });
      if (facility) {
        await prisma.facilityRate.update({
          where: { rateId: facility.rateId },
          data: {
            ...(rateDay !== undefined && { dayRate: parseFloat(rateDay) }),
            ...(rateNight !== undefined && { nightRate: parseFloat(rateNight) }),
          }
        });
      }
    }

    // Update facility fields (only if there are changes)
    const updateData = {};
    if (name !== undefined) updateData.facilityName = name;
    if (description !== undefined) updateData.description = description;
    // capacity is required in schema - always include it
    if (capacity !== undefined) {
      updateData.capacity = parseInt(capacity) || 0;
    }
    if (rateId !== undefined) updateData.rateId = parseInt(rateId);
    if (statusId !== undefined) updateData.statusId = parseInt(statusId);
    if (venueId !== undefined) updateData.venueId = parseInt(venueId);

    if (Object.keys(updateData).length > 0) {
      await prisma.facility.update({
        where: { facilityId: parseInt(facilityId) },
        data: updateData,
      });
    }

    // Handle images if provided
    if (images && Array.isArray(images)) {
      // Delete existing images
      await prisma.facilityImage.deleteMany({
        where: { facilityId: parseInt(facilityId) }
      });
      // Create new images
      for (const img of images) {
        await prisma.facilityImage.create({
          data: {
            image: img,
            facilityId: parseInt(facilityId)
          }
        });
      }
    }

    // Fetch updated facility with images
    const updated = await prisma.facility.findUnique({
      where: { facilityId: parseInt(facilityId) },
      include: {
        venue: true,
        rate: true,
        status: true,
        images: true
      }
    });

    return NextResponse.json({
      id: `FAC-${updated.facilityId}`,
      facilityId: updated.facilityId,
      name: updated.facilityName,
      description: updated.description,
      capacity: updated.capacity || 0,
      site: updated.venue.venue,
      venueId: updated.venue.venueId,
      rateId: updated.rateId,
      statusId: updated.statusId,
      rateHourly: Number(updated.rate.dayRate),
      rateDaily: Number(updated.rate.nightRate),
      availability: updated.status.statusName,
      images: updated.images.map(i => i.image)
    });
  } catch (error) {
    console.error("Failed to update facility:", error);
    return NextResponse.json(
      { error: "Failed to update facility" },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const data = await request.json();
    const { facilityId, statusId } = data;

    if (!facilityId || !statusId) {
      return NextResponse.json(
        { error: "Facility ID and statusId are required" },
        { status: 400 }
      );
    }

    const facility = await prisma.facility.update({
      where: { facilityId: parseInt(facilityId) },
      data: { statusId: parseInt(statusId) },
      include: {
        venue: true,
        rate: true,
        status: true,
        images: true
      }
    });

    return NextResponse.json({
      id: `FAC-${facility.facilityId}`,
      facilityId: facility.facilityId,
      name: facility.facilityName,
      description: facility.description,
      capacity: facility.capacity || 0,
      site: facility.venue.venue,
      venueId: facility.venue.venueId,
      rateId: facility.rateId,
      statusId: facility.statusId,
      rateHourly: Number(facility.rate.dayRate),
      rateDaily: Number(facility.rate.nightRate),
      availability: facility.status.statusName,
      images: facility.images.map(i => i.image)
    });
  } catch (error) {
    console.error("Failed to update facility status:", error);
    return NextResponse.json(
      { error: "Failed to update facility status" },
      { status: 500 }
    );
  }
}
