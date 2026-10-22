import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { toE164Ph } from "@/lib/phone";
import {
  REGISTER_CHANNEL,
  clearRegistrationVerifications,
  isRegistrationTargetVerified,
} from "@/lib/register-otp";

const ALLOWED_GENDERS = ["Male", "Female", "Other"];

/** Parse a "YYYY-MM-DD" birthday into a Date, or null when invalid/absent. */
function parseBirthday(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  if (date > new Date()) return null; // no future birthdays
  return date;
}

export async function POST(request) {
  try {
    const {
      firstName,
      middleName,
      lastName,
      username,
      email,
      contactNumber,
      password,
      organizationId,
      otherOrganization,
      idProof,
      gender,
      birthday,
      addressLine,
      province,
      city,
      barangay,
    } = await request.json();

    // Validate required fields
    if (!firstName || !lastName || !email || !password) {
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

    // Mobile number is required and must be a valid PH mobile.
    if (!toE164Ph(contactNumber)) {
      return NextResponse.json(
        { error: "Enter a valid mobile number (e.g., 09171234567)." },
        { status: 400 }
      );
    }

    // Personal details collected at registration.
    if (!ALLOWED_GENDERS.includes(gender)) {
      return NextResponse.json(
        { error: "Please select your gender." },
        { status: 400 }
      );
    }
    if (!parseBirthday(birthday)) {
      return NextResponse.json(
        { error: "Please enter a valid birthday." },
        { status: 400 }
      );
    }
    if (!String(addressLine ?? "").trim()) {
      return NextResponse.json(
        { error: "Please enter your street address." },
        { status: 400 }
      );
    }
    if (!String(province ?? "").trim() || !String(city ?? "").trim() || !String(barangay ?? "").trim()) {
      return NextResponse.json(
        { error: "Please complete your province, city/municipality, and barangay." },
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
    if (!/[A-Z]/.test(password)) {
      return NextResponse.json(
        { error: "Password must contain at least one uppercase letter" },
        { status: 400 }
      );
    }
    if (!/[a-z]/.test(password)) {
      return NextResponse.json(
        { error: "Password must contain at least one lowercase letter" },
        { status: 400 }
      );
    }
    if (!/[0-9]/.test(password)) {
      return NextResponse.json(
        { error: "Password must contain at least one number" },
        { status: 400 }
      );
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      return NextResponse.json(
        { error: "Password must contain at least one special character (e.g., @, #, $)" },
        { status: 400 }
      );
    }

    // Use provided username or generate from email prefix
    const finalUsername = username
      ? username.toLowerCase().replace(/[^a-z0-9._-]/g, "")
      : email.split("@")[0].toLowerCase().replace(/[^a-z0-9._-]/g, "");

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
    if (finalUsername) {
      const [existingStaffUser, existingClientUser] = await Promise.all([
        prisma.staff.findUnique({ where: { username: finalUsername } }),
        prisma.client.findUnique({ where: { username: finalUsername } }),
      ]);
      if (existingStaffUser || existingClientUser) {
        return NextResponse.json(
          { error: "This username is already taken. Please choose a different one." },
          { status: 409 }
        );
      }
    }

    // Both the email and the mobile number must have been verified with a
    // one-time code before the account can be created (and therefore before
    // the registrant can ever sign in).
    const [emailVerified, phoneVerified] = await Promise.all([
      isRegistrationTargetVerified(REGISTER_CHANNEL.EMAIL, email),
      isRegistrationTargetVerified(REGISTER_CHANNEL.SMS, contactNumber),
    ]);
    if (!emailVerified || !phoneVerified) {
      return NextResponse.json(
        {
          error:
            "Please verify both your email address and mobile number before registering.",
        },
        { status: 400 }
      );
    }

    // Handle organization: a typed custom name gets its own org row (dedupe
    // case-insensitively); no shared generic "Other" bucket is created.
    let orgId;
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
      // MySQL's utf8mb4_unicode_ci collation already matches case-insensitively,
      // so a plain `equals` dedupes "acme" / "ACME" (Prisma's `mode` argument is
      // not supported by the MySQL connector).
      let existingOrg = await prisma.clientOrganization.findFirst({
        where: { organizationName: { equals: typedName } },
      });
      if (!existingOrg) {
        existingOrg = await prisma.clientOrganization.create({
          data: { organizationName: typedName, isCustom: true },
        });
      }
      orgId = existingOrg.clientOrgId;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create client
    const client = await prisma.client.create({
      data: {
        username: finalUsername,
        firstName,
        middleName: middleName || null,
        lastName,
        email,
        contactNumber,
        password: hashedPassword,
        idProof: idProof || null,
        gender,
        birthday: parseBirthday(birthday),
        addressLine: String(addressLine).trim(),
        province: String(province).trim(),
        city: String(city).trim(),
        barangay: String(barangay).trim(),
        accountStatus: "Pending",
        verificationStatus: "Pending",
        clientRoleId: "PUB",
        clientOrgId: orgId,
      },
    });

    // Spend the verification codes now that the account exists.
    await clearRegistrationVerifications(email, contactNumber);

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
