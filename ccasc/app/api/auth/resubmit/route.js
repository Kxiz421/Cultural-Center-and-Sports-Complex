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

    // Handle organization: a typed custom name gets its own org row (dedupe
    // case-insensitively); no shared generic "Other" bucket is created.
    let orgId;
    let otherOrgValue = null;
    if (organizationId && organizationId !== "other") {
      orgId = parseInt(organizationId, 10);
    } else {
      const typedName = String(otherOrganization || "").trim();
      if (!typedName) {
        return NextResponse.json(
          { error: "Please enter your organization name" },
          { status: 400 }
        );
      }
      let existingOrg = await prisma.clientOrganization.findFirst({
        where: { organizationName: { equals: typedName, mode: "insensitive" } },
      });
      if (!existingOrg) {
        existingOrg = await prisma.clientOrganization.create({
          data: { organizationName: typedName },
        });
      }
      orgId = existingOrg.clientOrgId;
      otherOrgValue = existingOrg.organizationName;
    }

    // Update client: reset verification to Pending, update org, other org name, and idProof
    await prisma.client.update({
      where: { clientId: id },
      data: {
        idProof: idProof || null,
        clientOrgId: orgId,
        otherOrganization: otherOrgValue,
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