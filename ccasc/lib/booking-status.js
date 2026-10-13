import prisma from "@/lib/prisma";

/**
 * Booking status ids, resolved by name.
 *
 * `BookingStatus` rows are auto-incremented, so the numeric ids are only stable
 * for the seed's insertion order - and several call sites had guessed them
 * wrong (writing "2" while meaning "Confirmed", which the seed names
 * "Cancelled"). Always resolve the id for a status name here instead of
 * hard-coding a number.
 */

export const BOOKING_STATUS = {
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
  PENDING: "Pending",
};

/** The id of a booking status by name, or null when it does not exist. */
export async function getBookingStatusId(name) {
  const row = await prisma.bookingStatus.findFirst({
    where: { status: name },
    select: { bookingStatusId: true },
  });
  return row?.bookingStatusId ?? null;
}

/** All booking status ids keyed by name, e.g. `{ Confirmed: 1, ... }`. */
export async function getBookingStatusIds() {
  const rows = await prisma.bookingStatus.findMany({
    select: { bookingStatusId: true, status: true },
  });
  const ids = {};
  for (const row of rows) ids[row.status] = row.bookingStatusId;
  return ids;
}
