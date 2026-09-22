import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { noCacheJson } from "@/lib/api-cache-control";


import { requireApiAuth } from "@/lib/api-auth";
export async function GET(request) {
  const guard = await requireApiAuth(["admin"]);
  if (guard.response) return guard.response;

  try {
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get("targetUserId");
    const targetUserIdPrefix = searchParams.get("targetUserIdPrefix");
    const scope = searchParams.get("scope");

    let where = {};

    if (scope === "user") {
      where = {
        OR: [
          { targetUserId: { startsWith: "STF-" } },
          { targetUserId: { startsWith: "CLT-" } },
        ],
      };
    } else if (targetUserIdPrefix) {
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

    return noCacheJson(logs);
  } catch (error) {
    console.error("Failed to fetch audit logs:", error);
    return noCacheJson(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}
