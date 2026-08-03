const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    // 1. Check staff roles
    const roles = await prisma.staffRole.findMany();
    console.log("=== STAFF ROLES ===");
    console.log(roles);

    // 2. Find coordinators
    const coords = await prisma.staff.findMany({
      where: {
        staffRole: { roleName: { contains: "Coordinator" } },
      },
      select: {
        staffId: true,
        firstName: true,
        lastName: true,
        staffRole: { select: { roleName: true } },
      },
    });
    console.log("\n=== COORDINATORS ===");
    console.log(coords);

    // 3. Check recent notifications
    const notifs = await prisma.notification.findMany({
      take: 10,
      orderBy: { notificationId: "desc" },
    });
    console.log("\n=== RECENT NOTIFICATIONS (last 10) ===");
    console.log(
      notifs.map((n) => ({
        id: n.notificationId,
        message: n.message,
        staffId: n.staffId,
        clientId: n.clientId,
        type: n.type,
        isRead: n.isRead,
        sentAt: n.sentAt,
      }))
    );

    // 4. Check if any notifications exist for coordinator staff IDs
    if (coords.length > 0) {
      const coordIds = coords.map((c) => c.staffId);
      const coordNotifs = await prisma.notification.findMany({
        where: { staffId: { in: coordIds } },
        orderBy: { notificationId: "desc" },
        take: 20,
      });
      console.log("\n=== COORDINATOR NOTIFICATIONS ===");
      console.log(
        coordNotifs.map((n) => ({
          id: n.notificationId,
          message: n.message,
          staffId: n.staffId,
          clientId: n.clientId,
          type: n.type,
        }))
      );
    }

    // 5. Check reservations with "Walk-in client:" notes
    const walkInReservations = await prisma.reservation.findMany({
      where: { notes: { startsWith: "Walk-in client:" } },
      orderBy: { reservationId: "desc" },
      take: 5,
    });
    console.log("\n=== WALK-IN RESERVATIONS (last 5) ===");
    console.log(
      walkInReservations.map((r) => ({
        id: r.reservationId,
        clientId: r.clientId,
        eventType: r.eventType,
        eventDate: r.eventDate,
        notes: r.notes,
      }))
    );
  } catch (e) {
    console.error("ERROR:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();