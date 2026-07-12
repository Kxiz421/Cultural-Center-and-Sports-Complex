import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get("targetUserId");
    const targetUserIdPrefix = searchParams.get("targetUserIdPrefix");

    let where = {};

    if (targetUserIdPrefix) {
      where = {
        targetUserId: {
          startsWith: targetUserIdPrefix,
        },
      };
    } else if (targetUserId) {
      where = { targetUserId };
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Failed to fetch audit logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}
