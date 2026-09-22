  import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { noCacheJson } from "@/lib/api-cache-control";

import { requireApiAuth, actingAs } from "@/lib/api-auth";
const STATUS_NAMES = {
  1: "Available",
  2: "Unavailable",
  3: "Under Maintenance",
  4: "Archived",
};

function getStatusName(id) {
  return STATUS_NAMES[id] || `Status ${id}`;
}

export async function GET(request) {
  const guard = await requireApiAuth();
  if (guard.response) return guard.response;

  try {
    const { searchParams } = new URL(request.url);
    const transactionsFor = searchParams.get("transactionsFor");

    // If fetching transactions for a specific particular
    if (transactionsFor) {
      const transactions = await prisma.particularTransaction.findMany({
        where: { particularId: parseInt(transactionsFor, 10) },
        orderBy: { createdAt: "desc" },
      });
      return noCacheJson(transactions);
    }

    const items = await prisma.particular.findMany({
      include: {
        inventory: {
          select: { itemId: true, itemName: true, quantityAvailable: true, unitCost: true },
        },
      },
      orderBy: { particularId: "asc" },
    });

    const formatted = items.map((item) => ({
      id: item.particularId,
      particularId: item.particularId,
      particularName: item.particularName,
      description: item.description || "",
      category: item.category || "",
      totalQuantity: item.inventory?.quantityAvailable ?? 0,
      unitCost: item.inventory?.unitCost ? Number(item.inventory.unitCost) : 0,
      inventoryName: item.inventory?.itemName || "",
      statusId: item.statusId,
      statusName: getStatusName(item.statusId),
      itemId: item.itemId,
    }));

    return noCacheJson(formatted);
  } catch (error) {
    console.error("Failed to fetch particulars:", error);
    return noCacheJson(
      { error: "Failed to fetch particulars" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const guard = await requireApiAuth();
  if (guard.response) return guard.response;
  const acting = actingAs(guard.user);

  try {
    const { particularName, description, category, quantityAvailable } = await request.json();

    if (!particularName || !particularName.trim()) {
      return NextResponse.json(
        { error: "Particular name is required" },
        { status: 400 }
      );
    }

    const created = await prisma.particular.create({
      data: {
        particularName: particularName.trim(),
        description: description?.trim() || "",
        category: category?.trim() || "",
        statusId: 1, // Default to Available
      },
    });

    // If quantity provided, create or update the linked inventory item
    const qty = parseInt(quantityAvailable, 10);
    if (qty > 0) {
      // Check if there's already an inventory item with matching name
      let inventory = await prisma.inventory.findFirst({
        where: { itemName: particularName.trim() },
      });

      if (inventory) {
        // Link to existing inventory
        await prisma.particular.update({
          where: { particularId: created.particularId },
          data: { itemId: inventory.itemId },
        });
        // Update quantity
        await prisma.inventory.update({
          where: { itemId: inventory.itemId },
          data: { quantityAvailable: qty },
        });
      } else {
        // Create new inventory item
        inventory = await prisma.inventory.create({
          data: {
            itemName: particularName.trim(),
            unitCost: 0,
            quantityAvailable: qty,
            venueId: 1,
            statusId: 1,
          },
        });
        // Link to the new inventory
        await prisma.particular.update({
          where: { particularId: created.particularId },
          data: { itemId: inventory.itemId },
        });
      }
    }

    // Log the creation
    await prisma.auditLog.create({
      data: {
        action: "CREATED",
        targetUserId: `PART-${created.particularId}`,
        targetName: created.particularName,
        performedById: acting.performedBy,
        performedByName: acting.performedByName,
        details: `Particular created: name="${created.particularName}", category="${created.category}", quantity=${qty || 0}`,
      },
    });

    return NextResponse.json({
      id: created.particularId,
      particularId: created.particularId,
      particularName: created.particularName,
      description: created.description || "",
      category: created.category || "",
      totalQuantity: qty || 0,
      inventoryName: particularName.trim(),
      statusId: created.statusId,
      statusName: getStatusName(created.statusId),
    });
  } catch (error) {
    console.error("Failed to create particular:", error);
    return NextResponse.json(
      { error: "Failed to create particular" },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  const guard = await requireApiAuth();
  if (guard.response) return guard.response;
  const acting = actingAs(guard.user);

  try {
    const { particularId, particularName, description, category, statusId, quantityAvailable } = await request.json();

    if (!particularId) {
      return NextResponse.json(
        { error: "Particular ID is required" },
        { status: 400 }
      );
    }

    // Get the existing record for before/after comparison
    const existing = await prisma.particular.findUnique({
      where: { particularId: parseInt(particularId, 10) },
      include: {
        inventory: {
          select: { itemId: true, itemName: true, quantityAvailable: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Particular not found" },
        { status: 404 }
      );
    }

    const updateData = {};
    if (particularName !== undefined) updateData.particularName = particularName.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (category !== undefined) updateData.category = category.trim();
    if (statusId !== undefined) updateData.statusId = parseInt(statusId, 10);

    const updated = await prisma.particular.update({
      where: { particularId: parseInt(particularId, 10) },
      data: updateData,
      include: {
        inventory: {
          select: { itemId: true, itemName: true, quantityAvailable: true },
        },
      },
    });

    // Update quantity in Inventory if provided
    const qty = parseInt(quantityAvailable, 10);
    if (!isNaN(qty) && qty >= 0) {
      if (updated.itemId) {
        // Update existing linked inventory
        await prisma.inventory.update({
          where: { itemId: updated.itemId },
          data: { quantityAvailable: qty },
        });
      } else if (qty > 0) {
        // No linked inventory - create one
        let inventory = await prisma.inventory.findFirst({
          where: { itemName: updated.particularName },
        });
        if (!inventory) {
          inventory = await prisma.inventory.create({
            data: {
              itemName: updated.particularName,
              unitCost: 0,
              quantityAvailable: qty,
              venueId: 1,
              statusId: 1,
            },
          });
        } else {
          await prisma.inventory.update({
            where: { itemId: inventory.itemId },
            data: { quantityAvailable: qty },
          });
        }
        // Link particular to inventory
        await prisma.particular.update({
          where: { particularId: updated.particularId },
          data: { itemId: inventory.itemId },
        });
        updated.itemId = inventory.itemId;
        updated.inventory = inventory;
      }
    }

    // Build before/after details
    const changes = [];
    if (particularName !== undefined && existing.particularName !== updated.particularName) {
      changes.push(`name: "${existing.particularName}" → "${updated.particularName}"`);
    }
    if (description !== undefined && (existing.description || "") !== (updated.description || "")) {
      changes.push(`description updated`);
    }
    if (category !== undefined && (existing.category || "") !== (updated.category || "")) {
      changes.push(`category: "${existing.category || ""}" → "${updated.category || ""}"`);
    }
    if (statusId !== undefined && existing.statusId !== updated.statusId) {
      changes.push(`status: ${getStatusName(existing.statusId)} → ${getStatusName(updated.statusId)}`);
    }
    if (!isNaN(qty) && qty >= 0 && (existing.inventory?.quantityAvailable ?? 0) !== qty) {
      changes.push(`quantity: ${existing.inventory?.quantityAvailable ?? 0} → ${qty}`);
    }

    if (changes.length > 0) {
      await prisma.auditLog.create({
        data: {
          action: "UPDATED",
          targetUserId: `PART-${updated.particularId}`,
          targetName: updated.particularName,
          performedById: acting.performedBy,
          performedByName: acting.performedByName,
          details: `Particular updated: ${changes.join("; ")}`,
        },
      });
    }

    return NextResponse.json({
      id: updated.particularId,
      particularId: updated.particularId,
      particularName: updated.particularName,
      description: updated.description || "",
      category: updated.category || "",
      totalQuantity: updated.inventory?.quantityAvailable ?? qty ?? 0,
      inventoryName: updated.inventory?.itemName || "",
      statusId: updated.statusId,
      statusName: getStatusName(updated.statusId),
    });
  } catch (error) {
    console.error("Failed to update particular:", error);
    return NextResponse.json(
      { error: "Failed to update particular" },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  const guard = await requireApiAuth();
  if (guard.response) return guard.response;
  const acting = actingAs(guard.user);

  try {
    const { particularId, action, quantity } = await request.json();

    if (!particularId) {
      return NextResponse.json(
        { error: "Particular ID is required" },
        { status: 400 }
      );
    }
    if (!action || !["RESTOCK", "DAMAGE"].includes(action)) {
      return NextResponse.json(
        { error: "Valid action (RESTOCK or DAMAGE) is required" },
        { status: 400 }
      );
    }
    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) {
      return NextResponse.json(
        { error: "Quantity must be a positive number" },
        { status: 400 }
      );
    }

    const existing = await prisma.particular.findUnique({
      where: { particularId: parseInt(particularId, 10) },
      include: { inventory: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Particular not found" },
        { status: 404 }
      );
    }

    let newQty;
    if (action === "RESTOCK") {
      newQty = (existing.inventory?.quantityAvailable ?? 0) + qty;
    } else {
      // DAMAGE
      const currentQty = existing.inventory?.quantityAvailable ?? 0;
      if (qty > currentQty) {
        return NextResponse.json(
          { error: `Cannot report ${qty} damaged — only ${currentQty} available` },
          { status: 400 }
        );
      }
      newQty = currentQty - qty;
    }

    // Update inventory quantity
    if (existing.inventory) {
      await prisma.inventory.update({
        where: { itemId: existing.inventory.itemId },
        data: { quantityAvailable: newQty },
      });
    } else if (action === "RESTOCK") {
      // No inventory exists — create one
      await prisma.inventory.create({
        data: {
          itemName: existing.particularName,
          unitCost: 0,
          quantityAvailable: qty,
          venueId: 1,
          statusId: 1,
        },
      });
      // Link it
      const inv = await prisma.inventory.findFirst({
        where: { itemName: existing.particularName },
      });
      if (inv) {
        await prisma.particular.update({
          where: { particularId: existing.particularId },
          data: { itemId: inv.itemId },
        });
      }
    }

    // Create a transaction record
    await prisma.particularTransaction.create({
      data: {
        particularId: parseInt(particularId, 10),
        transactionType: action,
        quantity: qty,
        performedById: acting.performedBy,
        performedByName: acting.performedByName,
      },
    });

    // Log the audit
    const actionLabel = action === "RESTOCK" ? "RESTOCKED" : "DAMAGED";
    const detailText =
      action === "RESTOCK"
        ? `Restocked ${qty} unit(s). New total: ${newQty}`
        : `Reported ${qty} damaged unit(s). Remaining: ${newQty}`;

    await prisma.auditLog.create({
      data: {
        action: actionLabel,
        targetUserId: `PART-${particularId}`,
        targetName: existing.particularName,
        performedById: acting.performedBy,
        performedByName: acting.performedByName,
        details: detailText,
      },
    });

    return NextResponse.json({
      success: true,
      particularId: existing.particularId,
      totalQuantity: newQty,
    });
  } catch (error) {
    console.error("Failed to process particular action:", error);
    return NextResponse.json(
      { error: "Failed to process action" },
      { status: 500 }
    );
  }
}
export async function DELETE(request) {
  const guard = await requireApiAuth();
  if (guard.response) return guard.response;
  const acting = actingAs(guard.user);

  try {
    const { searchParams } = new URL(request.url);
    const particularId = searchParams.get("id");

    if (!particularId) {
      return NextResponse.json(
        { error: "Particular ID is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.particular.findUnique({
      where: { particularId: parseInt(particularId, 10) },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Particular not found" },
        { status: 404 }
      );
    }

    const id = parseInt(particularId, 10);

    // First, delete child records to avoid foreign key constraint violations
    await prisma.reservedParticular.deleteMany({
      where: { particularId: id },
    });

    await prisma.particularTransaction.deleteMany({
      where: { particularId: id },
    });

    await prisma.particular.delete({
      where: { particularId: id },
    });

    await prisma.auditLog.create({
      data: {
        action: "DELETED",
        targetUserId: `PART-${particularId}`,
        targetName: existing.particularName,
        performedById: acting.performedBy,
        performedByName: acting.performedByName,
        details: `Particular deleted: name="${existing.particularName}", category="${existing.category || ""}"`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete particular:", error);
    return NextResponse.json(
      { error: "Failed to delete particular" },
      { status: 500 }
    );
  }
}