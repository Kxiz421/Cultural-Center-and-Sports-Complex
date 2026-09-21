"use client";

import * as React from "react";
import { PAGE_LOGO } from "@/lib/constants";
import { useCurrentUser } from "@/hooks/use-current-user";

/**
 * Renders the official ORDER OF PAYMENT form.
 *
 * Layout follows the printed provincial form: sealed letterhead, the
 * CTRL NO / DATE / client / activity field block, a side-by-side
 * PARTICULARS and PACKAGE RATE table, the free-use amenities box and the
 * Prepared / Recommended / Approved signatories.
 *
 * The two tables are NOT the same thing:
 *   - PARTICULARS  (left)  → Venue Rental and individual items
 *                            (chairs, tables, aircon, microphone, LED wall …)
 *   - PACKAGE RATE (right) → the packages that were booked
 *                            (Standard Day Package, Standard Night Package,
 *                             LED Wall Day/Night Package …)
 *
 * In both tables CHARGES carries the price/rate as a numeral and AMOUNT
 * carries the extended line total.
 *
 * Used by both the client reservation flow and the accounting clerk walk-in
 * reservation flow so the two produce an identical document.
 */

/** Letterhead as printed on the form. */
export const OOP_LETTERHEAD = [
  "Republic of the Philippines",
  "Province of South Cotabato",
];

export const OOP_LETTERHEAD_OFFICES = [
  "Office of the Provincial Governor",
  "Office of the South Cotabato Economic Enterprise Management Office",
  "South Cotabato Gymnasium and Cultural Center",
];

export const OOP_LETTERHEAD_CONTACT = [
  "Alunan Ave., Brgy. Zone IV, City of Koronadal",
  "Tel. No. (083) 228-9314 • Facebook: SouthCot Gym",
];

/** "Inclusive: Free use of the ff. amenities/facilities" box. */
export const OOP_INCLUSIVE = [
  "Aircon",
  "Parking Area",
  "Restrooms",
  "Lights & Sounds",
  "12pcs PAR 64 lights",
  "Table and Chairs",
  "PGSC LED WALL",
];

/** Signatory block printed at the foot of the form. */
export const OOP_SIGNATORIES = [
  { role: "Prepared by:", name: "JOHN REY D. FORTES", lines: [] },
  {
    role: "Recommended by:",
    name: "MARIO S. SORONGON",
    lines: ["Chief: Revenue Operation Division", "LTOO IV"],
  },
  {
    role: "Approved by:",
    name: "ALVIM M. BATOL, CPA",
    lines: ["Provincial Treasurer"],
  },
];

export const OOP_DEPOSIT_RATE = 0.1;

/** "55,000.00" — the form prints bare figures with two decimals. */
export function formatPeso(amount) {
  return new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);
}

/** "2026-12-01" → "December 1, 2026". */
export function formatDisplayDate(value) {
  if (!value) return "";
  const date = new Date(
    String(value).length === 10 ? `${value}T00:00:00` : value
  );
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Packages go on the right-hand PACKAGE RATE table; everything else (Venue
 * Rental, particular items, facilities) stays on the left.
 */
export function isPackageLine(line) {
  if (line?.kind) return line.kind === "package";
  const label = String(line?.label || "");
  return /package/i.test(label) || /\(whole\s*day\)/i.test(label);
}

/** Quantity encoded in a label, e.g. "Plastic monoblock chair × 20" → 20. */
function qtyFromLabel(label) {
  const match = String(label || "").match(/[×x]\s*(\d+)/);
  return match ? Number(match[1]) : 0;
}

/**
 * Removes a leading session prefix ("Morning — " / "Night — ") from per-date
 * lines so the description reads cleanly — the package name already carries
 * Day/Night and the date band already carries the date.
 */
export function stripSessionPrefix(label) {
  return String(label || "").replace(/^(morning|night|day|evening)\s*[—–-]\s*/i, "").trim();
}

/**
 * Splits an aggregated "… × 2 day(s)" line into one row per event date so a
 * two-day booking prints two rows, each showing its own rate.
 */
export function expandLines(lines, eventDates) {
  const dates = Array.isArray(eventDates) ? eventDates : [];
  const out = [];

  for (const line of lines) {
    const label = String(line?.label || "");
    const perDay = label.match(/[×x]\s*(\d+)\s*day\(s\)/i);

    if (!line?.date && perDay && dates.length > 0) {
      const count = Number(perDay[1]) || 1;
      const unit = (Number(line.amount) || 0) / count;
      const base = label.replace(/\s*[×x]\s*\d+\s*day\(s\)\s*/i, "").trim();
      for (const date of dates.slice(0, count)) {
        out.push({ date, label: base, amount: unit });
      }
      continue;
    }

    out.push(line);
  }

  return out;
}

/** CHARGES = unit rate, AMOUNT = extended line total. */
export function chargeAndAmount(line) {
  const amount = Number(line?.amount) || 0;
  const qty = qtyFromLabel(line?.label);
  if (qty > 1) return { charges: amount / qty, amount };
  return { charges: amount, amount };
}

/** Groups rows under their event date, with undated rows last. */
function groupByDate(lines) {
  const sorted = [...lines].sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return String(a.date).localeCompare(String(b.date));
  });

  const groups = [];
  for (const line of sorted) {
    const key = line.date || null;
    const last = groups[groups.length - 1];
    if (last && last.date === key) last.rows.push(line);
    else groups.push({ date: key, rows: [line] });
  }
  return groups;
}

function Field({ label, value }) {
  return (
    <div className="flex gap-2">
      <dt className="w-[150px] shrink-0 uppercase">{label}</dt>
      <dd className="font-semibold">{value || ""}</dd>
    </div>
  );
}

/** Shared table body: date-banded description / charges / amount rows. */
function ChargeRows({ lines, emptyText }) {
  if (!lines.length) {
    return (
      <tr>
        <td
          colSpan={3}
          className="border border-black px-1.5 py-2 text-center italic"
        >
          {emptyText}
        </td>
      </tr>
    );
  }

  return groupByDate(lines).map((group) => (
    <React.Fragment key={group.date || "undated"}>
      {group.date && (
        <tr>
          <td
            colSpan={3}
            className="border border-black bg-neutral-100 px-1.5 py-0.5 font-semibold"
          >
            {formatDisplayDate(group.date)}
          </td>
        </tr>
      )}
      {group.rows.map((line, index) => {
        const { charges, amount } = chargeAndAmount(line);
        return (
          <tr key={`${line.label}-${index}`}>
            <td className="border border-black px-1.5 py-0.5">{line.label}</td>
            <td className="border border-black px-1.5 py-0.5 text-right tabular-nums">
              {formatPeso(charges)}
            </td>
            <td className="border border-black px-1.5 py-0.5 text-right tabular-nums">
              {formatPeso(amount)}
            </td>
          </tr>
        );
      })}
    </React.Fragment>
  ));
}

export default function OrderOfPaymentDocument({
  controlNumber = "",
  date = "",
  clientName = "",
  address = "",
  contactNumber = "",
  activityName = "",
  activityDate = "",
  participants = "",
  chargeLines = [],
  totalAmount = 0,
  eventDates = [],
  signatories = OOP_SIGNATORIES,
  // The "Prepared by" line. Defaults to the currently signed-in user so the
  // printed form shows whoever generated it, with their role underneath.
  preparedBy,
}) {
  const currentUser = useCurrentUser();
  const prepared = preparedBy || currentUser;

  const lines = React.useMemo(
    () =>
      expandLines(
        Array.isArray(chargeLines) ? chargeLines : [],
        eventDates
      ).map((line) => ({ ...line, label: stripSessionPrefix(line.label) })),
    [chargeLines, eventDates]
  );

  const packageLines = lines.filter(isPackageLine);
  const particularLines = lines.filter((line) => !isPackageLine(line));

  const baseTotal = Number(totalAmount) || 0;
  const deposit = baseTotal * OOP_DEPOSIT_RATE;
  // The printed grand total includes the 10% deposit.
  const total = baseTotal + deposit;
  const packageTotal = packageLines.reduce(
    (sum, line) => sum + (Number(line.amount) || 0),
    0
  );

  // Swap the printed "Prepared by" for the signed-in user (name + role).
  const effectiveSignatories = signatories.map((person) =>
    /prepared/i.test(person.role)
      ? {
          ...person,
          name: prepared.name ? prepared.name.toUpperCase() : person.name,
          lines: prepared.roleTitle ? [prepared.roleTitle] : person.lines,
        }
      : person
  );

  return (
    <article className="oop-document mx-auto w-full max-w-[900px] bg-white p-6 text-[10px] leading-snug text-black ring-1 ring-black/10 sm:p-9">
      {/* Letterhead */}
      <header className="relative text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={PAGE_LOGO}
          alt="South Cotabato Official Seal"
          className="absolute left-0 top-0 h-16 w-16 object-contain sm:h-[70px] sm:w-[70px]"
        />
        <div className="px-20">
          {OOP_LETTERHEAD.map((line) => (
            <p key={line} className="uppercase">
              {line}
            </p>
          ))}
          {OOP_LETTERHEAD_OFFICES.map((line) => (
            <p key={line} className="text-[11px] font-bold uppercase">
              {line}
            </p>
          ))}
          {OOP_LETTERHEAD_CONTACT.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </header>

      <hr className="mt-3 border-t border-black" />

      {/* Title */}
      <h3 className="mt-4 text-center text-[13px] font-bold uppercase underline">
        Order of Payment
      </h3>

      {/* Header fields */}
      <dl className="mt-4 max-w-[560px] space-y-0.5">
        <Field label="Ctrl No:" value={controlNumber} />
        <Field label="Date:" value={date} />
        <Field label="Client Name/Company:" value={clientName} />
        <Field label="Address:" value={address} />
        <Field label="Contact Number:" value={contactNumber} />
        <Field label="Activity Name:" value={activityName} />
        <Field label="Activity Date:" value={activityDate} />
        <Field label="No. of Participants:" value={participants} />
      </dl>

      {/* PARTICULARS (venue / items) on the left + PACKAGE RATE on the right */}
      <div className="mt-5 grid gap-4 sm:grid-cols-[1.55fr_1fr]">
        {/* Left — Venue Rental and particular items */}
        <section>
          <h4 className="font-bold uppercase">Particulars:</h4>
          <table className="mt-1.5 w-full border-collapse">
            <thead>
              <tr>
                <th className="border border-black px-1.5 py-0.5 text-left font-bold uppercase">
                  Description
                </th>
                <th className="w-[80px] border border-black px-1.5 py-0.5 text-right font-bold uppercase">
                  Charges
                </th>
                <th className="w-[85px] border border-black px-1.5 py-0.5 text-right font-bold uppercase">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              <ChargeRows
                lines={particularLines}
                emptyText="No venue / particular charges."
              />
            </tbody>
            <tfoot>
              <tr>
                <td
                  colSpan={2}
                  className="border border-black px-1.5 py-0.5 text-right font-bold uppercase"
                >
                  Total Amount (including 10% deposit)
                </td>
                <td className="border border-black px-1.5 py-0.5 text-right font-bold tabular-nums">
                  {formatPeso(total)}
                </td>
              </tr>
              <tr>
                <td
                  colSpan={2}
                  className="border border-black px-1.5 py-0.5 text-right font-bold uppercase"
                >
                  10% Deposit of Total Payment (Required)
                </td>
                <td className="border border-black px-1.5 py-0.5 text-right font-bold tabular-nums">
                  {formatPeso(deposit)}
                </td>
              </tr>
            </tfoot>
          </table>
        </section>

        {/* Right — the packages that were booked */}
        <section>
          <h4 className="font-bold uppercase">Package Rate:</h4>
          <table className="mt-1.5 w-full border-collapse">
            <thead>
              <tr>
                <th className="border border-black px-1.5 py-0.5 text-left font-bold uppercase">
                  Description
                </th>
                <th className="w-[80px] border border-black px-1.5 py-0.5 text-right font-bold uppercase">
                  Charges
                </th>
                <th className="w-[85px] border border-black px-1.5 py-0.5 text-right font-bold uppercase">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              <ChargeRows
                lines={packageLines}
                emptyText="No packages selected."
              />
            </tbody>
            <tfoot>
              <tr>
                <td
                  colSpan={2}
                  className="border border-black px-1.5 py-0.5 text-right font-bold uppercase"
                >
                  Total Amount Charge
                </td>
                <td className="border border-black px-1.5 py-0.5 text-right font-bold tabular-nums">
                  {formatPeso(packageTotal)}
                </td>
              </tr>
            </tfoot>
          </table>

          <div className="mt-3 border border-black p-2">
            <p className="font-bold">
              Inclusive:{" "}
              <span className="font-normal italic">
                Free use of the ff. amenities/facilities:
              </span>
            </p>
            <ol className="mt-1 list-decimal space-y-0.5 pl-5">
              {OOP_INCLUSIVE.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </div>
        </section>
      </div>

      {/* Signatories */}
      <div className="mt-12 grid grid-cols-3 gap-4 text-center">
        {effectiveSignatories.map((person) => (
          <div key={person.role}>
            <p className="text-left">{person.role}</p>
            <p className="mt-8 font-bold uppercase">{person.name}</p>
            {person.lines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        ))}
      </div>

      <style jsx global>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            background: white !important;
          }
          /* Print only the document, not the surrounding panel chrome. */
          body * {
            visibility: hidden;
          }
          .oop-document,
          .oop-document * {
            visibility: visible;
          }
          .oop-document {
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
