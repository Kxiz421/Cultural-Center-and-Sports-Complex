import prisma from "@/lib/prisma";
import { noCacheJson } from "@/lib/api-cache-control";
import { requireApiAuth } from "@/lib/api-auth";
import {
  REVENUE_GROUP_FACILITY,
  REVENUE_GROUP_PACKAGE,
  REVENUE_GROUP_PARTICULAR,
} from "@/lib/report-revenue";
import {
  CULTURAL_CENTER_VENUE_ID,
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
 * Two series behind the Revenue Analytics card on the staff dashboards:
 *   graph - collected revenue per week / month / year bucket
 *   pie   - revenue (and usage) per particular / package / facility
 *
 * Query params
 *   period  week | month | year   (default: month)
 *   year    the year for period=month
 *   group   particular | package | facility  (default: first allowed)
 *
 * Venue scoping: a Program Coordinator is always limited to their own venue -
 * the Sports Complex only ever breaks down per facility, the Cultural Center
 * per particular / package. The scope comes from the session, never the query
 * string, so it cannot be widened by hand.
 */
export async function GET(request) {
  const guard = await requireApiAuth(ALLOWED_TYPES);
  if (guard.response) return guard.response;

  try {
    const { searchParams } = new URL(request.url);

    const window = resolveChartWindow({
      period: searchParams.get("period"),
      year: searchParams.get("year"),
    });

    // Session scope only.
    const scope = resolveReportVenueIds(guard.user.type, []);
    const canChooseVenue = !scope || scope.length !== 1;
    const venueParam = searchParams.get("venue") || "all";
    const venueFilter = canChooseVenue ? venueParam : "all";
    const selectedVenueIds =
      canChooseVenue && venueFilter === "cultural"
        ? [CULTURAL_CENTER_VENUE_ID]
        : canChooseVenue && venueFilter === "sports"
          ? [2]
          : scope && scope.length
            ? scope
            : null;

    // Sports Complex bills per facility; the Cultural Center per particular /
    // package. Facility breakdown only exists for the Sports Complex.
    const sportsOnly = isSportsComplexOnly(selectedVenueIds);
    const allowedGroups = sportsOnly
      ? [REVENUE_GROUP_FACILITY]
      : [REVENUE_GROUP_PARTICULAR, REVENUE_GROUP_PACKAGE];

    const requestedGroup = searchParams.get("group");
    const group =
      isChartGroup(requestedGroup) && allowedGroups.includes(requestedGroup)
        ? requestedGroup
        : allowedGroups[0];

    const where = { paymentDate: { gte: window.start, lte: window.end } };
    if (selectedVenueIds && selectedVenueIds.length) {
      where.payment = {
        booking: { reservation: { venueId: { in: selectedVenueIds } } },
      };
    }

    const monthParam = parseInt(searchParams.get("month"), 10);
    const selectedMonth =
      window.period === "month" && monthParam >= 1 && monthParam <= 12
        ? monthParam
        : null;

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
        where: { venueId: 2 },
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

    const breakdownTransactions = selectedMonth
      ? transactions.filter((transaction) => {
          const when = new Date(transaction.paymentDate);
          return (
            !Number.isNaN(when.getTime()) &&
            when.getMonth() + 1 === selectedMonth
          );
        })
      : transactions;

    const particularIdParam = parseInt(searchParams.get("particularId"), 10);
    const packageIdParam = parseInt(searchParams.get("packageId"), 10);
    const hasParticularFilter =
      group === REVENUE_GROUP_PARTICULAR && Number.isInteger(particularIdParam);
    const hasPackageFilter =
      group === REVENUE_GROUP_PACKAGE && Number.isInteger(packageIdParam);

    const matchesItem = (transaction) => {
      if (!hasParticularFilter && !hasPackageFilter) return true;
      const reservation = transaction.payment?.booking?.reservation;
      if (!reservation) return false;
      if (hasParticularFilter) {
        return (reservation.reservedParticulars || []).some(
          (rp) =>
            Number(rp.particular?.particularId ?? rp.particularId) ===
            particularIdParam
        );
      }
      return Number(reservation.package?.packageId ?? 0) === packageIdParam;
    };

    const filteredTransactions = breakdownTransactions.filter(matchesItem);

    const particularOptionsMap = new Map();
    const packageOptionsMap = new Map();
    for (const transaction of breakdownTransactions) {
      const reservation = transaction.payment?.booking?.reservation;
      if (!reservation) continue;
      for (const rp of reservation.reservedParticulars || []) {
        const id = Number(rp.particular?.particularId ?? rp.particularId);
        if (Number.isInteger(id) && !particularOptionsMap.has(id)) {
          particularOptionsMap.set(
            id,
            rp.particular?.particularName || `Particular ${id}`
          );
        }
      }
      const pkg = reservation.package;
      const packageIdNum = Number(pkg?.packageId);
      if (
        pkg &&
        Number.isInteger(packageIdNum) &&
        !packageOptionsMap.has(packageIdNum)
      ) {
        packageOptionsMap.set(
          packageIdNum,
          pkg.packageName || `Package ${packageIdNum}`
        );
      }
    }
    const byName = (a, b) => a.name.localeCompare(b.name);
    const particularOptions = [...particularOptionsMap]
      .map(([id, name]) => ({ id, name }))
      .sort(byName);
    const packageOptions = [...packageOptionsMap]
      .map(([id, name]) => ({ id, name }))
      .sort(byName);

    const charts = buildRevenueCharts({
      transactions,
      breakdownTransactions,
      facilitiesById,
      group,
      window,
      particularId: hasParticularFilter ? particularIdParam : null,
      packageId: hasPackageFilter ? packageIdParam : null,
    });

    return noCacheJson({
      period: window.period,
      year: window.year ?? null,
      month: selectedMonth,
      label: window.label,
      group,
      allowedGroups,
      venue: venueFilter,
      canChooseVenue,
      venueOptions: [
        { value: "all", label: "All venues" },
        { value: "cultural", label: "Cultural Center" },
        { value: "sports", label: "Sports Complex" },
      ],
      particularId: hasParticularFilter ? particularIdParam : null,
      packageId: hasPackageFilter ? packageIdParam : null,
      particularOptions,
      packageOptions,
      scopeLabel: venueScopeLabel(scope && scope.length ? scope : []),
      graph: charts.graph,
      pie: charts.pie,
      series: charts.series,
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
