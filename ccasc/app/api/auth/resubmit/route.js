import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireApiAuth } from "@/lib/api-auth";
import { USER_TYPE } from "@/lib/auth-roles";

export async function POST(request) {
  // A declined client's restricted session is the only caller allowed here.
  const guard = await requireApiAuth([USER_TYPE.RESUBMIT_ONLY]);
  if (guard.response) return guard.response;

  try {
    const { organizationId, otherOrganization, idProof } = await request.json();

    if (!organizationId && !otherOrganization) {
      return NextResponse.json(
        { error: "Please select or enter an organization" },
        { status: 400 }
      );
    }

    // The client id comes from the signed session, never from the request
    // body - previously anyone could resubmit on behalf of any CLT-<id>.
    const id = guard.user.clientId;

    if (!id) {
      return NextResponse.json(
        { error: "Invalid client session" },
        { status: 400 }
      );
    }

    const existing = await prisma.client.findUnique({
      where: { clientId: id },
      select: { verificationStatus: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Only a currently-declined submission may be replaced.
    if (existing.verificationStatus !== "Declined") {
      return NextResponse.json(
        {
          error:
            "This account is not awaiting resubmission. Please sign in again.",
        },
        { status: 409 }
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