import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Try to find a staff member with this email
    const staff = await prisma.staff.findUnique({
      where: { email: email },
      include: { staffRole: true },
    });

    if (staff) {
      const passwordValid = await bcrypt.compare(password, staff.password);
      if (!passwordValid) {
        return NextResponse.json(
          { error: "Invalid email or password" },
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

    // Try to find a client with this email
    const client = await prisma.client.findUnique({
      where: { email: email },
      include: { clientRole: true },
    });

    if (client) {
      const passwordValid = await bcrypt.compare(password, client.password);
      if (!passwordValid) {
        return NextResponse.json(
          { error: "Invalid email or password" },
          { status: 401 }
        );
      }

      if (client.accountStatus !== "Active") {
        return NextResponse.json(
          { error: "Your account has been deactivated. Contact the administrator." },
          { status: 403 }
        );
      }

      return NextResponse.json({
        id: `CLT-${client.clientId}`,
        type: "client",
        firstName: client.firstName,
        lastName: client.lastName,
        role: client.clientRole.roleName,
        email: client.email,
      });
    }

    return NextResponse.json(
      { error: "Invalid email or password" },
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