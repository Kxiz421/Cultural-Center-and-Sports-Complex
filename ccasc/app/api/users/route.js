import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Fetch both staff and clients
    const [staff, clients] = await Promise.all([
      prisma.staff.findMany({
        include: {
          staffRole: true,
          staffOrg: true,
        },
      }),
      prisma.client.findMany({
        include: {
          clientRole: true,
          clientOrg: true,
        },
      }),
    ]);

    // Role sort priority: Admin -> Program Coordinator -> Accounting Clerk -> LTOO -> Client -> Provincial Gov
    const roleOrder = {
      "Admin": 1,
      "Program Coordinator": 2,
      "Accounting Clerk": 3,
      "Local Treasury Operations Officer": 4,
      "Client": 5,
      "Provincial Government": 6,
    };

    // Transform data to unified format
    const users = [
      ...staff.map((s) => ({
        id: `STF-${s.staffId}`,
        type: "staff",
        username: s.username,
        firstName: s.firstName,
        middleName: s.middleName,
        lastName: s.lastName,
        email: s.email,
        contact: s.contactNumber,
        role: s.staffRole.roleName,
        organization: s.staffOrg.orgName,
        status: s.status,
        dbId: s.staffId,
        createdAt: s.createdAt,
        rolePriority: roleOrder[s.staffRole.roleName] ?? 99,
        verificationStatus: null,
        profilePhoto: s.profilePhoto,
      })),
      ...clients.map((c) => ({
        id: `CLT-${c.clientId}`,
        type: "client",
        username: c.username,
        firstName: c.firstName,
        middleName: c.middleName,
        lastName: c.lastName,
        email: c.email,
        contact: c.contactNumber,
        role: c.clientRole.roleName === "Public Client" ? "Client" : c.clientRole.roleName,
        organization: c.clientOrg.organizationName,
        status: c.accountStatus,
        dbId: c.clientId,
        createdAt: c.createdAt,
        rolePriority: roleOrder[c.clientRole.roleName === "Public Client" ? "Client" : c.clientRole.roleName] ?? 99,
        verificationStatus: c.verificationStatus,
        profilePhoto: c.profilePhoto,
      })),
    ];

    // Sort by role priority, then by name
    users.sort((a, b) => {
      const prio = a.rolePriority - b.rolePriority;
      if (prio !== 0) return prio;
      return `${a.lastName}, ${a.firstName}`.localeCompare(
        `${b.lastName}, ${b.firstName}`
      );
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const data = await request.json();

    // Validate required fields
    if (!data.firstName || !data.lastName || !data.email || !data.roleType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    const autoUsername = (data.username || `${data.firstName}.${data.lastName}`)
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, "");

    if (data.roleType === "staff") {
      const staff = await prisma.staff.create({
        data: {
          username: autoUsername,
          firstName: data.firstName,
          middleName: data.middleName || null,
          lastName: data.lastName,
          email: data.email,
          contactNumber: data.contact,
          password: hashedPassword,
          status: "Active",
          profilePhoto: null,
          staffRoleId: parseInt(data.roleId),
          staffOrgId: parseInt(data.orgId),
        },
      });
      return NextResponse.json(staff);
    } else {
      const client = await prisma.client.create({
        data: {
          username: autoUsername,
          firstName: data.firstName,
          middleName: data.middleName || null,
          lastName: data.lastName,
          email: data.email,
          contactNumber: data.contact,
          password: hashedPassword,
          idProof: null,
          accountStatus: "Active",
          profilePhoto: null,
          clientRoleId: data.roleId,
          clientOrgId: parseInt(data.orgId),
        },
      });
      return NextResponse.json(client);
    }
  } catch (error) {
    console.error("Failed to create user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const { userId, status } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "userId and field to update are required" },
        { status: 400 }
      );
    }

    const prefix = userId.split("-")[0];
    const id = parseInt(userId.split("-")[1], 10);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    // If just updating status (legacy support)
    if (status) {
      if (prefix === "STF") {
        await prisma.staff.update({
          where: { staffId: id },
          data: { status },
        });
      } else if (prefix === "CLT") {
        await prisma.client.update({
          where: { clientId: id },
          data: { accountStatus: status },
        });
      } else {
        return NextResponse.json({ error: "Unknown user type" }, { status: 400 });
      }
      return NextResponse.json({ success: true, newStatus: status });
    }

    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  } catch (error) {
    console.error("Failed to update user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { userId, firstName, middleName, lastName, email, contact } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const prefix = userId.split("-")[0];
    const id = parseInt(userId.split("-")[1], 10);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    if (prefix === "STF") {
      const updateData = {};
      if (firstName !== undefined) updateData.firstName = firstName.trim();
      if (middleName !== undefined) updateData.middleName = middleName.trim() || null;
      if (lastName !== undefined) updateData.lastName = lastName.trim();
      if (email !== undefined) updateData.email = email.trim();
      if (contact !== undefined) updateData.contactNumber = contact.trim();

      await prisma.staff.update({
        where: { staffId: id },
        data: updateData,
      });
    } else if (prefix === "CLT") {
      const updateData = {};
      if (firstName !== undefined) updateData.firstName = firstName.trim();
      if (middleName !== undefined) updateData.middleName = middleName.trim() || null;
      if (lastName !== undefined) updateData.lastName = lastName.trim();
      if (email !== undefined) updateData.email = email.trim();
      if (contact !== undefined) updateData.contactNumber = contact.trim();

      await prisma.client.update({
        where: { clientId: id },
        data: updateData,
      });
    } else {
      return NextResponse.json({ error: "Unknown user type" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}
