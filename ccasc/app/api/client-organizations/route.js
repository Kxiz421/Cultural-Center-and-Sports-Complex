import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const organizations = await prisma.clientOrganization.findMany({
      orderBy: { organizationName: "asc" },
    });

    return NextResponse.json(organizations);
  } catch (error) {
    console.error("Failed to fetch client organizations:", error);
    return NextResponse.json(
      { error: "Failed to fetch organizations" },
      { status: 500 }
    );
  }
}