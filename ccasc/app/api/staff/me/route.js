import { NextResponse } from "next/server";

import { noCacheJson } from "@/lib/api-cache-control";
import prisma from "@/lib/prisma";
import { requireApiAuth, actingAs } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

/** The signed-in staff row's id, from the `STF-<id>` session userId. */
function staffIdFromUser(user) {
  const raw = String(user?.userId ?? "");
  if (!raw.startsWith("STF-")) return null;
  const id = parseInt(raw.slice(4), 10);
  return Number.isInteger(id) ? id : null;
}

/** The signed-in staff member's own profile. */
async function loadProfile(staffId) {
  const staff = await prisma.staff.findUnique({
    where: { staffId },
    select: {
      staffId: true,
      username: true,
      firstName: true,
      middleName: true,
      lastName: true,
      email: true,
      contactNumber: true,
      gender: true,
      birthday: true,
      addressLine: true,
      barangay: true,
      city: true,
      province: true,
      profilePhoto: true,
      status: true,
      createdAt: true,
      staffRole: { select: { roleName: true } },
      staffOrg: { select: { orgName: true } },
    },
  });
  if (!staff) return null;

  return {
    staffId: staff.staffId,
    username: staff.username,
    firstName: staff.firstName,
    middleName: staff.middleName,
    lastName: staff.lastName,
    fullName:
      [staff.firstName, staff.middleName, staff.lastName]
        .filter(Boolean)
        .join(" ") || "",
    email: staff.email,
    contactNumber: staff.contactNumber,
    gender: staff.gender,
    birthday: staff.birthday,
    addressLine: staff.addressLine,
    barangay: staff.barangay,
    city: staff.city,
    province: staff.province,
    profilePhoto: staff.profilePhoto,
    roleName: staff.staffRole?.roleName || null,
    organization: staff.staffOrg?.orgName || null,
    status: staff.status,
    createdAt: staff.createdAt,
  };
}

export async function GET() {
  const guard = await requireApiAuth();
  if (guard.response) return guard.response;

  const staffId = staffIdFromUser(guard.user);
  if (staffId == null) {
    return noCacheJson({ error: "Not a staff account" }, { status: 403 });
  }

  try {
    const profile = await loadProfile(staffId);
    if (!profile) {
      return noCacheJson({ error: "Staff not found" }, { status: 404 });
    }
    return noCacheJson(profile);
  } catch (error) {
    console.error("Failed to load staff profile:", error);
    return noCacheJson(
      { error: "Failed to load staff profile" },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  const guard = await requireApiAuth();
  if (guard.response) return guard.response;

  const staffId = staffIdFromUser(guard.user);
  if (staffId == null) {
    return NextResponse.json({ error: "Not a staff account" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const existing = await prisma.staff.findUnique({ where: { staffId } });
    if (!existing) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    const data = {};
    const changedLabels = [];

    if (body.contactNumber !== undefined) {
      const digits = String(body.contactNumber ?? "")
        .replace(/\D/g, "")
        .slice(0, 11);
      if (digits.length !== 11) {
        return NextResponse.json(
          { error: "Contact number must be exactly 11 digits." },
          { status: 400 }
        );
      }
      if (digits !== existing.contactNumber) {
        data.contactNumber = digits;
        changedLabels.push("contact number");
      }
    }

    if (body.profilePhoto !== undefined) {
      const raw = String(body.profilePhoto ?? "").trim();
      if (raw) {
        const validUrl = /^https?:\/\//i.test(raw) || raw.startsWith("/uploads/");
        if (!validUrl) {
          return NextResponse.json(
            { error: "Invalid profile photo URL." },
            { status: 400 }
          );
        }
        if (raw.length > 255) {
          return NextResponse.json(
            { error: "Profile photo URL is too long." },
            { status: 400 }
          );
        }
        if (raw !== existing.profilePhoto) {
          data.profilePhoto = raw;
          changedLabels.push("profile photo");
        }
      } else if (existing.profilePhoto) {
        data.profilePhoto = null;
        changedLabels.push("profile photo");
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No changes to save." }, { status: 400 });
    }

    await prisma.staff.update({ where: { staffId }, data });

    const acting = actingAs(guard.user);
    await prisma.auditLog.create({
      data: {
        action: "STAFF_PROFILE_UPDATED",
        targetUserId: `STF-${staffId}`,
        targetName: `${existing.firstName} ${existing.lastName}`.trim(),
        performedById: acting.performedBy,
        performedByName: acting.performedByName,
        details: `Staff updated their profile: ${changedLabels.join(", ")}.`,
      },
    });

    const profile = await loadProfile(staffId);
    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error("Staff profile update error:", error);
    return NextResponse.json(
      { error: "Failed to update your profile" },
      { status: 500 }
    );
  }
}
