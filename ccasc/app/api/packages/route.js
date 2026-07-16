import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
    const packages = await prisma.package.findMany({
      include: {
        timeSlot: { select: { startTime: true, endTime: true } },
        inclusions: {
          include: {
            item: { select: { itemName: true, quantityAvailable: true } },
          },
        },
      },
      orderBy: { packageId: "asc" },
    });

    const formatted = packages.map((pkg) => ({
      id: pkg.packageId,
      packageId: pkg.packageId,
      packageName: pkg.packageName,
      description: pkg.description || "",
      dayRate: pkg.dayRate ? Number(pkg.dayRate) : null,
      nightRate: pkg.nightRate ? Number(pkg.nightRate) : null,
      ledWallDayRate: pkg.ledWallDayRate ? Number(pkg.ledWallDayRate) : null,
      ledWallNightRate: pkg.ledWallNightRate ? Number(pkg.ledWallNightRate) : null,
      statusId: pkg.statusId,
      statusName: getStatusName(pkg.statusId),
      timeSlot: `${pkg.timeSlot.startTime} — ${pkg.timeSlot.endTime}`,
      inclusions: pkg.inclusions.map((inc) => ({
        itemId: inc.itemId,
        itemName: inc.item?.itemName || "Unknown",
        quantityAvailable: inc.item?.quantityAvailable ?? inc.quantityAvailable,
      })),
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Failed to fetch packages:", error);
    return NextResponse.json(
      { error: "Failed to fetch packages" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { packageName, description, dayRate, nightRate, ledWallDayRate, ledWallNightRate, timeSlotId, inclusions, performedBy, performedByName } = await request.json();

    if (!packageName || !packageName.trim()) {
      return NextResponse.json({ error: "Package name is required" }, { status: 400 });
    }

    const created = await prisma.package.create({
      data: {
        packageName: packageName.trim(),
        description: description?.trim() || "",
        dayRate: dayRate ? parseFloat(dayRate) : null,
        nightRate: nightRate ? parseFloat(nightRate) : null,
        ledWallDayRate: ledWallDayRate ? parseFloat(ledWallDayRate) : null,
        ledWallNightRate: ledWallNightRate ? parseFloat(ledWallNightRate) : null,
        timeSlotId: parseInt(timeSlotId, 10) || 1,
        statusId: 1,
        inclusions: inclusions && Array.isArray(inclusions) && inclusions.length > 0
          ? {
              create: inclusions
                .filter((inc) => inc.itemId && inc.quantityAvailable > 0)
                .map((inc) => ({
                  itemId: parseInt(inc.itemId, 10),
                  quantityAvailable: parseInt(inc.quantityAvailable, 10),
                })),
            }
          : undefined,
      },
      include: {
        timeSlot: { select: { startTime: true, endTime: true } },
        inclusions: { include: { item: { select: { itemName: true, quantityAvailable: true } } } },
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "CREATED",
        targetUserId: `PKG-${created.packageId}`,
        targetName: created.packageName,
        performedById: performedBy || "system",
        performedByName: performedByName || "System",
        details: `Package created: name="${created.packageName}"`,
      },
    });

    return NextResponse.json({
      id: created.packageId,
      packageId: created.packageId,
      packageName: created.packageName,
      description: created.description || "",
      dayRate: created.dayRate ? Number(created.dayRate) : null,
      nightRate: created.nightRate ? Number(created.nightRate) : null,
      ledWallDayRate: created.ledWallDayRate ? Number(created.ledWallDayRate) : null,
      ledWallNightRate: created.ledWallNightRate ? Number(created.ledWallNightRate) : null,
      statusId: created.statusId,
      statusName: getStatusName(created.statusId),
      timeSlot: `${created.timeSlot.startTime} — ${created.timeSlot.endTime}`,
      inclusions: [],
    });
  } catch (error) {
    console.error("Failed to create package:", error);
    return NextResponse.json({ error: "Failed to create package" }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { packageId, packageName, description, dayRate, nightRate, ledWallDayRate, ledWallNightRate, statusId, inclusions, performedBy, performedByName } = await request.json();

    if (!packageId) {
      return NextResponse.json({ error: "Package ID is required" }, { status: 400 });
    }

    const existing = await prisma.package.findUnique({
      where: { packageId: parseInt(packageId, 10) },
    });

    if (!existing) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    const updateData = {};
    if (packageName !== undefined) updateData.packageName = packageName.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (dayRate !== undefined) updateData.dayRate = dayRate ? parseFloat(dayRate) : null;
    if (nightRate !== undefined) updateData.nightRate = nightRate ? parseFloat(nightRate) : null;
    if (ledWallDayRate !== undefined) updateData.ledWallDayRate = ledWallDayRate ? parseFloat(ledWallDayRate) : null;
    if (ledWallNightRate !== undefined) updateData.ledWallNightRate = ledWallNightRate ? parseFloat(ledWallNightRate) : null;
    if (statusId !== undefined) updateData.statusId = parseInt(statusId, 10);

    // Handle inclusions update if provided
    if (inclusions !== undefined && Array.isArray(inclusions)) {
      // Delete existing inclusions for this package
      await prisma.packageInclusion.deleteMany({
        where: { packageId: parseInt(packageId, 10) },
      });
      // Create new inclusions
      for (const inc of inclusions) {
        if (inc.itemId && inc.quantityAvailable > 0) {
          await prisma.packageInclusion.create({
            data: {
              packageId: parseInt(packageId, 10),
              itemId: parseInt(inc.itemId, 10),
              quantityAvailable: parseInt(inc.quantityAvailable, 10),
            },
          });
        }
      }
    }

    const updated = await prisma.package.update({
      where: { packageId: parseInt(packageId, 10) },
      data: updateData,
      include: {
        timeSlot: { select: { startTime: true, endTime: true } },
        inclusions: { include: { item: { select: { itemName: true, quantityAvailable: true } } } },
      },
    });

    const changes = [];
    if (packageName !== undefined && existing.packageName !== updated.packageName) {
      changes.push(`name: "${existing.packageName}" → "${updated.packageName}"`);
    }
    if (description !== undefined) changes.push(`description updated`);
    if (dayRate !== undefined && Number(existing.dayRate || 0) !== Number(updated.dayRate || 0)) {
      changes.push(`day rate: ₱${Number(existing.dayRate || 0).toLocaleString()} → ₱${Number(updated.dayRate || 0).toLocaleString()}`);
    }
    if (nightRate !== undefined && Number(existing.nightRate || 0) !== Number(updated.nightRate || 0)) {
      changes.push(`night rate: ₱${Number(existing.nightRate || 0).toLocaleString()} → ₱${Number(updated.nightRate || 0).toLocaleString()}`);
    }
    if (statusId !== undefined && existing.statusId !== updated.statusId) {
      changes.push(`status: ${getStatusName(existing.statusId)} → ${getStatusName(updated.statusId)}`);
    }
    if (inclusions !== undefined) {
      changes.push(`inclusions updated`);
    }

    if (changes.length > 0) {
      await prisma.auditLog.create({
        data: {
          action: "UPDATED",
          targetUserId: `PKG-${updated.packageId}`,
          targetName: updated.packageName,
          performedById: performedBy || "system",
          performedByName: performedByName || "System",
          details: `Package updated: ${changes.join("; ")}`,
        },
      });
    }

    return NextResponse.json({
      id: updated.packageId,
      packageId: updated.packageId,
      packageName: updated.packageName,
      description: updated.description || "",
      dayRate: updated.dayRate ? Number(updated.dayRate) : null,
      nightRate: updated.nightRate ? Number(updated.nightRate) : null,
      ledWallDayRate: updated.ledWallDayRate ? Number(updated.ledWallDayRate) : null,
      ledWallNightRate: updated.ledWallNightRate ? Number(updated.ledWallNightRate) : null,
      statusId: updated.statusId,
      statusName: getStatusName(updated.statusId),
      timeSlot: `${updated.timeSlot.startTime} — ${updated.timeSlot.endTime}`,
      inclusions: updated.inclusions.map((inc) => ({
        itemName: inc.item?.itemName || "Unknown",
        quantityAvailable: inc.item?.quantityAvailable ?? inc.quantityAvailable,
      })),
    });
  } catch (error) {
    console.error("Failed to update package:", error);
    return NextResponse.json({ error: "Failed to update package" }, { status: 500 });
  }
}