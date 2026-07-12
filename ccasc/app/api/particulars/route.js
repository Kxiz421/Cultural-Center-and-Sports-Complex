import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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
    const { particularName, description, performedBy, performedByName } = await request.json();

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
        details: `Particular created: "${created.particularName}"`,
      },
    });

    return NextResponse.json({
      id: created.particularId,
      particularId: created.particularId,
      particularName: created.particularName,
      description: created.description || "",
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
    const { particularId, particularName, description, performedBy, performedByName } = await request.json();

    if (!particularId) {
      return NextResponse.json(
        { error: "Particular ID is required" },
        { status: 400 }
      );
    }

    const updateData = {};
    if (particularName !== undefined) updateData.particularName = particularName.trim();
    if (description !== undefined) updateData.description = description.trim();

    const updated = await prisma.particular.update({
      where: { particularId: parseInt(particularId, 10) },
      data: updateData,
    });

    // Build details of what changed
    const changes = [];
    if (particularName !== undefined) changes.push(`name: "${particularName.trim()}"`);
    if (description !== undefined) changes.push(`description updated`);

    await prisma.auditLog.create({
      data: {
        action: "UPDATED",
        targetUserId: `PART-${updated.particularId}`,
        targetName: updated.particularName,
        performedById: performedBy || "system",
        performedByName: performedByName || "System",
        details: `Particular updated: ${changes.join(", ")}`,
      },
    });

    return NextResponse.json({
      id: updated.particularId,
      particularId: updated.particularId,
      particularName: updated.particularName,
      description: updated.description || "",
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
        details: `Particular deleted: "${existing.particularName}"`,
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