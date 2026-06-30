import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const packages = await prisma.package.findMany({
      include: {
        timeSlot: { select: { startTime: true, endTime: true } },
        inclusions: {
          include: {
            item: {
              select: { itemName: true, quantityAvailable: true },
            },
          },
        },
      },
      orderBy: { packageId: "asc" },
    });

    const formatted = packages.map((pkg) => ({
      id: pkg.packageId,
      packageId: pkg.packageId,
      packageName: pkg.packageName,
      dayRate: pkg.dayRate ? Number(pkg.dayRate) : null,
      nightRate: pkg.nightRate ? Number(pkg.nightRate) : null,
      ledWallDayRate: pkg.ledWallDayRate ? Number(pkg.ledWallDayRate) : null,
      ledWallNightRate: pkg.ledWallNightRate ? Number(pkg.ledWallNightRate) : null,
      timeSlot: `${pkg.timeSlot.startTime} — ${pkg.timeSlot.endTime}`,
      inclusions: pkg.inclusions.map((inc) => ({
        itemName: inc.item.itemName,
        quantityAvailable: inc.quantityAvailable,
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

export async function PUT(request) {
  try {
    const { packageId, packageName, dayRate, nightRate, ledWallDayRate, ledWallNightRate } = await request.json();

    if (!packageId) {
      return NextResponse.json(
        { error: "Package ID is required" },
        { status: 400 }
      );
    }

    const updateData = {};
    if (packageName !== undefined) updateData.packageName = packageName;
    if (dayRate !== undefined) updateData.dayRate = parseFloat(dayRate);
    if (nightRate !== undefined) updateData.nightRate = parseFloat(nightRate);
    if (ledWallDayRate !== undefined) updateData.ledWallDayRate = parseFloat(ledWallDayRate);
    if (ledWallNightRate !== undefined) updateData.ledWallNightRate = parseFloat(ledWallNightRate);

    const updated = await prisma.package.update({
      where: { packageId: parseInt(packageId, 10) },
      data: updateData,
      include: {
        timeSlot: { select: { startTime: true, endTime: true } },
        inclusions: {
          include: {
            item: {
              select: { itemName: true, quantityAvailable: true },
            },
          },
        },
      },
    });

    return NextResponse.json({
      id: updated.packageId,
      packageId: updated.packageId,
      packageName: updated.packageName,
      dayRate: updated.dayRate ? Number(updated.dayRate) : null,
      nightRate: updated.nightRate ? Number(updated.nightRate) : null,
      ledWallDayRate: updated.ledWallDayRate ? Number(updated.ledWallDayRate) : null,
      ledWallNightRate: updated.ledWallNightRate ? Number(updated.ledWallNightRate) : null,
      timeSlot: `${updated.timeSlot.startTime} — ${updated.timeSlot.endTime}`,
      inclusions: updated.inclusions.map((inc) => ({
        itemName: inc.item.itemName,
        quantityAvailable: inc.quantityAvailable,
      })),
    });
  } catch (error) {
    console.error("Failed to update package:", error);
    return NextResponse.json(
      { error: "Failed to update package" },
      { status: 500 }
    );
  }
}