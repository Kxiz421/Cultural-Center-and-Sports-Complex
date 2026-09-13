import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { noCacheJson } from "@/lib/api-cache-control";

export async function GET() {
  try {
    const organizations = await prisma.clientOrganization.findMany({
      orderBy: { organizationName: "asc" },
    });

    return noCacheJson(organizations);
  } catch (error) {
    console.error("Failed to fetch client organizations:", error);
    return noCacheJson(
      { error: "Failed to fetch organizations" },
      { status: 500 }
    );
  }
}