"use client";

import * as React from "react";
import { PAGE_LOGO } from "@/lib/constants";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  movementFilterLabel,
  movementFilterNoun,
} from "@/lib/report-particulars";

/**
 * Renders the printed "PARTICULARS STOCK REPORT" on screen.
 *
 * Same sealed letterhead and print rules as the LIST OF SCGCC ACTIVITIES and
 * REVENUE documents, so the three reports look like one family. Two tables:
 *
 *   1. SUMMARY — every particular in scope with its stock on hand and the
 *                restocked / damaged quantities of the period
 *   2. LOG     — each movement in date order (banded per month on a yearly
 *                report) with its type, quantity and the staff member who
 *                recorded it ("Restocked by" / "Reported by")
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
        className={`w-[90px] shrink-0 text-right tabular-nums ${
          emphasis ? "text-[12px] font-bold" : "text-[11px]"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

/** "+5" / "-3" / "0" — the net change of a particular. */
function signed(value) {
  const amount = Number(value) || 0;
  return amount > 0 ? `+${amount}` : String(amount);
}

export default function ReportParticularsDocument({ report, preparedBy }) {
  const currentUser = useCurrentUser();
  const prepared = preparedBy || currentUser;

  if (!report) return null;

  const groups = report.groups || [];
  const sections = report.sections || [];
  const totals = report.totals || {};
  const hasMovements = sections.some((section) => section.rows?.length);
  const movement = report.movement || "all";
  const movementLabel = movementFilterLabel(movement);
  const movementNoun = movementFilterNoun(movement);
  // "restocking or damage" reads better than "restocking and damage" after "No".
  const noneLabel = movement === "all" ? "restocking or damage" : movementNoun;
  // Heading prose keeps the conjunction form ("restocking and damage records").
  const logLabel = movement === "all" ? "restocking and damage" : movementNoun;
  // A single-type report leaves the other quantity column empty by definition,
  // so it is dropped from the summary instead of printing a column of zeros.
  const showRestocked = movement !== "DAMAGE";
  const showDamaged = movement !== "RESTOCK";
  const summaryColumns = 4 + (showRestocked ? 1 : 0) + (showDamaged ? 1 : 0);

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
          Particulars Stock Report
        </h3>
        <p className="text-[12px] font-semibold uppercase">{report.heading}</p>
        <p className="text-[11px] uppercase">
          {report.filterLabel || "All Particulars"} · {movementLabel} ·{" "}
          {report.rangeLabel || ""}
        </p>
      </div>

      {/* Summary per particular */}
      <p className="mt-4 text-[11px] font-bold uppercase">
        Summary — {movementNoun} per particular
      </p>
      <table className="mt-1 w-full border-collapse">
        <thead>
          <tr>
            <th className="border border-black px-2 py-1 text-left font-bold uppercase">
              Particular
            </th>
            <th className="w-[80px] border border-black px-2 py-1 text-right font-bold uppercase">
              Stock on Hand
            </th>
            {showRestocked && (
              <th className="w-[80px] border border-black px-2 py-1 text-right font-bold uppercase">
                Restocked
              </th>
            )}
            {showDamaged && (
              <th className="w-[80px] border border-black px-2 py-1 text-right font-bold uppercase">
                Damaged
              </th>
            )}
            <th className="w-[80px] border border-black px-2 py-1 text-right font-bold uppercase">
              Net Change
            </th>
            <th className="w-[70px] border border-black px-2 py-1 text-right font-bold uppercase">
              Records
            </th>
          </tr>
        </thead>
        <tbody>
          {groups.length ? (
            groups.map((group) => (
              <tr key={group.key}>
                <td className="border border-black px-2 py-1">
                  {group.particularName}
                </td>
                <td className="border border-black px-2 py-1 text-right tabular-nums">
                  {group.stockOnHand ?? 0}
                </td>
                {showRestocked && (
                  <td className="border border-black px-2 py-1 text-right tabular-nums">
                    {group.restocked}
                  </td>
                )}
                {showDamaged && (
                  <td className="border border-black px-2 py-1 text-right tabular-nums">
                    {group.damaged}
                  </td>
                )}
                <td className="border border-black px-2 py-1 text-right tabular-nums">
                  {signed(group.netChange)}
                </td>
                <td className="border border-black px-2 py-1 text-center tabular-nums">
                  {group.records}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={summaryColumns}
                className="border border-black px-2 py-6 text-center italic"
              >
                No particulars to report.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <p className="mt-1 text-[10px] italic">
        Every particular in scope is listed, including those without {noneLabel}{" "}
        in the period (shown as zeros). &ldquo;Stock on Hand&rdquo; is the
        quantity at the time this report was generated.
      </p>

      {/* Movement log */}
      <p className="mt-4 text-[11px] font-bold uppercase">
        Movement log — {logLabel} records
      </p>
      <table className="mt-1 w-full border-collapse">
        <thead>
          <tr>
            <th className="w-[130px] border border-black px-2 py-1 text-left font-bold uppercase">
              Date &amp; Time
            </th>
            <th className="border border-black px-2 py-1 text-left font-bold uppercase">
              Particular
            </th>
            <th className="w-[90px] border border-black px-2 py-1 text-left font-bold uppercase">
              Type
            </th>
            <th className="w-[55px] border border-black px-2 py-1 text-right font-bold uppercase">
              Qty
            </th>
            <th className="w-[170px] border border-black px-2 py-1 text-left font-bold uppercase">
              Restocked by / Reported by
            </th>
          </tr>
        </thead>
        <tbody>
          {hasMovements ? (
            sections.map((section) => (
              <React.Fragment key={section.band || "all"}>
                {section.band && (
                  <tr>
                    <td
                      colSpan={5}
                      className="border border-black bg-black/[0.04] px-2 py-1 font-bold uppercase"
                    >
                      {section.band}
                    </td>
                  </tr>
                )}
                {section.rows.map((row) => (
                  <tr key={row.transactionId}>
                    <td className="border border-black px-2 py-1">
                      {row.dateLabel}
                      <span className="text-[10px]"> · {row.timeLabel}</span>
                    </td>
                    <td className="border border-black px-2 py-1">
                      {row.particularName}
                    </td>
                    <td className="border border-black px-2 py-1">
                      {row.typeLabel}
                    </td>
                    <td className="border border-black px-2 py-1 text-right tabular-nums">
                      {signed(
                        row.transactionType === "RESTOCK"
                          ? row.quantity
                          : -row.quantity
                      )}
                    </td>
                    <td className="border border-black px-2 py-1">
                      {row.performedByName}
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))
          ) : (
            <tr>
              <td
                colSpan={5}
                className="border border-black px-2 py-6 text-center italic"
              >
                No {noneLabel} was recorded for this period.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Summary block — right aligned, mirroring the paper form */}
      <div className="mt-3 border-t border-black pt-2">
        <div className="ml-auto w-full max-w-[520px]">
          <TotalRow label="Total Restocked" value={totals.restocked ?? 0} />
          <TotalRow label="Total Damaged" value={totals.damaged ?? 0} />
          <div className="mt-1 border-t border-black pt-1">
            <TotalRow
              label="Net Change"
              value={signed(totals.netChange)}
              emphasis
            />
          </div>
          <p className="mt-1 text-right text-[10px] uppercase">
            {totals.records || 0} movement record(s) ·{" "}
            {totals.particularsWithMovement || 0} particular(s) with movement ·{" "}
            {totals.particulars || 0} particular(s) covered
          </p>
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
          {report.rowCount} movement record(s) ·{" "}
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
          /* Keep a movement row together on one page. */
          .report-document tr {
            break-inside: avoid;
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
