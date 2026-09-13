import prisma from "@/lib/prisma";

/** Cultural Center venue IDs — program coordinator scope */
export const CULTURAL_CENTER_VENUE_IDS = [1];

/** Sports Complex venue IDs — program coordinator scope */
export const SPORTS_COMPLEX_VENUE_IDS = [2];

const CULTURAL_CENTER_ORG =
  "South Cotabato Gymnasium and Cultural Center";

const SPORTS_COMPLEX_ORG =
  "South Cotabato Sports Complex";

export function isCulturalCenterVenue(venueId) {
  return CULTURAL_CENTER_VENUE_IDS.includes(Number(venueId));
}

export function isSportsComplexVenue(venueId) {
  return SPORTS_COMPLEX_VENUE_IDS.includes(Number(venueId));
}

export async function getCulturalCenterCoordinatorStaffIds() {
  const coordinators = await prisma.staff.findMany({
    where: {
      status: "Active",
      staffRole: { roleName: "Program Coordinator" },
      staffOrg: { orgName: CULTURAL_CENTER_ORG },
    },
    select: { staffId: true },
  });

  if (coordinators.length > 0) {
    return coordinators.map((c) => c.staffId);
  }

  // Fallback: seed coordinator is typically staff_id 2
  return [2];
}

export async function getSportsComplexCoordinatorStaffIds() {
  const coordinators = await prisma.staff.findMany({
    where: {
      status: "Active",
      staffRole: { roleName: "Program Coordinator" },
      staffOrg: { orgName: SPORTS_COMPLEX_ORG },
    },
    select: { staffId: true },
  });

  if (coordinators.length > 0) {
    return coordinators.map((c) => c.staffId);
  }

  // Fallback: seed sports complex coordinator is typically staff_id 5
  return [5];
}

/** Required sender FK for client-facing inbox rows (admin / system). */
export const SYSTEM_NOTIFICATION_STAFF_ID = 1;

/** Client-facing inbox message. Do not use a coordinator staffId here. */
export async function createClientNotification({ clientId, message, type }) {
  if (!clientId || !message) return;
  await prisma.notification.create({
    data: {
      clientId: Number(clientId),
      staffId: SYSTEM_NOTIFICATION_STAFF_ID,
      message,
      type: type || "General",
      sentAt: new Date(),
    },
  });
}

/**
 * Create inbox notifications for Cultural Center program coordinator(s).
 * Notification.staffId is the recipient; clientId is the related client.
 */
export async function notifyCulturalCenterCoordinators({
  message,
  type,
  clientId,
}) {
  if (!clientId || !message) return;

  try {
    const staffIds = await getCulturalCenterCoordinatorStaffIds();
    await prisma.notification.createMany({
      data: staffIds.map((staffId) => ({
        message,
        type: type || "General",
        staffId,
        clientId: Number(clientId),
        sentAt: new Date(),
      })),
    });
  } catch (err) {
    console.error("Failed to notify program coordinator(s):", err);
  }
}

/**
 * Create inbox notifications for Sports Complex program coordinator(s).
 * Notification.staffId is the recipient; clientId is the related client.
 */
export async function notifySportsComplexCoordinators({
  message,
  type,
  clientId,
}) {
  if (!clientId || !message) return;

  try {
    const staffIds = await getSportsComplexCoordinatorStaffIds();
    await prisma.notification.createMany({
      data: staffIds.map((staffId) => ({
        message,
        type: type || "General",
        staffId,
        clientId: Number(clientId),
        sentAt: new Date(),
      })),
    });
  } catch (err) {
    console.error("Failed to notify sports complex coordinator(s):", err);
  }
}
