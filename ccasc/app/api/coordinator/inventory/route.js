import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const CULTURAL_VENUE_IDS = [1];

export async function GET() {
  try {
    const items = await prisma.inventory.findMany({
      where: {
        venueId: { in: CULTURAL_VENUE_IDS },
      },
      include: {
        venue: { select: { venue: true } },
        status: { select: { statusName: true } },
      },
      orderBy: { itemName: "asc" },
    });

    const formatted = items.map((item) => ({
      id: item.itemId,
      name: item.itemName,
      unitCost: Number(item.unitCost).toFixed(2),
      quantity: item.quantityAvailable,
      venue: item.venue.venue,
      status: item.status.statusName,
      category: item.status.statusName,
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

export async function PATCH(request) {
  try {
    const { itemId, quantity } = await request.json();

    if (!itemId || quantity === undefined) {
      return NextResponse.json(
        { error: "itemId and quantity are required" },
        { status: 400 }
      );
    }

    const id = parseInt(itemId, 10);
    const qty = parseInt(quantity, 10);

    if (isNaN(id) || isNaN(qty) || qty < 0) {
      return NextResponse.json(
        { error: "Invalid itemId or quantity" },
        { status: 400 }
      );
    }

    await prisma.inventory.update({
      where: { itemId: id },
      data: { quantityAvailable: qty },
    });

    return NextResponse.json({ success: true, message: "Quantity updated" });
  } catch (error) {
    console.error("Failed to update inventory:", error);
    return NextResponse.json(
      { error: "Failed to update inventory" },
      { status: 500 }
    );
  }
}