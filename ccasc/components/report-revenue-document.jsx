"use client";

import * as React from "react";
import { PAGE_LOGO } from "@/lib/constants";
import { formatAmount } from "@/lib/report-activities";
import { useCurrentUser } from "@/hooks/use-current-user";

/**
 * Renders the printed "REVENUE REPORT" on screen.
 *
 * Uses the same sealed letterhead and print rules as the LIST OF SCGCC
 * ACTIVITIES document, but the table breaks the period revenue down per
 * particular, venue or package (the report's `groupBy`) and prints the
 * supporting reservations underneath, plus the total-revenue summary block.
 */

function TotalRow({ label, value, emphasis = false }) {
  return (
    <div className="flex items-baseline justify-end gap-6 py-0.5">
      <span
        className={
          emphasis
            ? "text-right text-[12px] font-bold uppercase"
            : "text-right text-[11px] uppercase"
        }
      >
        {label}
      </span>
      <span
        className={`w-[130px] shrink-0 text-right tabular-nums ${
          emphasis ? "text-[12px] font-bold" : "text-[11px]"
        }`}
      >
        {formatAmount(value)}
      </span>
    </div>
  );
}

export default function ReportRevenueDocument({ report, preparedBy }) {
  const currentUser = useCurrentUser();
  const prepared = preparedBy || currentUser;

  if (!report) return null;

  const groups = report.groups || [];
  const items = report.items || [];
  const totals = report.totals || {};
  const groupLabel = report.groupLabel || "Particular";
  // Quantity applies to the per-particular and per-facility breakdowns.
  const showQuantity = groups.some((group) => Number(group.quantity) > 0);

  return (
    <article className="report-document mx-auto w-full max-w-[900px] bg-white p-6 text-[11px] leading-snug text-black ring-1 ring-black/10 sm:p-9">
      {/* Letterhead */}
      <header className="text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={PAGE_LOGO}
          alt=""
          className="mx-auto mb-2 h-16 w-16 object-contain"
        />
        <p>Republic of the Philippines</p>
        <p>Province of South Cotabato</p>
        <p className="font-bold uppercase">
          South Cotabato Economic Enterprise Management Office
        </p>
        <p className="font-bold uppercase">
          South Cotabato Gymnasium &amp; Cultural Center
        </p>
        <p>Koronadal City</p>
        <p>Tel. # (083)228-9314</p>
      </header>

      {/* Title */}
      <div className="mt-5 text-center">
        <h3 className="text-[13px] font-bold uppercase">Revenue Report</h3>
        <p className="text-[12px] font-semibold uppercase">{report.heading}</p>
        <p className="text-[11px] uppercase">
          Per {groupLabel} — {report.filterLabel || `All ${groupLabel}s`} ·{" "}
          {report.venueScopeLabel || "All Venues"}
        </p>
      </div>

      {/* Revenue per particular / venue / package / facility */}
      <table className="mt-4 w-full border-collapse">
        <thead>
          <tr>
            <th className="border border-black px-2 py-1 text-left font-bold uppercase">
              {groupLabel}
            </th>
            <th className="w-[110px] border border-black px-2 py-1 text-right font-bold uppercase">
              Reservations
            </th>
            {showQuantity && (
              <th className="w-[80px] border border-black px-2 py-1 text-right font-bold uppercase">
                Qty
              </th>
            )}
            <th className="w-[120px] border border-black px-2 py-1 text-right font-bold uppercase">
              Amount
            </th>
            <th className="w-[120px] border border-black px-2 py-1 text-right font-bold uppercase">
              Collected
            </th>
            <th className="w-[120px] border border-black px-2 py-1 text-right font-bold uppercase">
              Balance
            </th>
          </tr>
        </thead>
        <tbody>
          {groups.length ? (
            groups.map((group) => (
              <tr key={group.key}>
                <td className="border border-black px-2 py-1">{group.label}</td>
                <td className="border border-black px-2 py-1 text-center tabular-nums">
                  {group.reservations}
                </td>
                {showQuantity && (
                  <td className="border border-black px-2 py-1 text-right tabular-nums">
                    {group.quantity || 0}
                  </td>
                )}
                <td className="border border-black px-2 py-1 text-right tabular-nums">
                  {formatAmount(group.amount)}
                </td>
                <td className="border border-black px-2 py-1 text-right tabular-nums">
                  {formatAmount(group.collected)}
                </td>
                <td className="border border-black px-2 py-1 text-right tabular-nums">
                  {formatAmount(group.balance)}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={showQuantity ? 6 : 5}
                className="border border-black px-2 py-6 text-center italic"
              >
                No revenue recorded for this period.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Itemised charges: package, particulars used and facilities booked */}
      {items.length > 0 && (
        <>
          <p className="mt-4 text-[11px] font-bold uppercase">
            Charges included - package, particulars used and facilities
          </p>
          <table className="mt-1 w-full border-collapse">
            <thead>
              <tr>
                <th className="w-[55px] border border-black px-2 py-1 text-left font-bold uppercase">
                  Date
                </th>
                <th className="border border-black px-2 py-1 text-left font-bold uppercase">
                  Activity
                </th>
                <th className="border border-black px-2 py-1 text-left font-bold uppercase">
                  Client
                </th>
                <th className="w-[120px] border border-black px-2 py-1 text-left font-bold uppercase">
                  Package
                </th>
                <th className="border border-black px-2 py-1 text-left font-bold uppercase">
                  Particular / Facility used
                </th>
                <th className="w-[80px] border border-black px-2 py-1 text-left font-bold uppercase">
                  Type
                </th>
                <th className="w-[58px] border border-black px-2 py-1 text-right font-bold uppercase">
                  Qty
                </th>
                <th className="w-[100px] border border-black px-2 py-1 text-right font-bold uppercase">
                  Amount
                </th>
                <th className="w-[100px] border border-black px-2 py-1 text-right font-bold uppercase">
                  Collected
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((row, index) => (
                <tr key={`${row.date}-${row.itemType}-${row.itemLabel}-${index}`}>
                  <td className="border border-black px-2 py-1 text-center">
                    {row.dayLabel}
                  </td>
                  <td className="border border-black px-2 py-1">
                    {row.eventType}
                  </td>
                  <td className="border border-black px-2 py-1">
                    {row.clientName}
                  </td>
                  <td className="border border-black px-2 py-1">
                    {row.packageName || "—"}
                  </td>
                  <td className="border border-black px-2 py-1">
                    {row.itemLabel}
                  </td>
                  <td className="border border-black px-2 py-1">
                    {row.itemType}
                  </td>
                  <td className="border border-black px-2 py-1 text-right tabular-nums">
                    {row.quantity > 0 ? row.quantity : "—"}
                  </td>
                  <td className="border border-black px-2 py-1 text-right tabular-nums">
                    {formatAmount(row.amount)}
                  </td>
                  <td className="border border-black px-2 py-1 text-right tabular-nums">
                    {formatAmount(row.collected)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-1 text-[10px] italic">
            Itemised charges are the full make-up of the reservations counted
            above: the package, every particular used and every facility booked,
            each with the amount charged for it.
          </p>
        </>
      )}

      {/* Summary block - right aligned, mirroring the paper form */}
      <div className="mt-3 border-t border-black pt-2">
        <div className="ml-auto w-full max-w-[560px]">
          <TotalRow label="Total Revenue" value={totals.amount} />
          <TotalRow label="Total Collected" value={totals.collected} />
          <div className="mt-1 border-t border-black pt-1">
            <TotalRow label="Balance" value={totals.balance} emphasis />
          </div>
          <p className="mt-1 text-right text-[10px] uppercase">
            {totals.reservations || 0} reservation(s) · {totals.groups || 0}{" "}
            {groupLabel.toLowerCase()} line(s)
            {showQuantity ? " · quantity in units" : ""}
          </p>
        </div>
      </div>

      {/* Prepared by - the signed-in user who generated the report */}
      <div className="mt-12 flex">
        <div className="text-center">
          <p className="text-left text-[10px]">Prepared by:</p>
          <p className="mt-10 min-w-[220px] border-t border-black pt-1 font-bold uppercase">
            {prepared.name || "\u00A0"}
          </p>
          <p className="text-[10px]">{prepared.roleTitle || ""}</p>
        </div>
      </div>

      <footer className="mt-6 text-center text-[10px] text-neutral-600">
        <p>
          {report.rowCount} line(s) ·{" "}
          {report.generatedAt
            ? new Date(report.generatedAt).toLocaleString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : ""}
        </p>
        <p className="mt-1">
          South Cotabato Gymnasium &amp; Cultural Center Management System
        </p>
      </footer>

      <style jsx global>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            background: white !important;
          }
          /* Hide the panel chrome and show only the generated document. */
          body * {
            visibility: hidden;
          }
          .report-document,
          .report-document * {
            visibility: visible;
          }
          .report-document {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            max-width: none;
            padding: 0;
            box-shadow: none !important;
            --tw-ring-shadow: 0 0 #0000 !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
        }
      `}</style>
    </article>
  );
}
