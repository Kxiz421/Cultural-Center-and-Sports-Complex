import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const blocks = await prisma.calendarBlock.findMany({
      include: {
        venue: {
          select: { venue: true },
        },
      },
      orderBy: { blockDate: "asc" },
    });

    const formatted = blocks.map((b) => ({
      id: `BLK-${b.blockId}`,
      title: b.title,
      date: b.blockDate.toISOString().split("T")[0],
      blockType: b.blockType,
      venueId: b.venueId,
      venue: b.venue.venue,
      notes: b.notes,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Failed to fetch calendar blocks:", error);
    return NextResponse.json(
      { error: "Failed to fetch calendar blocks" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { title, blockDate, blockType, venueId, notes } = await request.json();

    if (!title || !blockDate || !blockType || !venueId) {
      return NextResponse.json(
        { error: "title, blockDate, blockType, and venueId are required" },
        { status: 400 }
      );
    }

    if (!["Holiday", "Maintenance"].includes(blockType)) {
      return NextResponse.json(
        { error: "blockType must be 'Holiday' or 'Maintenance'" },
        { status: 400 }
      );
    }

    // Validate that the date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const blockDateObj = new Date(blockDate);
    blockDateObj.setHours(0, 0, 0, 0);

    if (blockDateObj < today) {
      return NextResponse.json(
        { error: "Cannot set a block on a date that has already passed" },
        { status: 400 }
      );
    }

    const parsedVenueId = parseInt(venueId, 10);
    const venueIds = parsedVenueId === 3 ? [1, 2] : [parsedVenueId];

    const created = await Promise.all(
      venueIds.map((vid) =>
        prisma.calendarBlock.create({
          data: {
            title,
            blockDate: new Date(blockDate),
            blockType,
            venueId: vid,
            notes: notes || null,
          },
          include: {
            venue: {
              select: { venue: true },
            },
          },
        })
      )
    );

    return NextResponse.json(
      created.map((b) => ({
        id: `BLK-${b.blockId}`,
        title: b.title,
        date: b.blockDate.toISOString().split("T")[0],
        blockType: b.blockType,
        venueId: b.venueId,
        venue: b.venue.venue,
        notes: b.notes,
      }))
    );
  } catch (error) {
    console.error("Failed to create calendar block:", error);
    return NextResponse.json(
      { error: "Failed to create calendar block" },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const { blockId } = await request.json();

    if (!blockId) {
      return NextResponse.json(
        { error: "blockId is required" },
        { status: 400 }
      );
    }

    const prefix = blockId.split("-")[0];
    const id = parseInt(blockId.split("-")[1], 10);

    if (prefix !== "BLK" || isNaN(id)) {
      return NextResponse.json({ error: "Invalid blockId" }, { status: 400 });
    }

    await prisma.calendarBlock.delete({
      where: { blockId: id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete calendar block:", error);
    return NextResponse.json(
      { error: "Failed to delete calendar block" },
      { status: 500 }
    );
  }
}