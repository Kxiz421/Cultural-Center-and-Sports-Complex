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
      })),
      ...clients.map((c) => ({
        id: `CLT-${c.clientId}`,
        type: "client",
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

    if (data.roleType === "staff") {
      const staff = await prisma.staff.create({
        data: {
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

    if (!userId || !status) {
      return NextResponse.json(
        { error: "userId and new status are required" },
        { status: 400 }
      );
    }

    const prefix = userId.split("-")[0];
    const id = parseInt(userId.split("-")[1], 10);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    if (prefix === "STF") {
      await prisma.staff.update({
        where: { staffId: id },
        data: { status: status },
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
  } catch (error) {
    console.error("Failed to update user status:", error);
    return NextResponse.json(
      { error: "Failed to update user status" },
      { status: 500 }
    );
  }
}