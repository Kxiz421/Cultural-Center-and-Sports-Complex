import prisma from "@/lib/prisma";
import { noCacheJson } from "@/lib/api-cache-control";
import { resolvePeriodRange } from "@/lib/report-period";
import { buildActivitiesReport, buildActivityRows } from "@/lib/report-activities";
import { isReservationReportEligible } from "@/lib/report-eligibility";
import {
  resolveReportVenueIds,
  venueIdsFromReportVenue,
} from "@/lib/report-venue-scope";

import { requireApiAuth } from "@/lib/api-auth";
export const dynamic = "force-dynamic";

/**
 * GET /api/reports/activities
 *
 * One endpoint behind every "Report Generation" screen so that Admin,
 * Accounting Clerk, Local Treasury Officer and Program Coordinator all render
 * the identical LIST OF SCGCC ACTIVITIES document.
 *
 * Query params
 *   period  m | w | y | r        (default: m)
 *   year    4-digit year         (default: current year)
 *   month   0-11                 (used by m and w)
 *   week    1-5                  (used by w)
 *   from / to  YYYY-MM-DD        (used by r - Custom Range)
 *   venue   all | sports | cultural
 *   venueIds  comma separated ids - narrows the report to those venues
 *
 * Venue scoping: a Program Coordinator only ever reports on their own venue
 * (Cultural Center or Sports Complex). `resolveReportVenueIds` derives that
 * from the signed session, so neither a hand-edited URL nor a stale panel can
 * widen a coordinator's report.
 *
 * Receipt / OR numbers are intentionally never selected or returned.
 */
const EXCLUDED_STATUSES = ["Cancelled", "Declined"];

export async function GET(request) {
  const guard = await requireApiAuth(["admin","accounting clerk","local treasury operations officer","program coordinator cultural","program coordinator sports"]);
  if (guard.response) return guard.response;

  try {
    // STEP 1 — Read the choices made on the report screen (period and venue).
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "m";
    const venue = searchParams.get("venue") || "all";
    // STEP 2 — Turn those choices into a single start and end date.
    const range = resolvePeriodRange({
      period,
      year: searchParams.get("year"),
      month: searchParams.get("month"),
      week: searchParams.get("week"),
      from: searchParams.get("from"),
      to: searchParams.get("to"),
    });

    // STEP 3 — Build the database filter (the date window plus the statuses we
    // never report) and narrow it to the venues this user is allowed to see.
    const where = {
      eventDate: { gte: range.startDate, lte: range.endDate },
      reservationStatus: { notIn: EXCLUDED_STATUSES },
    };

    const requestedVenueIds = (searchParams.get("venueIds") || "")
      .split(",")
      .map((v) => parseInt(v, 10))
      .filter((v) => Number.isInteger(v));
    const venueIds = requestedVenueIds.length
      ? requestedVenueIds
      : venueIdsFromReportVenue(venue);
    const scope = resolveReportVenueIds(guard.user.type, venueIds);
    if (scope) {
      where.venueId = { in: scope };
    }

    // STEP 4 — Load the reservations and everything the rows need.
    const reservations = await prisma.reservation.findMany({
      where,
      include: {
        venue: { select: { venueId: true, venue: true } },
        timeSlot: { select: { startTime: true, endTime: true } },
        client: {
          select: {
            clientId: true,
            firstName: true,
            lastName: true,
            clientRoleId: true,
            clientRole: { select: { roleName: true } },
            clientOrg: { select: { organizationName: true } },
          },
        },
        additionalDates: { select: { eventDate: true } },
        bookings: {
          include: {
            payments: {
              select: {
                amountPaid: true,
                discountAmount: true,
                status: { select: { status: true } },
              },
            },
          },
        },
      },
      orderBy: { eventDate: "asc" },
    });

    // STEP 5 — Turn the reservations into printable report rows and totals.
    const rows = reservations
      .filter(isReservationReportEligible)
      .flatMap((reservation) =>
        buildActivityRows({
          ...reservation,
          additionalDates: (reservation.additionalDates || []).map((d) => d.eventDate),
        })
      );

    const report = buildActivitiesReport({
      rows,
      meta: {
        period,
        venue,
        year: range.startDate.getFullYear(),
        heading: range.heading,
        rangeLabel: range.rangeLabel,
        groupByMonth: range.groupByMonth,
        generatedAt: new Date().toISOString(),
      },
    });

    // STEP 6 — Return the finished document to the screen.
    return noCacheJson(report);
  } catch (error) {
    console.error("Activities report GET error:", error);
    return noCacheJson({ error: "Failed to generate report" }, { status: 500 });
  }
}
