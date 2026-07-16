import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

const prisma = new PrismaClient();

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email/Username and password are required" },
        { status: 400 }
      );
    }

    // Try to find a staff member by email or username
    let staff = await prisma.staff.findUnique({
      where: { email: email },
      include: { staffRole: true },
    });

    if (!staff) {
      staff = await prisma.staff.findUnique({
        where: { username: email },
        include: { staffRole: true },
      });
    }

    if (staff) {
      const passwordValid = await bcrypt.compare(password, staff.password);
      if (!passwordValid) {
        return NextResponse.json(
          { error: "Invalid email/username or password" },
          { status: 401 }
        );
      }

      return NextResponse.json({
        id: `STF-${staff.staffId}`,
        type: staff.staffRole.roleName.toLowerCase(),
        firstName: staff.firstName,
        lastName: staff.lastName,
        role: staff.staffRole.roleName,
        email: staff.email,
      });
    }

    // Try to find a client by email or username
    let client = await prisma.client.findUnique({
      where: { email: email },
      include: { clientRole: true },
    });

    if (!client) {
      client = await prisma.client.findUnique({
        where: { username: email },
        include: { clientRole: true },
      });
    }

    if (client) {
      const passwordValid = await bcrypt.compare(password, client.password);
      if (!passwordValid) {
        return NextResponse.json(
          { error: "Invalid email/username or password" },
          { status: 401 }
        );
      }

      if (client.accountStatus === "Deactivated") {
        return NextResponse.json(
          { error: "Your account has been deactivated. Contact the administrator." },
          { status: 403 }
        );
      }

      if (client.verificationStatus === "Declined") {
        const remarksText = client.remarks
          ? ` Reason: ${client.remarks}`
          : "";
        return NextResponse.json(
          {
            error: `Your Certificate of Employment has been declined. Please resubmit a valid document.${remarksText}`,
            needsResubmission: true,
            clientId: `CLT-${client.clientId}`,
          },
          { status: 403 }
        );
      }

      if (client.accountStatus === "Pending" || client.verificationStatus === "Pending") {
        return NextResponse.json(
          { error: "Your registration is still pending verification. Please wait for admin approval." },
          { status: 403 }
        );
      }

      const userType = client.clientRole.clientRoleId === 'PROV' ? 'provincial-agency' : 'client';

      return NextResponse.json({
        id: `CLT-${client.clientId}`,
        type: userType,
        firstName: client.firstName,
        lastName: client.lastName,
        role: client.clientRole.roleName,
        email: client.email,
      });
    }

    return NextResponse.json(
      { error: "Invalid email/username or password" },
      { status: 401 }
    );
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "An error occurred during login" },
      { status: 500 }
    );
  }
}
