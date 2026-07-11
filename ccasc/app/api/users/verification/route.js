import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function PATCH(request) {
  try {
    const { userId, verificationStatus } = await request.json();

    if (!userId || !verificationStatus) {
      return NextResponse.json(
        { error: "userId and verificationStatus are required" },
        { status: 400 }
      );
    }

    if (!["Pending", "Verified"].includes(verificationStatus)) {
      return NextResponse.json(
        { error: "verificationStatus must be 'Pending' or 'Verified'" },
        { status: 400 }
      );
    }

    const prefix = userId.split("-")[0];
    const id = parseInt(userId.split("-")[1], 10);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    if (prefix === "CLT") {
      const updateData = { verificationStatus };
      // Auto-activate account when verified
      if (verificationStatus === "Verified") {
        updateData.accountStatus = "Active";
      }
      await prisma.client.update({
        where: { clientId: id },
        data: updateData,
      });
    } else {
      return NextResponse.json(
        { error: "Only client accounts can have verification status" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, verificationStatus });
  } catch (error) {
    console.error("Failed to update verification status:", error);
    return NextResponse.json(
      { error: "Failed to update verification status" },
      { status: 500 }
    );
  }
}