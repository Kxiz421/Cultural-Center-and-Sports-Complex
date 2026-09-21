"use client";

import * as React from "react";
import { PAGE_LOGO } from "@/lib/constants";
import { formatAmount } from "@/lib/report-activities";
import { useCurrentUser } from "@/hooks/use-current-user";

/**
 * Renders the printed "LIST OF SCGCC ACTIVITIES" form on screen.
 *
 * The layout follows the official paper document — sealed letterhead, centred
 * title, ruled DATE / ACTIVITIES / TIME / AMOUNT table with month bands, and
 * the right-aligned summary block underneath.
 *
 * The paper form has an "OR NUMBER" column; generated reports deliberately
 * omit it, so receipt numbers are never rendered here.
 *
 * `@media print` hides everything except this document, so "Export PDF"
 * (window.print) produces exactly what is shown on screen.
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

export default function ReportActivitiesDocument({ report, preparedBy }) {
  const currentUser = useCurrentUser();
  const prepared = preparedBy || currentUser;

  if (!report) return null;

  const sections = report.sections || [];
  const totals = report.totals || {};
  const hasRows = sections.some((section) => section.rows?.length);

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
        <h3 className="text-[13px] font-bold uppercase">
          List of SCGCC Activities
        </h3>
        <p className="text-[12px] font-semibold uppercase">{report.heading}</p>
      </div>

      {/* Activity table — DATE | ACTIVITIES | TIME | AMOUNT (no OR NUMBER column) */}
      <table className="mt-4 w-full border-collapse">
        <thead>
          <tr>
            <th className="w-[70px] border border-black px-2 py-1 text-left font-bold uppercase">
              Date
            </th>
            <th className="border border-black px-2 py-1 text-left font-bold uppercase">
              Activities
            </th>
            <th className="w-[110px] border border-black px-2 py-1 text-left font-bold uppercase">
              Time
            </th>
            <th className="w-[120px] border border-black px-2 py-1 text-right font-bold uppercase">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {hasRows ? (
            sections.map((section) => (
              <React.Fragment key={section.band || "all"}>
                {section.band && (
                  <tr>
                    <td
                      colSpan={4}
                      className="border border-black bg-neutral-200 px-2 py-1 font-bold uppercase"
                    >
                      {section.band}
                    </td>
                  </tr>
                )}
                {section.rows.map((row, index) => (
                  <tr key={`${row.dayLabel}-${index}`}>
                    <td className="border border-black px-2 py-1 text-center">
                      {row.dayLabel}
                    </td>
                    <td className="border border-black px-2 py-1">
                      {row.activities}
                    </td>
                    <td className="border border-black px-2 py-1">
                      {row.time}
                    </td>
                    <td className="border border-black px-2 py-1 text-right tabular-nums">
                      {formatAmount(row.amount)}
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))
          ) : (
            <tr>
              <td
                colSpan={4}
                className="border border-black px-2 py-6 text-center italic"
              >
                No activities recorded for this period.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Summary block — right aligned, mirroring the paper form */}
      <div className="mt-3 border-t border-black pt-2">
        <div className="ml-auto w-full max-w-[560px]">
          <TotalRow label="Total Amount" value={totals.totalAmount} />
          <TotalRow
            label="Total Amount Charged to PGO"
            value={totals.chargedToPgo}
          />
          <TotalRow
            label="PGSC Activities - FOC"
            value={totals.pgscFoc}
          />
          <TotalRow
            label="Total Amount Paid by Private Sectors Event"
            value={totals.privateSectors}
          />
          <div className="mt-1 border-t border-black pt-1">
            <TotalRow
              label="Total Income"
              value={totals.totalIncome}
              emphasis
            />
          </div>
        </div>
      </div>

      {/* Prepared by — the signed-in user who generated the report */}
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
          {report.rowCount} record(s) ·{" "}
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
