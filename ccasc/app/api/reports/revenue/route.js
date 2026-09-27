import prisma from "@/lib/prisma";
import { noCacheJson } from "@/lib/api-cache-control";
import { resolvePeriodRange } from "@/lib/report-period";
import { buildRevenueReport, isRevenueGroup } from "@/lib/report-revenue";
import { dateCell } from "@/lib/report-activities";
import { extractChargeBreakdownFromNotes } from "@/lib/reservation-charge-breakdown";
import {
  reportVenueIdsForUserType,
  resolveReportVenueIds,
  revenueGroupsForVenueIds,
  venueIdsFromReportVenue,
  venueScopeLabel,
} from "@/lib/report-venue-scope";

import { requireApiAuth } from "@/lib/api-auth";
export const dynamic = "force-dynamic";

/**
 * GET /api/reports/revenue
 *
 * Revenue report behind the "Revenue" toggle of every Report Generation
 * screen. Rows are the reservations of the selected period (the same rows the
 * LIST OF SCGCC ACTIVITIES report prints), grouped per particular, venue,
 * package or facility, with an itemised make-up of every reservation counted
 * (its package, the particulars used and the facilities booked).
 *
 * Query params
 *   period        m | w | y                    (default: m)
 *   year / month / week                        period parts, as in activities
 *   groupBy       particular | venue | package | facility
 *                 a Sports Complex report is always grouped per facility
 *   particularId  keep one particular's share of the revenue
 *   facilityId    keep one facility's share of the revenue
 *   packageId     keep one package
 *   venue         all | sports | cultural      (narrowing filter)
 *   venueIds      comma separated ids — scope hint from a panel
 *
 * Venue scoping: a Program Coordinator always reports on their own venue only
 * (Cultural Center or Sports Complex). `resolveReportVenueIds` enforces that
 * server-side, so the scope survives a hand-edited query string; the Sports
 * Complex scope additionally limits the report to that venue's facilities.
 */
const EXCLUDED_STATUSES = ["Cancelled", "Declined"];
const ALLOWED_TYPES = [
  "admin",
  "accounting clerk",
  "local treasury operations officer",
  "program coordinator cultural",
  "program coordinator sports",
];

function parseIds(value) {
  return String(value || "")
    .split(",")
    .map((id) => parseInt(id, 10))
    .filter((id) => Number.isInteger(id));
}

export async function GET(request) {
  const guard = await requireApiAuth(ALLOWED_TYPES);
  if (guard.response) return guard.response;

  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "m";
    const particularId = parseInt(searchParams.get("particularId"), 10);
    const facilityId = parseInt(searchParams.get("facilityId"), 10);
    const packageId = parseInt(searchParams.get("packageId"), 10);

    const range = resolvePeriodRange({
      period,
      year: searchParams.get("year"),
      month: searchParams.get("month"),
      week: searchParams.get("week"),
    });

    // Venue scope: the panel hint is used when present, and the session's own
    // restriction always wins over whatever the request asked for.
    const requestedVenueIds = parseIds(searchParams.get("venueIds"));
    const venueIds = requestedVenueIds.length
      ? requestedVenueIds
      : venueIdsFromReportVenue(searchParams.get("venue"));
    const scope = resolveReportVenueIds(guard.user.type, venueIds);

    // The Sports Complex books and bills per facility, so that report is always
    // grouped per facility (a package / particular grouping is never offered).
    const allowedGroups = revenueGroupsForVenueIds(scope);
    const requestedGroup = searchParams.get("groupBy");
    const groupBy =
      isRevenueGroup(requestedGroup) && allowedGroups.includes(requestedGroup)
        ? requestedGroup
        : allowedGroups[0];

    // Facilities a report may show: those of the venues in scope, so a Sports
    // Complex report can never list or total a Cultural Center facility.
    const facilities = await prisma.facility.findMany({
      where: scope ? { venueId: { in: scope } } : {},
      select: {
        facilityId: true,
        facilityName: true,
        venueId: true,
        rate: { select: { dayRate: true } },
      },
      orderBy: { facilityId: "asc" },
    });
    const facilitiesById = new Map(
      facilities.map((facility) => [facility.facilityId, facility])
    );
    const allowedFacilityIds = new Set(
      facilities.map((facility) => String(facility.facilityId))
    );

    const where = {
      eventDate: { gte: range.startDate, lte: range.endDate },
      reservationStatus: { notIn: EXCLUDED_STATUSES },
    };
    if (scope) where.venueId = { in: scope };
    if (Number.isInteger(packageId)) where.packageId = packageId;

    const reservations = await prisma.reservation.findMany({
      where,
      include: {
        venue: { select: { venueId: true, venue: true } },
        timeSlot: { select: { startTime: true, endTime: true } },
        package: { select: { packageId: true, packageName: true } },
        client: { select: { firstName: true, lastName: true } },
        additionalDates: { select: { eventDate: true } },
        schedules: { select: { facilityId: true } },
        bookings: {
          include: { payments: { select: { amountPaid: true } } },
        },
        reservedParticulars: {
          include: {
            particular: {
              select: {
                particularId: true,
                particularName: true,
                inventory: { select: { unitCost: true } },
              },
            },
          },
        },
      },
      orderBy: { eventDate: "asc" },
    });

    const rows = reservations.map((r) => {
      const additionalDates = (r.additionalDates || []).map((d) => d.eventDate);
      const collectedAmount = (r.bookings || []).reduce(
        (sum, b) =>
          sum +
          (b.payments || []).reduce(
            (s, p) => s + Number(p.amountPaid || 0),
            0
          ),
        0
      );

      return {
        id: r.reservationId,
        eventDate: r.eventDate.toISOString().split("T")[0],
        dayLabel: dateCell(r.eventDate, additionalDates),
        eventType: r.eventType,
        clientName: [r.client?.firstName, r.client?.lastName]
          .filter(Boolean)
          .join(" "),
        time: `${r.timeSlot.startTime}-${r.timeSlot.endTime}`,
        venueId: r.venueId,
        venueName: r.venue?.venue || "",
        packageId: r.packageId,
        packageName: r.package?.packageName || "",
        totalAmount: Number(r.totalAmount || 0),
        collectedAmount,
        additionalDateCount: additionalDates.length,
        particulars: (r.reservedParticulars || []).map((rp) => ({
          particularId: rp.particular.particularId,
          particularName: rp.particular.particularName,
          quantity: rp.quantity,
          unitCost: rp.particular.inventory?.unitCost
            ? Number(rp.particular.inventory.unitCost)
            : 0,
        })),
        // Only the facilities of the venues in scope, so a Sports Complex
        // report can never list a Cultural Center facility.
        facilities: [...new Set((r.schedules || []).map((s) => s.facilityId))]
          .filter((id) => allowedFacilityIds.has(String(id)))
          .map((id) => ({
            facilityId: id,
            facilityName:
              facilitiesById.get(id)?.facilityName || `Facility ${id}`,
            rateDay: Number(facilitiesById.get(id)?.rate?.dayRate || 0),
          })),
        chargeLines: (extractChargeBreakdownFromNotes(r.notes) || []).filter(
          (line) =>
            !line.facilityId || allowedFacilityIds.has(String(line.facilityId))
        ),
      };
    });

    const filterLabel = await resolveFilterLabel({
      groupBy,
      particularId,
      facilityId,
      packageId,
      facilitiesById,
    });

    const report = buildRevenueReport({
      reservations: rows,
      groupBy,
      particularId: Number.isInteger(particularId) ? particularId : null,
      facilityId: Number.isInteger(facilityId) ? facilityId : null,
      meta: {
        period,
        heading: range.heading,
        rangeLabel: range.rangeLabel,
        filterLabel,
        // A request that asks for a venue outside the session's scope resolves
        // to an empty report; label it with the venue that session owns.
        venueScopeLabel: venueScopeLabel(
          scope && scope.length
            ? scope
            : reportVenueIdsForUserType(guard.user.type)
        ),
        generatedAt: new Date().toISOString(),
      },
    });

    return noCacheJson(report);
  } catch (error) {
    console.error("Revenue report GET error:", error);
    return noCacheJson(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}

/** Printed sub-title: the entity the revenue is broken down / filtered by. */
async function resolveFilterLabel({
  groupBy,
  particularId,
  facilityId,
  packageId,
  facilitiesById,
}) {
  if (Number.isInteger(particularId)) {
    const particular = await prisma.particular.findUnique({
      where: { particularId },
      select: { particularName: true },
    });
    return particular?.particularName || `Particular ${particularId}`;
  }
  if (Number.isInteger(facilityId)) {
    return (
      facilitiesById.get(facilityId)?.facilityName || `Facility ${facilityId}`
    );
  }
  if (Number.isInteger(packageId)) {
    const pkg = await prisma.package.findUnique({
      where: { packageId },
      select: { packageName: true },
    });
    return pkg?.packageName || `Package ${packageId}`;
  }
  if (groupBy === "venue") return "All Venues";
  if (groupBy === "package") return "All Packages";
  if (groupBy === "facility") return "All Facilities";
  return "All Particulars";
}
