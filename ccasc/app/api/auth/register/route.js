import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request) {
  try {
    const { firstName, middleName, lastName, email, contactNumber, password, organizationId, otherOrganization, idProof } = await request.json();

    // Validate required fields
    if (!firstName || !lastName || !email || !password || !contactNumber) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!organizationId && !otherOrganization) {
      return NextResponse.json(
        { error: "Please select or enter an organization" },
        { status: 400 }
      );
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    // Generate username from email prefix
    const username = email.split("@")[0].toLowerCase().replace(/[^a-z0-9._-]/g, "");

    // Check for duplicate email in both staff and client tables
    const [existingStaffEmail, existingClientEmail] = await Promise.all([
      prisma.staff.findUnique({ where: { email } }),
      prisma.client.findUnique({ where: { email } }),
    ]);
    if (existingStaffEmail || existingClientEmail) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Check for duplicate username
    const [existingStaffUser, existingClientUser] = await Promise.all([
      prisma.staff.findUnique({ where: { username } }),
      prisma.client.findUnique({ where: { username } }),
    ]);
    if (existingStaffUser || existingClientUser) {
      return NextResponse.json(
        { error: "This email is already registered" },
        { status: 409 }
      );
    }

    // Handle organization
    let orgId;
    if (organizationId) {
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

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create client
    const client = await prisma.client.create({
      data: {
        username,
        firstName,
        middleName: middleName || null,
        lastName,
        email,
        contactNumber,
        password: hashedPassword,
        idProof: idProof || null,
        accountStatus: "Active",
        verificationStatus: "Pending",
        clientRoleId: "PUB",
        clientOrgId: orgId,
      },
    });

    return NextResponse.json(
      {
        message: "Registration successful. You can now sign in.",
        clientId: `CLT-${client.clientId}`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "An error occurred during registration" },
      { status: 500 }
    );
  }
}