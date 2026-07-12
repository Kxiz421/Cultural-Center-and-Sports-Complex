import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request) {
  try {
    const { clientId, organizationId, otherOrganization, idProof } = await request.json();

    if (!clientId) {
      return NextResponse.json(
        { error: "Client ID is required" },
        { status: 400 }
      );
    }

    if (!organizationId && !otherOrganization) {
      return NextResponse.json(
        { error: "Please select or enter an organization" },
        { status: 400 }
      );
    }

    const prefix = clientId.split("-")[0];
    const id = parseInt(clientId.split("-")[1], 10);

    if (prefix !== "CLT" || isNaN(id)) {
      return NextResponse.json(
        { error: "Invalid client ID" },
        { status: 400 }
      );
    }

    // Handle organization
    let orgId;
    if (organizationId && organizationId !== "other") {
      orgId = parseInt(organizationId, 10);
    } else {
      // Create a new organization for "Other"
      const newOrg = await prisma.clientOrganization.create({
        data: {
          organizationName: otherOrganization,
        },
      });
      orgId = newOrg.clientOrgId;
    }

    // Update client: reset verification to Pending, update org and idProof
    await prisma.client.update({
      where: { clientId: id },
      data: {
        idProof: idProof || null,
        clientOrgId: orgId,
        verificationStatus: "Pending",
        accountStatus: "Pending",
      },
    });

    return NextResponse.json(
      {
        message: "Resubmission successful. Please wait for admin approval.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Resubmission error:", error);
    return NextResponse.json(
      { error: "An error occurred during resubmission" },
      { status: 500 }
    );
  }
}