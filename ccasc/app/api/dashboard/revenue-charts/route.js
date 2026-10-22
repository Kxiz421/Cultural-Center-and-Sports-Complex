import prisma from "@/lib/prisma";
import { noCacheJson } from "@/lib/api-cache-control";
import { requireApiAuth } from "@/lib/api-auth";
import {
  REVENUE_GROUP_FACILITY,
  REVENUE_GROUP_PARTICULAR,
} from "@/lib/report-revenue";
import {
  isSportsComplexOnly,
  resolveReportVenueIds,
  venueScopeLabel,
} from "@/lib/report-venue-scope";
import {
  buildRevenueCharts,
  isChartGroup,
  resolveChartWindow,
} from "@/lib/revenue-charts";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = [
  "admin",
  "accounting clerk",
  "local treasury operations officer",
  "program coordinator cultural",
  "program coordinator sports",
];

/**
 * GET /api/dashboard/revenue-charts
 *
 * Trend + breakdown behind the Revenue Analytics card on the staff dashboards.
 *
 * Query params
 *   period  day | month | year        (default: month)
 *   year / month / day                period parts
 *   group   facility | particular     (default: particular)
 *
 * Venue scoping: a Program Coordinator is always limited to their own venue -
 * the Sports Complex only ever sees its facility revenue, the Cultural Center
 * sees its own particular/facility revenue. The scope comes from the session,
 * never the query string, so it cannot be widened by hand.
 */
export async function GET(request) {
  const guard = await requireApiAuth(ALLOWED_TYPES);
  if (guard.response) return guard.response;

  try {
    const { searchParams } = new URL(request.url);

    const window = resolveChartWindow({
      period: searchParams.get("period"),
      year: searchParams.get("year"),
      month: searchParams.get("month"),
      day: searchParams.get("day"),
    });

    // Session scope only.
    const scope = resolveReportVenueIds(guard.user.type, []);

    // The Sports Complex bills per facility, so that scope never offers the
    // per-particular breakdown.
    const allowedGroups = isSportsComplexOnly(scope)
      ? [REVENUE_GROUP_FACILITY]
      : [REVENUE_GROUP_PARTICULAR, REVENUE_GROUP_FACILITY];

    const requestedGroup = searchParams.get("group");
    const group =
      isChartGroup(requestedGroup) && allowedGroups.includes(requestedGroup)
        ? requestedGroup
        : allowedGroups[0];

    const where = { paymentDate: { gte: window.start, lte: window.end } };
    if (scope && scope.length) {
      where.payment = { booking: { reservation: { venueId: { in: scope } } } };
    }

    const [transactions, facilities] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          payment: {
            select: {
              amountPaid: true,
              booking: {
                select: {
                  reservation: {
                    select: {
                      reservationId: true,
                      venueId: true,
                      totalAmount: true,
                      notes: true,
                      package: { select: { packageId: true, packageName: true } },
                      additionalDates: { select: { eventDate: true } },
                      schedules: { select: { facilityId: true } },
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
                  },
                },
              },
            },
          },
        },
      }),
      prisma.facility.findMany({
        select: {
          facilityId: true,
          facilityName: true,
          rate: { select: { dayRate: true } },
        },
      }),
    ]);

    const facilitiesById = new Map(
      facilities.map((facility) => [
        facility.facilityId,
        {
          facilityName: facility.facilityName,
          rateDay: Number(facility.rate?.dayRate || 0),
        },
      ]),
    );

    const charts = buildRevenueCharts({
      transactions,
      facilitiesById,
      group,
      window,
    });

    return noCacheJson({
      period: window.period,
      year: window.year,
      month: window.month ?? null,
      day: window.day ?? null,
      label: window.label,
      group,
      allowedGroups,
      scopeLabel: venueScopeLabel(scope && scope.length ? scope : []),
      trend: charts.trend,
      breakdown: charts.breakdown,
      total: charts.total,
    });
  } catch (error) {
    console.error("Revenue charts error:", error);
    return noCacheJson(
      { error: "Failed to load revenue charts" },
      { status: 500 },
    );
  }
}
