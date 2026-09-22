import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { noCacheJson } from "@/lib/api-cache-control";


import { requireApiAuth } from "@/lib/api-auth";
export async function GET() {
  const guard = await requireApiAuth(["admin"]);
  if (guard.response) return guard.response;

  try {
    const blocks = await prisma.calendarBlock.findMany({
      include: {
        venue: {
          select: { venue: true },
        },
      },
      orderBy: { blockDate: "asc" },
    });

    // Helper to format a Date object as YYYY-MM-DD in local timezone
    // (avoiding toISOString() which shifts dates by the UTC offset)
    const formatLocalDate = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    const formatted = blocks.map((b) => ({
      id: `BLK-${b.blockId}`,
      title: b.title,
      date: formatLocalDate(b.blockDate),
      blockType: b.blockType,
      venueId: b.venueId,
      venue: b.venue.venue,
      notes: b.notes,
    }));

    return noCacheJson(formatted);
  } catch (error) {
    console.error("Failed to fetch calendar blocks:", error);
    return noCacheJson(
      { error: "Failed to fetch calendar blocks" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const guard = await requireApiAuth(["admin"]);
  if (guard.response) return guard.response;

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
        date: formatLocalDate(b.blockDate),
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
  const guard = await requireApiAuth(["admin"]);
  if (guard.response) return guard.response;

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