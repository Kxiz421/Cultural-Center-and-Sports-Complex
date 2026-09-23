import prisma from "@/lib/prisma";
import { formatAnnouncementBody } from "@/lib/panel-notifications";

/**
 * Domain helpers for the admin Announcements module.
 *
 * An announcement is stored once in `Announcement` (history / auditing) and
 * fanned out as one `Notification` row per recipient, always typed
 * `ANNOUNCEMENT_NOTIFICATION_TYPE` so each panel inbox can label and filter it
 * as an announcement.
 *
 * Recipient direction follows the existing convention documented in
 * `lib/coordinator-notifications.js`:
 *   - client-facing row  -> `clientId` = recipient, `staffId` = sender
 *   - staff-targeted row -> `staffId`  = recipient, `clientId` = NULL
 */

/** Stored on every announcement fan-out row - drives the inbox badge/filter. */
export const ANNOUNCEMENT_NOTIFICATION_TYPE = "Announcement";

/** `AnnouncementStatus` seed ids. */
export const ANNOUNCEMENT_STATUS = {
  ACTIVE: 1,
  ARCHIVED: 2,
};

/** Client role id (`ClientRole` table) for provincial agencies. */
const CLIENT_ROLE_PROVINCIAL = "PROV";

/** Staff role names (`StaffRole` table). */
const STAFF_ROLE_COORDINATOR = "Program Coordinator";
const STAFF_ROLE_ACCOUNTING_CLERK = "Accounting Clerk";
const STAFF_ROLE_TREASURY_OFFICER = "Local Treasury Operations Officer";

/**
 * Selectable recipient groups. `id` is the value POSTed by the admin UI and the
 * order here is the order rendered in the dialog.
 */
export const ANNOUNCEMENT_ROLES = [
  { id: "clients", label: "Clients" },
  { id: "provincial-agencies", label: "Provincial Agencies" },
  { id: "program-coordinators", label: "Program Coordinators" },
  { id: "accounting-clerks", label: "Accounting Clerks" },
  { id: "treasury-officers", label: "Treasury Officers" },
];

/** Every group id, used by the UI's "All" option. */
export const ANNOUNCEMENT_ALL_ROLE_IDS = ANNOUNCEMENT_ROLES.map(
  (role) => role.id
);

/** `Announcement.recipient_type` is varchar(50) - keep summaries short. */
const RECIPIENT_TYPE_MAX = 50;

function isKnownRole(roleId) {
  return ANNOUNCEMENT_ROLES.some((role) => role.id === roleId);
}

/** Coerce a POSTed id list into unique positive integers. */
function normalizeIds(values) {
  if (!Array.isArray(values)) return [];
  const ids = values
    .map((value) => Number.parseInt(String(value).replace(/^[A-Z]+-/, ""), 10))
    .filter((id) => Number.isInteger(id) && id > 0);
  return [...new Set(ids)];
}

/** Active clients belonging to the given recipient groups. */
function clientFiltersForRoles(roleIds) {
  const filters = [];
  if (roleIds.includes("clients")) {
    filters.push({
      accountStatus: "Active",
      clientRoleId: { not: CLIENT_ROLE_PROVINCIAL },
    });
  }
  if (roleIds.includes("provincial-agencies")) {
    filters.push({
      accountStatus: "Active",
      clientRoleId: CLIENT_ROLE_PROVINCIAL,
    });
  }
  return filters;
}

/** Active staff role names belonging to the given recipient groups. */
function staffRoleNamesForRoles(roleIds) {
  const roleNames = [];
  if (roleIds.includes("program-coordinators")) {
    roleNames.push(STAFF_ROLE_COORDINATOR);
  }
  if (roleIds.includes("accounting-clerks")) {
    roleNames.push(STAFF_ROLE_ACCOUNTING_CLERK);
  }
  if (roleIds.includes("treasury-officers")) {
    roleNames.push(STAFF_ROLE_TREASURY_OFFICER);
  }
  return roleNames;
}

/**
 * Live recipient head-count per group, for the picker in the admin UI.
 * @returns {Promise<Array<{id: string, label: string, count: number}>>}
 */
export async function getAnnouncementRoleCounts() {
  const clientGroups = ANNOUNCEMENT_ROLES.filter(
    (role) => role.id === "clients" || role.id === "provincial-agencies"
  );
  const staffGroups = ANNOUNCEMENT_ROLES.filter(
    (role) =>
      role.id === "program-coordinators" ||
      role.id === "accounting-clerks" ||
      role.id === "treasury-officers"
  );

  const [clientCounts, staffCounts] = await Promise.all([
    Promise.all(
      clientGroups.map(async (role) => {
        const count = await prisma.client.count({
          where: { OR: clientFiltersForRoles([role.id]) },
        });
        return { id: role.id, count };
      })
    ),
    Promise.all(
      staffGroups.map(async (role) => {
        const count = await prisma.staff.count({
          where: {
            status: "Active",
            staffRole: { roleName: { in: staffRoleNamesForRoles([role.id]) } },
          },
        });
        return { id: role.id, count };
      })
    ),
  ]);

  const countsByRole = new Map(
    [...clientCounts, ...staffCounts].map((entry) => [entry.id, entry.count])
  );

  return ANNOUNCEMENT_ROLES.map((role) => ({
    ...role,
    count: countsByRole.get(role.id) ?? 0,
  }));
}

/**
 * Expand "groups + hand-picked users" into the concrete recipient id lists.
 *
 * @param {{roles?: string[], clientIds?: number[], staffIds?: number[]}} audience
 * @returns {Promise<{recipientClientIds: number[], recipientStaffIds: number[]}>}
 */
export async function resolveAnnouncementRecipients({
  roles = [],
  clientIds = [],
  staffIds = [],
} = {}) {
  const roleIds = [...new Set(roles.filter(isKnownRole))];
  const explicitClientIds = normalizeIds(clientIds);
  const explicitStaffIds = normalizeIds(staffIds);

  const clientFilters = clientFiltersForRoles(roleIds);
  const staffRoleNames = staffRoleNamesForRoles(roleIds);

  const [roleClients, roleStaff, pickedClients, pickedStaff] =
    await Promise.all([
      clientFilters.length
        ? prisma.client.findMany({
            where: { OR: clientFilters },
            select: { clientId: true },
          })
        : [],
      staffRoleNames.length
        ? prisma.staff.findMany({
            where: {
              status: "Active",
              staffRole: { roleName: { in: staffRoleNames } },
            },
            select: { staffId: true },
          })
        : [],
      explicitClientIds.length
        ? prisma.client.findMany({
            where: { clientId: { in: explicitClientIds } },
            select: { clientId: true },
          })
        : [],
      explicitStaffIds.length
        ? prisma.staff.findMany({
            where: { staffId: { in: explicitStaffIds } },
            select: { staffId: true },
          })
        : [],
    ]);

  const recipientClientIds = [
    ...new Set(
      [...roleClients, ...pickedClients].map((client) => client.clientId)
    ),
  ];
  const recipientStaffIds = [
    ...new Set([...roleStaff, ...pickedStaff].map((staff) => staff.staffId)),
  ];

  return { recipientClientIds, recipientStaffIds };
}

/** Short, human-readable `Announcement.recipient_type` summary. */
export function summarizeRecipientType(roles = []) {
  const roleIds = [...new Set(roles.filter(isKnownRole))];
  const labels = ANNOUNCEMENT_ROLES.filter((role) =>
    roleIds.includes(role.id)
  ).map((role) => role.label);

  if (labels.length === 0) return "Selected Users";
  if (labels.length === ANNOUNCEMENT_ROLES.length) return "All";

  const joined = labels.join(", ");
  if (joined.length <= RECIPIENT_TYPE_MAX) return joined;

  return `${labels.length} recipient groups`;
}

/**
 * The single message body stored on every fan-out notification row.
 * Delegates to the shared formatter so the stored labels always match the ones
 * the inbox parses back out for display.
 */
export function buildAnnouncementMessage(title, content) {
  return formatAnnouncementBody(title, content);
}

/**
 * Store the announcement and deliver it to every resolved recipient.
 *
 * @param {{
 *   title: string,
 *   content: string,
 *   roles?: string[],
 *   clientIds?: number[],
 *   staffIds?: number[],
 *   authorStaffId: number|string,
 * }} input
 * @returns {Promise<
 *   | {ok: false, error: string}
 *   | {ok: true, announcementId: number, recipientType: string,
 *      notificationCount: number, clientRecipientCount: number,
 *      staffRecipientCount: number}
 * >}
 */
export async function createAnnouncement({
  title,
  content,
  roles = [],
  clientIds = [],
  staffIds = [],
  authorStaffId,
}) {
  const authorId = Number.parseInt(
    String(authorStaffId ?? "").replace(/^[A-Za-z]+-/, ""),
    10
  );
  if (!Number.isInteger(authorId) || authorId <= 0) {
    return {
      ok: false,
      error: "Could not resolve the signed-in administrator.",
    };
  }

  const { recipientClientIds, recipientStaffIds } =
    await resolveAnnouncementRecipients({ roles, clientIds, staffIds });

  if (recipientClientIds.length === 0 && recipientStaffIds.length === 0) {
    return { ok: false, error: "No recipients matched the selected audience." };
  }

  const sentAt = new Date();
  const message = buildAnnouncementMessage(title, content);
  const recipientType = summarizeRecipientType(roles);

  const announcement = await prisma.announcement.create({
    data: {
      title,
      content,
      recipientType,
      datePosted: sentAt,
      staffId: authorId,
      statusId: ANNOUNCEMENT_STATUS.ACTIVE,
    },
  });

  const notificationRows = [
    ...recipientClientIds.map((clientId) => ({
      message,
      type: ANNOUNCEMENT_NOTIFICATION_TYPE,
      isRead: false,
      sentAt,
      staffId: authorId,
      clientId,
    })),
    ...recipientStaffIds.map((staffId) => ({
      message,
      type: ANNOUNCEMENT_NOTIFICATION_TYPE,
      isRead: false,
      sentAt,
      staffId,
      clientId: null,
    })),
  ];

  await prisma.notification.createMany({ data: notificationRows });

  return {
    ok: true,
    announcementId: announcement.announcementId,
    recipientType,
    notificationCount: notificationRows.length,
    clientRecipientCount: recipientClientIds.length,
    staffRecipientCount: recipientStaffIds.length,
  };
}
