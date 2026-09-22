import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { noCacheJson } from "@/lib/api-cache-control";


import { requireApiAuth } from "@/lib/api-auth";
export async function GET(request) {
  const guard = await requireApiAuth(["accounting clerk","program coordinator cultural","program coordinator sports","admin"]);
  if (guard.response) return guard.response;

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.trim().length < 2) {
      return noCacheJson([]);
    }

    const searchTerm = query.trim();

    // Search clients by name, email, or contact number
    const clients = await prisma.client.findMany({
      where: {
        OR: [
          { firstName: { contains: searchTerm } },
          { lastName: { contains: searchTerm } },
          { email: { contains: searchTerm } },
          { contactNumber: { contains: searchTerm } },
        ],
        accountStatus: "Active",
      },
      select: {
        clientId: true,
        firstName: true,
        middleName: true,
        lastName: true,
        email: true,
        contactNumber: true,
      },
      take: 20,
      orderBy: { lastName: "asc" },
    });

    const formatted = clients.map((c) => ({
      id: `CLT-${c.clientId}`,
      clientId: c.clientId,
      firstName: c.firstName,
      middleName: c.middleName,
      lastName: c.lastName,
      fullName: `${c.firstName} ${c.middleName ? c.middleName + " " : ""}${c.lastName}`,
      email: c.email,
      contact: c.contactNumber,
    }));

    return noCacheJson(formatted);
  } catch (error) {
    console.error("Client search error:", error);
    return noCacheJson(
      { error: "Failed to search clients" },
      { status: 500 }
    );
  }
}