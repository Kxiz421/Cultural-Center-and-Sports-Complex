  import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { noCacheJson } from "@/lib/api-cache-control";

import { requireApiAuth, actingAs } from "@/lib/api-auth";
import { STAFF_TYPES } from "@/lib/auth-roles";
const STATUS_NAMES = {
  1: "Available",
  2: "Unavailable",
  3: "Under Maintenance",
  4: "Archived",
};

function getStatusName(id) {
  return STATUS_NAMES[id] || `Status ${id}`;
}

/**
 * Price of a particular = `Inventory.unitCost` of the linked inventory row.
 *
 * @returns {number|null} the parsed amount, or null when the value is unusable
 *   (negative / not a number). Missing values mean "0" so existing callers that
 *   never send a price keep working.
 */
function parseUnitCost(value) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return 0;
  }
  const amount = Number(String(value).replace(/,/g, ""));
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100) / 100;
}

/** "₱1,200.00" for audit-log details. */
function formatPeso(amount) {
  return `₱${(Number(amount) || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
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
    const { particularName, description, category, quantityAvailable, unitCost } = await request.json();

    if (!particularName || !particularName.trim()) {
      return NextResponse.json(
        { error: "Particular name is required" },
        { status: 400 }
      );
    }

    // Price lives on the linked Inventory row (`Inventory.unitCost`), which is
    // what reservation pricing reads; 0 is allowed (free / not yet priced).
    // An omitted price is left untouched so re-linking an existing inventory
    // item never silently clears a price that is already set.
    const priceProvided =
      unitCost !== undefined &&
      unitCost !== null &&
      String(unitCost).trim() !== "";
    const price = parseUnitCost(unitCost);
    if (price === null) {
      return NextResponse.json(
        { error: "Price must be a valid amount of 0 or more" },
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

    // An inventory row is created/linked when a quantity OR a price is given,
    // so a particular can be priced before it has stock.
    const qty = parseInt(quantityAvailable, 10);
    const hasQty = !Number.isNaN(qty) && qty > 0;
    if (hasQty || (priceProvided && price > 0)) {
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
        // Update quantity and/or price
        await prisma.inventory.update({
          where: { itemId: inventory.itemId },
          data: {
            ...(hasQty ? { quantityAvailable: qty } : {}),
            ...(priceProvided ? { unitCost: price } : {}),
          },
        });
      } else {
        // Create new inventory item
        inventory = await prisma.inventory.create({
          data: {
            itemName: particularName.trim(),
            unitCost: price,
            quantityAvailable: hasQty ? qty : 0,
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
        details: `Particular created: name="${created.particularName}", category="${created.category}", quantity=${hasQty ? qty : 0}, price=${priceProvided ? formatPeso(price) : "not set"}`,
      },
    });

    return NextResponse.json({
      id: created.particularId,
      particularId: created.particularId,
      particularName: created.particularName,
      description: created.description || "",
      category: created.category || "",
      totalQuantity: hasQty ? qty : 0,
      unitCost: priceProvided ? price : 0,
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
    const { particularId, particularName, description, category, statusId, quantityAvailable, unitCost } = await request.json();

    if (!particularId) {
      return NextResponse.json(
        { error: "Particular ID is required" },
        { status: 400 }
      );
    }

    // `unitCost === undefined` means "leave the price alone" (e.g. the archive /
    // restore toggle and the restock / damage calls).
    const price = unitCost === undefined ? null : parseUnitCost(unitCost);
    if (price === null && unitCost !== undefined) {
      return NextResponse.json(
        { error: "Price must be a valid amount of 0 or more" },
        { status: 400 }
      );
    }

    // Get the existing record for before/after comparison
    const existing = await prisma.particular.findUnique({
      where: { particularId: parseInt(particularId, 10) },
      include: {
        inventory: {
          select: {
            itemId: true,
            itemName: true,
            quantityAvailable: true,
            unitCost: true,
          },
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
          select: {
            itemId: true,
            itemName: true,
            quantityAvailable: true,
            unitCost: true,
          },
        },
      },
    });

    // Quantity and price both live on the linked Inventory row.
    const qty = parseInt(quantityAvailable, 10);
    const hasQty = !isNaN(qty) && qty >= 0;

    if (updated.itemId) {
      // Update the already linked inventory
      const inventoryData = {};
      if (hasQty) inventoryData.quantityAvailable = qty;
      if (price !== null) inventoryData.unitCost = price;
      if (Object.keys(inventoryData).length > 0) {
        await prisma.inventory.update({
          where: { itemId: updated.itemId },
          data: inventoryData,
        });
        updated.inventory = { ...updated.inventory, ...inventoryData };
      }
    } else if ((hasQty && qty > 0) || price !== null) {
      // No linked inventory yet - create (or reuse) one so the price is stored
      let inventory = await prisma.inventory.findFirst({
        where: { itemName: updated.particularName },
      });
      if (!inventory) {
        inventory = await prisma.inventory.create({
          data: {
            itemName: updated.particularName,
            unitCost: price ?? 0,
            quantityAvailable: hasQty ? qty : 0,
            venueId: 1,
            statusId: 1,
          },
        });
      } else {
        await prisma.inventory.update({
          where: { itemId: inventory.itemId },
          data: {
            ...(hasQty ? { quantityAvailable: qty } : {}),
            ...(price !== null ? { unitCost: price } : {}),
          },
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
    if (price !== null && Number(existing.inventory?.unitCost ?? 0) !== price) {
      changes.push(
        `price: ${formatPeso(existing.inventory?.unitCost ?? 0)} → ${formatPeso(price)}`
      );
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
      totalQuantity: updated.inventory?.quantityAvailable ?? (hasQty ? qty : 0),
      unitCost: Number(updated.inventory?.unitCost ?? 0),
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
  // Restocking / reporting damage moves stock and writes an audit entry, and the
  // coordinator particulars module calls this route too, so it stays staff-only.
  // The movement is always attributed to the signed-in user (never to a
  // caller-supplied name).
  const guard = await requireApiAuth(STAFF_TYPES);
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