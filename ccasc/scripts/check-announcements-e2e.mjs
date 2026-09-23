/**
 * End-to-end check for the admin Announcements module against a running server.
 *
 * SAFETY: this script never modifies an existing account. It creates its own
 * throwaway Admin staff row, signs in with it, exercises posting by role / by
 * individual, the history feed, the fan-out landing in an inbox, and
 * archive/restore - then deletes every row it created (notifications,
 * announcements, and the throwaway account) before exit.
 *
 * Usage:
 *   1. npx next build && npx next start -p 3123
 *   2. node --env-file=.env scripts/check-announcements-e2e.mjs
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const BASE = process.env.CHECK_BASE_URL || "http://localhost:3123";
const runId = Date.now();
const CHECK_PASSWORD = "AnnouncementCheck!2026";
const CHECK_EMAIL = `announcement-check-${runId}@local.test`;
const CHECK_USERNAME = `announcement.check.${runId}`;

const prisma = new PrismaClient();
const jar = new Map();

function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

function storeCookies(response) {
  const raw = response.headers.getSetCookie?.() ?? [];
  for (const cookie of raw) {
    const [pair] = cookie.split(";");
    const index = pair.indexOf("=");
    if (index > 0) jar.set(pair.slice(0, index).trim(), pair.slice(index + 1));
  }
}

async function api(path, init = {}) {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    redirect: "manual",
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(jar.size ? { cookie: cookieHeader() } : {}),
      ...(init.headers || {}),
    },
  });
  storeCookies(response);
  const text = await response.text();
  let body = text;
  try {
    body = JSON.parse(text);
  } catch {
    /* non-JSON response */
  }
  return { status: response.status, body };
}

async function signIn(identifier, password) {
  const csrf = await api("/api/auth/csrf");
  const form = new URLSearchParams({
    csrfToken: csrf.body.csrfToken,
    email: identifier,
    password,
    callbackUrl: `${BASE}/panel/admin/dashboard`,
  });
  const response = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      cookie: cookieHeader(),
    },
    body: form.toString(),
  });
  storeCookies(response);
  const session = await api("/api/auth/session");
  return session.body?.user ?? null;
}

let checkStaffId = null;
const createdAnnouncementIds = [];
const marker = `__e2e_announcement_${runId}__`;

/** The Railway proxy drops connections now and then - retry a few times. */
async function db(label, fn, attempts = 6) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === attempts) throw err;
      console.warn(`  (db ${label} attempt ${attempt} failed; retrying)`);
      await prisma.$disconnect().catch(() => {});
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
  return undefined;
}

function assert(condition, label, detail) {
  if (condition) {
    console.log(`  PASS  ${label}`);
  } else {
    console.log(
      `  FAIL  ${label}${detail ? ` -> ${JSON.stringify(detail)}` : ""}`
    );
    process.exitCode = 1;
  }
}

async function cleanup() {
  try {
    await db("cleanup notifications", () =>
      prisma.notification.deleteMany({
        where: { message: { contains: marker } },
      })
    );
    if (createdAnnouncementIds.length) {
      await db("cleanup announcements", () =>
        prisma.announcement.deleteMany({
          where: { announcementId: { in: createdAnnouncementIds } },
        })
      );
    }
    if (checkStaffId) {
      // Announcements/notifications referencing this row are already gone, so
      // the throwaway Admin account can be removed without touching real data.
      await db("cleanup check account", () =>
        prisma.staff.delete({ where: { staffId: checkStaffId } })
      );
      console.log("removed the throwaway check account");
    }
  } catch (err) {
    console.error("cleanup failed:", err.message);
  }
}

async function main() {
  const adminRole = await db("find admin role", () =>
    prisma.staffRole.findFirst({ where: { roleName: "Admin" } })
  );
  const org = await db("find staff org", () =>
    prisma.staffOrganization.findFirst()
  );
  if (!adminRole || !org) {
    throw new Error("StaffRole/StaffOrganization seed data is missing");
  }

  // A dedicated throwaway account - no existing account is ever modified.
  const check = await db("create check account", async () => {
    const hashed = await bcrypt.hash(CHECK_PASSWORD, 12);
    return prisma.staff.create({
      data: {
        firstName: "Announcement",
        lastName: "Check",
        email: CHECK_EMAIL,
        username: CHECK_USERNAME,
        contactNumber: "00000000000",
        password: hashed,
        status: "Active",
        staffRoleId: adminRole.roleId,
        staffOrgId: org.staffOrgId,
      },
      select: { staffId: true },
    });
  });
  checkStaffId = check.staffId;

  const user = await signIn(CHECK_EMAIL, CHECK_PASSWORD);
  console.log("=== Session ===");
  console.log(`  signed in as ${CHECK_EMAIL} (type: ${user?.type})`);
  assert(user?.type === "admin", "session type is admin");
  assert(user?.userId === `STF-${checkStaffId}`, "session maps to the check account");

  console.log("\n=== Recipient groups ===");
  const recipients = await api("/api/admin/announcements/recipients");
  assert(recipients.status === 200, "GET recipients returns 200", recipients);
  const roles = recipients.body?.roles ?? [];
  assert(roles.length > 0, "recipient groups returned", roles);
  console.log(`  ${roles.map((r) => `${r.id}:${r.count}`).join(", ")}`);

  const client = await db("find client", () =>
    prisma.client.findFirst({
      where: { accountStatus: "Active" },
      select: { clientId: true },
    })
  );
  const otherStaff = await db("find staff", () =>
    prisma.staff.findFirst({
      where: { status: "Active", staffId: { not: checkStaffId } },
      select: { staffId: true },
    })
  );

  console.log("\n=== Post to selected individuals ===");
  const individual = await api("/api/admin/announcements", {
    method: "POST",
    body: JSON.stringify({
      title: `${marker} individual`,
      message: "End-to-end check: individual delivery.",
      clientIds: [client.clientId],
      staffIds: [otherStaff.staffId],
    }),
  });
  assert(individual.status === 201, "POST individuals returns 201", individual);
  assert(
    individual.body?.notified === 2,
    "two notifications created (1 client + 1 staff)",
    individual.body
  );
  createdAnnouncementIds.push(individual.body?.id);
  createdAnnouncementIds.length = createdAnnouncementIds.filter(Boolean).length;

  console.log("\n=== Post by role ===");
  const byRole = await api("/api/admin/announcements", {
    method: "POST",
    body: JSON.stringify({
      title: `${marker} role`,
      message: "End-to-end check: role broadcast.",
      roles: ["clients"],
    }),
  });
  assert(byRole.status === 201, "POST by role returns 201", byRole);
  createdAnnouncementIds.push(byRole.body?.id);
  createdAnnouncementIds.length = createdAnnouncementIds.filter(Boolean).length;

  const expectedClients = roles.find((r) => r.id === "clients")?.count ?? 0;
  assert(
    byRole.body?.notified === expectedClients,
    `role broadcast notified all ${expectedClients} clients`,
    byRole.body
  );

  console.log("\n=== History ===");
  const history = await api("/api/admin/announcements");
  assert(history.status === 200, "GET history returns 200", history);
  const posted = history.body.find((row) => row.id === individual.body.id);
  assert(!!posted, "new announcement appears in history", posted);
  assert(posted?.notified === 2, "history shows the notified count", posted);
  assert(posted?.authorName?.length > 0, "history shows the author", posted);

  console.log("\n=== Notification lands in the inbox as an announcement ===");
  const inbox = await api(`/api/notifications?clientId=${client.clientId}`);
  // Both announcements share the marker, so match the individual one exactly.
  const delivered = (inbox.body ?? []).find((n) =>
    String(n.message).includes(`${marker} individual`)
  );
  assert(!!delivered, "client inbox contains the announcement", delivered);
  assert(
    String(delivered?.type).toLowerCase() === "announcement",
    "notification type is Announcement",
    delivered?.type
  );

  const deliveredBody = String(delivered?.message ?? "");
  assert(
    deliveredBody.startsWith("Title : ") &&
      deliveredBody.includes("\n\nMessage : "),
    "body stores title and message under separate labels",
    deliveredBody
  );
  assert(
    deliveredBody.includes(`${marker} individual`),
    "body keeps the announcement title",
    deliveredBody
  );

  console.log("\n=== Archive / restore ===");
  const archived = await api("/api/admin/announcements", {
    method: "PUT",
    body: JSON.stringify({
      announcementId: individual.body.id,
      action: "archive",
    }),
  });
  assert(archived.status === 200, "PUT archive returns 200", archived);

  const afterArchive = await api("/api/admin/announcements");
  const row = afterArchive.body.find((r) => r.id === individual.body.id);
  assert(row?.archived === true, "announcement is archived", row);
  assert(row?.status === "Archived", "status label is Archived", row?.status);

  const restored = await api("/api/admin/announcements", {
    method: "PUT",
    body: JSON.stringify({
      announcementId: individual.body.id,
      action: "restore",
    }),
  });
  assert(restored.status === 200, "PUT restore returns 200", restored);

  console.log("\n=== Validation ===");
  const empty = await api("/api/admin/announcements", {
    method: "POST",
    body: JSON.stringify({ title: "", message: "", roles: ["clients"] }),
  });
  assert(empty.status === 400, "empty title/message rejected", empty);

  const noRecipients = await api("/api/admin/announcements", {
    method: "POST",
    body: JSON.stringify({
      title: `${marker} nobody`,
      message: "should be rejected",
      roles: [],
    }),
  });
  assert(noRecipients.status === 400, "empty audience rejected", noRecipients);

  console.log("\n=== Unauthenticated access ===");
  const anon = await fetch(`${BASE}/api/admin/announcements`, {
    redirect: "manual",
  });
  assert(anon.status === 401, "anonymous request is rejected", anon.status);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

