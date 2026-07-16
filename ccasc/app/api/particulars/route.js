import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const STATUS_NAMES = {
  1: "Available",
  2: "Unavailable",
  3: "Under Maintenance",
  4: "Archived",
};

function getStatusName(id) {
  return STATUS_NAMES[id] || `Status ${id}`;
}

export async function GET() {
  try {
    const items = await prisma.particular.findMany({
      orderBy: { particularId: "asc" },
    });

    const formatted = items.map((item) => ({
      id: item.particularId,
      particularId: item.particularId,
      particularName: item.particularName,
      description: item.description || "",
      category: item.category || "",
      totalQuantity: item.totalQuantity,
      statusId: item.statusId,
      statusName: getStatusName(item.statusId),
      itemId: item.itemId,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Failed to fetch particulars:", error);
    return NextResponse.json(
      { error: "Failed to fetch particulars" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { particularName, description, category, totalQuantity, performedBy, performedByName } = await request.json();

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
        totalQuantity: parseInt(totalQuantity, 10) || 0,
        statusId: 1, // Default to Available
      },
    });

    // Log the creation
    await prisma.auditLog.create({
      data: {
        action: "CREATED",
        targetUserId: `PART-${created.particularId}`,
        targetName: created.particularName,
        performedById: performedBy || "system",
        performedByName: performedByName || "System",
        details: `Particular created: name="${created.particularName}", category="${created.category}", quantity=${created.totalQuantity}`,
      },
    });

    return NextResponse.json({
      id: created.particularId,
      particularId: created.particularId,
      particularName: created.particularName,
      description: created.description || "",
      category: created.category || "",
      totalQuantity: created.totalQuantity,
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
  try {
    const { particularId, particularName, description, category, totalQuantity, statusId, performedBy, performedByName } = await request.json();

    if (!particularId) {
      return NextResponse.json(
        { error: "Particular ID is required" },
        { status: 400 }
      );
    }

    // Get the existing record for before/after comparison
    const existing = await prisma.particular.findUnique({
      where: { particularId: parseInt(particularId, 10) },
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
    if (totalQuantity !== undefined) updateData.totalQuantity = parseInt(totalQuantity, 10);
    if (statusId !== undefined) updateData.statusId = parseInt(statusId, 10);

    const updated = await prisma.particular.update({
      where: { particularId: parseInt(particularId, 10) },
      data: updateData,
    });

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
    if (totalQuantity !== undefined && existing.totalQuantity !== updated.totalQuantity) {
      changes.push(`quantity: ${existing.totalQuantity} → ${updated.totalQuantity}`);
    }
    if (statusId !== undefined && existing.statusId !== updated.statusId) {
      changes.push(`status: ${getStatusName(existing.statusId)} → ${getStatusName(updated.statusId)}`);
    }

    if (changes.length > 0) {
      await prisma.auditLog.create({
        data: {
          action: "UPDATED",
          targetUserId: `PART-${updated.particularId}`,
          targetName: updated.particularName,
          performedById: performedBy || "system",
          performedByName: performedByName || "System",
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
      totalQuantity: updated.totalQuantity,
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

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const particularId = searchParams.get("id");
    const performedBy = searchParams.get("performedBy") || "";
    const performedByName = searchParams.get("performedByName") || "";

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

    await prisma.particular.delete({
      where: { particularId: parseInt(particularId, 10) },
    });

    await prisma.auditLog.create({
      data: {
        action: "DELETED",
        targetUserId: `PART-${particularId}`,
        targetName: existing.particularName,
        performedById: performedBy || "system",
        performedByName: performedByName || "System",
        details: `Particular deleted: name="${existing.particularName}", category="${existing.category || ""}", quantity=${existing.totalQuantity}`,
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