import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import prisma from "@/lib/prisma";
import {
  getClientIP,
  checkLoginRateLimit,
  recordFailedLogin,
  clearLoginAttempts,
} from "@/lib/rate-limit";

export const dynamic = "force-dynamic";


export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email/Username and password are required" },
        { status: 400 }
      );
    }

    // ----- Rate-limit check (by IP) -----
    const ip = getClientIP(request);
    const check = checkLoginRateLimit(ip);
    if (!check.allowed) {
      const minutes = Math.ceil(check.retryAfter / 60);
      return NextResponse.json(
        {
          error: `Too many failed login attempts. Please try again in ${minutes} minute${minutes > 1 ? "s" : ""}.`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(check.retryAfter) },
        }
      );
    }

    // Try to find a staff member by email or username
    let staff = await prisma.staff.findUnique({
      where: { email: email },
      include: { staffRole: true, staffOrg: true },
    });

    if (!staff) {
      staff = await prisma.staff.findUnique({
        where: { username: email },
        include: { staffRole: true, staffOrg: true },
      });
    }

      if (staff) {
        const passwordValid = await bcrypt.compare(password, staff.password);
        if (!passwordValid) {
          recordFailedLogin(ip);
          return NextResponse.json(
            { error: "Invalid email/username or password" },
            { status: 401 }
          );
        }

        // Successful staff login → clear failed attempts
        clearLoginAttempts(ip);

        // Determine user type: differentiate Program Coordinator by organization
        let userType = staff.staffRole.roleName.toLowerCase();
        if (staff.staffRole.roleName === "Program Coordinator") {
          // staffOrgId 1 = Sports Complex, staffOrgId 2 = Cultural Center
          userType = staff.staffOrgId === 1 ? "program coordinator sports" : "program coordinator cultural";
        }

        return NextResponse.json({
          id: `STF-${staff.staffId}`,
          type: userType,
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
        recordFailedLogin(ip);
        return NextResponse.json(
          { error: "Invalid email/username or password" },
          { status: 401 }
        );
      }

      if (client.accountStatus === "Deactivated") {
        // Deactivated → still a "wrong" outcome for the user, record it
        recordFailedLogin(ip);
        return NextResponse.json(
          { error: "Your account has been deactivated. Contact the administrator." },
          { status: 403 }
        );
      }

      if (client.verificationStatus === "Declined") {
        const remarksText = client.remarks
          ? ` Reason: ${client.remarks}`
          : "";
        // Declined verification → wrong outcome, record it
        recordFailedLogin(ip);
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
        // Pending → wrong outcome, record it
        recordFailedLogin(ip);
        return NextResponse.json(
          { error: "Your registration is still pending verification. Please wait for admin approval." },
          { status: 403 }
        );
      }

      // All checks passed → successful login
      clearLoginAttempts(ip);

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

    // No user found at all
    recordFailedLogin(ip);
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
