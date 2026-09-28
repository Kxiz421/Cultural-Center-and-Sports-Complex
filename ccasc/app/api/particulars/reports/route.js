import prisma from "@/lib/prisma";
import { noCacheJson } from "@/lib/api-cache-control";
import {
  buildParticularsReport,
  isMovementFilter,
  resolveParticularsReportRange,
} from "@/lib/report-particulars";

import { requireApiAuth } from "@/lib/api-auth";
export const dynamic = "force-dynamic";

/**
 * GET /api/particulars/reports
 *
 * Particulars STOCK REPORT behind the "Generate Report" button of
 * `/panel/admin/particulars`: every RESTOCK / DAMAGE recorded against a
 * particular (the `ParticularTransaction` rows written by the particulars POST
 * handler), with the date, the quantity and the staff member who recorded it.
 *
 * Query params
 *   period        m | w | y | d      (default: m)
 *   year          4-digit year       (m / w / y)
 *   month         0-11               (m / w)
 *   week          1-5                (w)
 *   date          YYYY-MM-DD         (d — "Specific Date")
 *   particularId  one particular; omitted / "all" = every particular
 *   movement      all | RESTOCK | DAMAGE (default: all) — narrows the report to
 *                 restocking, to damage reports, or keeps both
 *
 * The summary always covers every particular in scope (quiet ones print as
 * zeros), so a specific particular with no movement still returns a row while
 * "All Particulars" reads as a stock statement. `stockOnHand` is the quantity
 * at generation time — the database stores no historical balance.
 */
const ALLOWED_TYPES = [
  "admin",
  "accounting clerk",
  "local treasury operations officer",
  "program coordinator cultural",
  "program coordinator sports",
];

export async function GET(request) {
  const guard = await requireApiAuth(ALLOWED_TYPES);
  if (guard.response) return guard.response;

  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "m";
    const requested = parseInt(searchParams.get("particularId"), 10);
    const particularId = Number.isInteger(requested) ? requested : null;
    const requestedMovement = searchParams.get("movement") || "all";
    const movement = isMovementFilter(requestedMovement)
      ? requestedMovement
      : "all";

    const range = resolveParticularsReportRange({
      period,
      year: searchParams.get("year"),
      month: searchParams.get("month"),
      week: searchParams.get("week"),
      date: searchParams.get("date"),
    });

    const [transactions, particulars] = await Promise.all([
      prisma.particularTransaction.findMany({
        where: {
          createdAt: { gte: range.startDate, lte: range.endDate },
          ...(particularId === null ? {} : { particularId }),
          ...(movement === "all" ? {} : { transactionType: movement }),
        },
        include: { particular: { select: { particularName: true } } },
        orderBy: { createdAt: "asc" },
      }),
      prisma.particular.findMany({
        where: particularId === null ? {} : { particularId },
        select: {
          particularId: true,
          particularName: true,
          inventory: { select: { quantityAvailable: true } },
        },
        orderBy: { particularName: "asc" },
      }),
    ]);

    const report = buildParticularsReport({
      transactions,
      particulars: particulars.map((particular) => ({
        particularId: particular.particularId,
        particularName: particular.particularName,
        stockOnHand: particular.inventory?.quantityAvailable ?? null,
      })),
      meta: {
        period,
        particularId,
        movement,
        filterLabel: resolveFilterLabel(particulars, particularId),
        year: range.startDate.getFullYear(),
        heading: range.heading,
        rangeLabel: range.rangeLabel,
        groupByMonth: range.groupByMonth,
        generatedAt: new Date().toISOString(),
      },
    });

    return noCacheJson(report);
  } catch (error) {
    console.error("Particulars report GET error:", error);
    return noCacheJson({ error: "Failed to generate report" }, { status: 500 });
  }
}

/** Printed sub-title: the particular the report covers, or all of them. */
function resolveFilterLabel(particulars, particularId) {
  if (particularId === null) return "All Particulars";
  const particular = particulars.find((p) => p.particularId === particularId);
  return particular?.particularName || `Particular ${particularId}`;
}
