import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");

  try {
    const whereClause = {};
    if (search) {
      whereClause.itemName = { contains: search };
    }

    const items = await prisma.inventory.findMany({
      where: whereClause,
      include: {
        status: { select: { statusName: true, statusId: true } },
        venue: { select: { venue: true, venueId: true } },
      },
      orderBy: { itemId: "asc" },
    });

    const formatted = items.map((item) => ({
      id: item.itemId,
      itemId: item.itemId,
      itemName: item.itemName,
      unitCost: Number(item.unitCost),
      quantityAvailable: item.quantityAvailable,
      venue: item.venue.venue,
      venueId: item.venue.venueId,
      status: item.status.statusName,
      statusId: item.status.statusId,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Failed to fetch inventory:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory" },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const { itemId, itemName, unitCost, quantityAvailable, statusId, performedBy, performedByName } = await request.json();

    if (!itemId) {
      return NextResponse.json(
        { error: "Item ID is required" },
        { status: 400 }
      );
    }

    const updateData = {};
    if (itemName !== undefined) updateData.itemName = itemName;
    if (unitCost !== undefined) updateData.unitCost = parseFloat(unitCost);
    if (quantityAvailable !== undefined) updateData.quantityAvailable = parseInt(quantityAvailable, 10);
    if (statusId !== undefined) updateData.statusId = parseInt(statusId, 10);

    const updated = await prisma.inventory.update({
      where: { itemId: parseInt(itemId, 10) },
      data: updateData,
      include: {
        status: { select: { statusName: true, statusId: true } },
        venue: { select: { venue: true, venueId: true } },
      },
    });

    // Build details of what changed
    const changes = [];
    if (itemName !== undefined) changes.push(`name: "${itemName}"`);
    if (unitCost !== undefined) changes.push(`cost: ₱${parseFloat(unitCost).toLocaleString()}`);
    if (quantityAvailable !== undefined) changes.push(`qty: ${parseInt(quantityAvailable, 10)}`);
    if (statusId !== undefined) {
      const statusName = updated.status?.statusName || statusId;
      changes.push(`status: ${statusName}`);
    }

    // Log the update
    await prisma.auditLog.create({
      data: {
        action: "UPDATED",
        targetUserId: `INV-${updated.itemId}`,
        targetName: updated.itemName,
        performedById: performedBy || "system",
        performedByName: performedByName || "System",
        details: `Inventory item updated: ${changes.join(", ")}`,
      },
    });

    return NextResponse.json({
      id: updated.itemId,
      itemId: updated.itemId,
      itemName: updated.itemName,
      unitCost: Number(updated.unitCost),
      quantityAvailable: updated.quantityAvailable,
      venue: updated.venue.venue,
      venueId: updated.venue.venueId,
      status: updated.status.statusName,
      statusId: updated.status.statusId,
    });
  } catch (error) {
    console.error("Failed to update inventory item:", error);
    return NextResponse.json(
      { error: "Failed to update inventory item" },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const { itemId, statusId } = await request.json();

    if (!itemId || !statusId) {
      return NextResponse.json(
        { error: "Item ID and statusId are required" },
        { status: 400 }
      );
    }

    const updated = await prisma.inventory.update({
      where: { itemId: parseInt(itemId, 10) },
      data: { statusId: parseInt(statusId, 10) },
      include: {
        status: { select: { statusName: true, statusId: true } },
        venue: { select: { venue: true, venueId: true } },
      },
    });

    return NextResponse.json({
      id: updated.itemId,
      itemId: updated.itemId,
      itemName: updated.itemName,
      unitCost: Number(updated.unitCost),
      quantityAvailable: updated.quantityAvailable,
      venue: updated.venue.venue,
      venueId: updated.venue.venueId,
      status: updated.status.statusName,
      statusId: updated.status.statusId,
    });
  } catch (error) {
    console.error("Failed to update inventory status:", error);
    return NextResponse.json(
      { error: "Failed to update inventory status" },
      { status: 500 }
    );
  }
}