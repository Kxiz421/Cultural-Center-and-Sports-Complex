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
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Parse a "YYYY-MM-DD" birthday into a Date, or null when invalid/absent. */
function parseBirthday(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  if (date > new Date()) return null; // no future birthdays
  return date;
}

function sanitizeUsername(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "");
}

async function usernameTaken(candidate) {
  const [staff, client] = await Promise.all([
    prisma.staff.findUnique({
      where: { username: candidate },
      select: { staffId: true },
    }),
    prisma.client.findUnique({
      where: { username: candidate },
      select: { clientId: true },
    }),
  ]);
  return Boolean(staff || client);
}

export async function POST(request) {
  try {
    const {
      firstName,
      middleName,
      lastName,
      username,
      email: rawEmail,
      contactNumber: rawPhone,
      password,
      organizationId,
      otherOrganization,
      gender,
      birthday,
      addressLine,
      province,
      city,
      barangay,
      idProof: rawIdProof,
      verifiedChannel,
    } = await request.json();

    const email = String(rawEmail ?? "").trim() || null;
    const contactNumber = String(rawPhone ?? "").trim() || null;
    const idProof = String(rawIdProof ?? "").trim() || null;

    // Validate required fields
    if (!firstName || !lastName || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // The client fills at least one contact and verifies that one.
    if (!email && !contactNumber) {
      return NextResponse.json(
        { error: "Enter either an email address or a mobile number." },
        { status: 400 }
      );
    }

    if (!organizationId && !otherOrganization) {
      return NextResponse.json(
        { error: "Please select or enter an organization" },
        { status: 400 }
      );
    }

    // Validate email format (only when one was given)
    if (email && !EMAIL_RE.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Mobile number must be a valid PH mobile when one was given.
    if (contactNumber && !toE164Ph(contactNumber)) {
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

    // Check for duplicate email in both staff and client tables (skipped when
    // no email was given).
    if (email) {
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
    }

    // Resolve a unique username. A typed one must be free; a generated one may
    // take a numeric suffix so registration still succeeds.
    const providedUsername = sanitizeUsername(username).slice(0, 90);
    const generatedBase =
      providedUsername ||
      (email ? sanitizeUsername(email.split("@")[0]) : "") ||
      (contactNumber ? `user${contactNumber.replace(/\D/g, "").slice(-6)}` : "") ||
      "client";
    let finalUsername = generatedBase.slice(0, 90) || "client";

    if (await usernameTaken(finalUsername)) {
      if (providedUsername) {
        return NextResponse.json(
          { error: "This username is already taken. Please choose a different one." },
          { status: 409 }
        );
      }
      let resolved = false;
      for (let attempt = 0; attempt < 5 && !resolved; attempt += 1) {
        const candidate = `${finalUsername}${Math.floor(1000 + Math.random() * 9000)}`.slice(0, 100);
        if (!(await usernameTaken(candidate))) {
          finalUsername = candidate;
          resolved = true;
        }
      }
      if (!resolved) {
        return NextResponse.json(
          { error: "We couldn't set up a username automatically. Please choose one." },
          { status: 409 }
        );
      }
    }

    // The registrant chooses ONE contact channel (email or SMS) and proves it
    // with a one-time code; that chosen contact must be verified before the
    // account can be created.
    const channel =
      verifiedChannel === REGISTER_CHANNEL.SMS
        ? REGISTER_CHANNEL.SMS
        : verifiedChannel === REGISTER_CHANNEL.EMAIL
          ? REGISTER_CHANNEL.EMAIL
          : null;
    if (!channel) {
      return NextResponse.json(
        { error: "Choose whether to verify by email or mobile number." },
        { status: 400 }
      );
    }
    const target = channel === REGISTER_CHANNEL.SMS ? contactNumber : email;
    if (!target) {
      return NextResponse.json(
        {
          error:
            channel === REGISTER_CHANNEL.SMS
              ? "Enter a mobile number to verify."
              : "Enter an email address to verify.",
        },
        { status: 400 }
      );
    }
    const verified = await isRegistrationTargetVerified(channel, target);
    if (!verified) {
      return NextResponse.json(
        {
          error:
            channel === REGISTER_CHANNEL.SMS
              ? "Please verify your mobile number before registering."
              : "Please verify your email address before registering.",
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
        idProof,
        gender,
        birthday: parseBirthday(birthday),
        addressLine: String(addressLine).trim(),
        province: String(province).trim(),
        city: String(city).trim(),
        barangay: String(barangay).trim(),
        // No admin verification step: a registrant can sign in as soon as the
        // account exists (only archiving/deactivation blocks access).
        accountStatus: "Active",
        verificationStatus: "Verified",
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
        username: finalUsername,
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
