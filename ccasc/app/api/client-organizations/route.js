import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { noCacheJson } from "@/lib/api-cache-control";

export async function GET() {
  try {
    // Only the curated organizations are offered in the registration /
    // resubmission dropdowns. Rows created from a client-typed "Other" name
    // (isCustom) are still linked to their client but hidden here, so the list
    // never grows one entry per custom name.
    const organizations = await prisma.clientOrganization.findMany({
      where: { isCustom: false },
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