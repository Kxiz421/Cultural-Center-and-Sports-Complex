const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  const bookings = await p.booking.findMany({
    where: { venueId: null },
    include: { reservation: true },
  });
  for (const b of bookings) {
    await p.booking.update({
      where: { bookingId: b.bookingId },
      data: { venueId: b.reservation.venueId },
    });
  }
  console.log("Backfilled " + bookings.length + " bookings with venueId");
  await p.$disconnect();
})();