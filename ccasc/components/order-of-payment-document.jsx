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
 *
 * SPORTS COMPLEX VARIANT: when `venueName` names the Sports Complex the
 * document is rendered as the official SCSC form (see
 * {@link SportsComplexOrderOfPayment}) — SCEEMO / SCSC letterhead, the fixed
 * A–F rate card with a single PARTICULARS / FEES / AMOUNT table, the ten
 * printed terms and the SCSC signatories. The Cultural Center keeps the
 * original layout above untouched.
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

/** Same office/address, but the Sports Complex prints its own facility + page. */
export const OOP_LETTERHEAD_CONTACT_SPORTS = [
  "Alunan Ave., Brgy. Zone IV, City of Koronadal",
  "Tel. No. (083) 228-9314 • Facebook: South Cotabato Sports Complex",
];

/** The facility line on the letterhead, per venue. */
export const OOP_FACILITY = {
  CULTURAL_CENTER: "South Cotabato Gymnasium and Cultural Center",
  SPORTS_COMPLEX: "South Cotabato Sports Complex",
};

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

/* ------------------------------------------------------------------ *
 * Sports Complex (SCSC) Order of Payment — the printed form
 * ------------------------------------------------------------------ */

/** Letterhead printed on the SCSC Order of Payment (see the paper form). */
export const SCSC_LETTERHEAD_LINES = [
  { text: "Republic of the Philippines" },
  { text: "Province of South Cotabato" },
  { text: "South Cotabato Economic Enterprise Management Office", bold: true },
  { text: "South Cotabato Sports Complex", bold: true },
  { text: "Koronadal City" },
];

/**
 * The fixed A–F rate card printed on the SCSC form. The AMOUNT column is
 * filled from the actual booking: every row may carry `match` regexes, and a
 * charge line whose label matches one of them is charged to that row. Rows
 * without a match (or that no line matched) print their fee and leave AMOUNT
 * blank, exactly like the paper form.
 */
export const SCSC_RATE_CARD = [
  {
    section: "A. Entrance to Facilities",
    rows: [
      {
        label: "TRACK OVAL PER PERSON 163 pax",
        fee: "P10.00",
        match: [/track\s*oval.*per\s*person/i, /per\s*person.*track\s*oval/i],
      },
      { label: "SWIMMING POOL", fee: "P30.00" },
      { label: "Adult", fee: "P20.00", indent: true },
      {
        label: "Senior Citizen, Children, differently-abled person",
        fee: "P20.00",
        indent: true,
      },
      { label: "TENNIS COURT PER GAME", fee: "" },
      { label: "SEASON PASS", fee: "" },
      {
        label: "Track Oval",
        fee: "P2,000.00 per year",
        indent: true,
        match: [/season\s*pass.*oval/i],
      },
      {
        label: "Swimming Pool",
        fee: "P2,000.00 per month",
        indent: true,
        match: [/season\s*pass.*swim/i],
      },
    ],
  },
  {
    section: "B. Rentals of Facilities",
    rows: [
      {
        label: "Oval",
        fee: "P3,000.00 per day",
        match: [/^(the\s+)?oval\b/i, /\btrack\s*oval\b/i],
      },
      {
        label: "Swimming Pool (Exclusive)",
        fee: "P2,500.00 per day",
        match: [/\bswimming\s*pool\b/i],
      },
      {
        label: "Softball / Football Field (2)",
        fee: "P500.00 per day",
        match: [/\bsoftball\b/i, /\bfootball(\s*field)?\b/i],
      },
      {
        label: "Volleyball Court (2)",
        fee: "P500.00 per day",
        match: [/\bvolleyball\b/i],
      },
      {
        label: "Basketball Court (2)",
        fee: "P500.00 per day",
        match: [/\bbasketball\b/i],
      },
      { label: "Tennis Court (3)", fee: "P500.00 per day", match: [/\btennis\b/i] },
    ],
  },
  {
    section: "C. Use of other facilities",
    rows: [
      {
        label: "Use of lights and sound system (brought from outside)",
        fee: "P1,000.00",
        match: [
          /\boutside\b.*\blights?\b/i,
          /\blights?\s*(?:and|&)\s*sounds?\s*system\b(?!.*grandstand)/i,
        ],
      },
      {
        label: "Use of Concrete Grandstand",
        fee: "P1,200.00",
        match: [/^concrete\s*grandstand(?!\s*\(?\s*with)/i],
      },
      {
        label: "With Lights",
        fee: "P1,700.00",
        indent: true,
        match: [/concrete\s*grandstand.*lights/i],
      },
      {
        label: "With Sounds",
        fee: "P2,200.00",
        indent: true,
        match: [/concrete\s*grandstand.*sounds?/i],
      },
      {
        label: "Use of Wooden Grandstand (2)",
        fee: "P500.00",
        match: [/^wooden\s*grandstand(?!\s*\(?\s*with)/i],
      },
      {
        label: "With Lights",
        fee: "P1,000.00",
        indent: true,
        match: [/wooden\s*grandstand.*lights/i],
      },
      {
        label: "With Sounds",
        fee: "P1,500.00",
        indent: true,
        match: [/wooden\s*grandstand.*sounds?/i],
      },
      {
        label: "Landing Foam",
        fee: "P100.00 per piece per day",
        match: [/landing\s*foam/i],
      },
      {
        label: "Hurdles (75PCS) x 5 x 4days",
        fee: "P5.00 per piece per day",
        match: [/hurdle/i],
      },
      {
        label: "Boxing Ring",
        fee: "P1,000.00 per piece per day",
        match: [/boxing/i],
      },
      {
        label: "Steeplechase",
        fee: "P100.00 per piece per day",
        match: [/steeplechase/i],
      },
    ],
  },
  {
    section: "D. Use of parking area (In front of SCSC)",
    rows: [
      {
        label:
          "Temporary (Product display, Exhibit, and non-government-related activities)",
        fee: "P10.00 per sq.ft. per day",
        match: [/\bparking.*(temporary|display|exhibit)/i],
      },
      {
        label:
          "For permanent Lessee (use of front space other than vehicle parking area as extension of their Business not to exceed 5m in length; the width of extension is the same as the width of their establishment)",
        fee: "P2,000.00 per month",
        match: [/\bparking.*permanent/i, /\blessee\b/i],
      },
      {
        label: "Use of front space for exclusive parking",
        fee: "P1,000.00 per month",
        match: [/\bparking\b/i],
      },
    ],
  },
  {
    section: "E. Commercial Space under the South Cotabato Sports Complex",
    rows: [
      {
        label: "First Floor",
        fee: "P280.00 per sq.m./mo.",
        match: [/\bcommercial\s*space\b/i, /\bfirst\s*floor\b/i],
      },
    ],
  },
  {
    section: "F. SCSC Space along Jaycee Avenue and Alunan Avenue",
    fee: "P160.00 per sq.m./mo.",
    rows: [
      {
        label: "Space rental",
        fee: "P160.00 per sq.m./mo.",
        match: [/\bjaycee\b/i, /\balunan\b/i, /\bscsc\s*space\b/i],
      },
    ],
  },
];

/** The ten terms and conditions printed under the SCSC table. */
export const SCSC_TERMS = [
  "NO Pay, NO Use.",
  "Waste disposal and cleaning of CR's shall be responsibility of clients.",
  "Booking schedule shall comply/final a week before the activities.",
  "Set up/Using equipments, facilities & electricity shall comply ahead of time or before the activities.",
  "Cancellation shall be made at least seven (7) days before the affair /events.",
  "Vendors are not allowed inside.",
  "Secure always all your belongings, we are not liable for any lost.",
  "Accommodation/used (area, facilities, electricity) is until 6pm only except additional schedule was comply by PTO with letter approval by Provincial Governor and SCSC Manager.",
  "Follow / Comply the SCSC Rules and Regulations.",
  "Check payable to Provincial Treasurer's Office",
];

/** Signatories printed on the SCSC form. */
export const SCSC_SIGNATORIES = [
  {
    role: "Recommended by:",
    name: "PAUL REY D. MILLAN",
    lines: ["SCSC Facility Manager"],
  },
  {
    role: "Approved by:",
    name: "TYRON JANN VILLANUEVA",
    lines: ["SCEEMO General Manager Designate"],
  },
];

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
 * Units billed by one charge line: the explicit `quantity` when the line
 * carries one, otherwise the "× N" in its label, otherwise a single unit.
 *
 * Summed per rate-card row so the printed QUANTITY column reconciles with the
 * booking — courts × days, pieces × days, pax and so on.
 */
function lineQuantity(line) {
  const explicit = Number(line?.quantity);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  return qtyFromLabel(line?.label) || 1;
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
    <div className="flex items-end gap-2">
      <dt className="w-[150px] shrink-0 uppercase">{label}</dt>
      <dd className="min-w-0 flex-1 border-b border-black/70 pb-0.5 font-semibold">
        {value || "\u00A0"}
      </dd>
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

/**
 * Normalises a booking charge label so it can be matched against the rate
 * card: drops session prefixes and quantity/day suffixes
 * ("Morning — Swimming Pool × 2 × 3 day(s)" → "Swimming Pool").
 */
function normalizeChargeLabel(label) {
  return stripSessionPrefix(label)
    .replace(/\s*[×x]\s*\d+(?:\.\d+)?\s*day\(s\)/gi, " ")
    .replace(/\s*[×x]\s*\d+(?:\.\d+)?\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** First rate-card row whose `match` regexes accept the label, else null. */
function findRateCardRow(label) {
  const text = normalizeChargeLabel(label);
  if (!text) return null;

  for (const [sectionIndex, section] of SCSC_RATE_CARD.entries()) {
    for (const [rowIndex, row] of (section.rows || []).entries()) {
      if (!row.match?.some((pattern) => pattern.test(text))) continue;
      return { sectionIndex, rowIndex, row };
    }
  }
  return null;
}

/**
 * Charges the booking's lines against the printed rate card.
 *
 * @param {Array<{date?: string|null, label: string, amount: number}>} lines
 * @returns {{charges: Map<string, {amount: number, quantity: number}>, extras: Array}}
 *   `charges` is keyed `${sectionIndex}::${rowIndex}` so duplicated labels
 *   ("With Lights" exists for both grandstands) stay in their own row.
 *   `extras` holds lines that match no row — they are printed under
 *   "G. Other Charges" so the TOTAL always reconciles with the booking.
 */
export function mapChargeLinesToRateCard(lines = []) {
  const charges = new Map();
  const extras = [];

  for (const line of lines) {
    const found = findRateCardRow(line?.label);
    if (!found) {
      extras.push(line);
      continue;
    }

    const key = `${found.sectionIndex}::${found.rowIndex}`;
    const entry = charges.get(key) || { amount: 0, quantity: 0 };
    entry.amount += Number(line?.amount) || 0;
    entry.quantity += lineQuantity(line);
    charges.set(key, entry);
  }

  return { charges, extras };
}

/**
 * The Sports Complex ORDER OF PAYMENT — a transcription of the printed SCSC
 * form: SCEEMO letterhead with the provincial seal, the red control number, the
 * client/activity field block with the ruled right-hand column, the single
 * SERVICES AND FACILITIES OFFERED table (A–F rate card with QUANTITY and AMOUNT
 * filled from the booking), the ten terms and the Recommended / Approved /
 * Conformed signatories.
 */
function SportsComplexOrderOfPayment({
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
}) {
  const { charges, extras } = React.useMemo(
    () =>
      mapChargeLinesToRateCard(
        Array.isArray(chargeLines) ? chargeLines : []
      ),
    [chargeLines]
  );

  const bookedTotal =
    [...charges.values()].reduce((sum, entry) => sum + entry.amount, 0) +
    extras.reduce((sum, line) => sum + (Number(line?.amount) || 0), 0);
  // The printed TOTAL is the sum of the AMOUNT column; fall back to the
  // reservation's own total when no line could be charged.
  const grandTotal = bookedTotal || Number(totalAmount) || 0;

  /** One rate-card row: particulars / fee / booked amount / date remark. */
  const renderRow = (row, sectionIndex, rowIndex) => {
    const entry = charges.get(`${sectionIndex}::${rowIndex}`);
    return (
      <tr key={`${sectionIndex}-${rowIndex}`}>
        <td
          className={`border border-black px-1.5 py-0.5 ${
            row.indent ? "pl-6" : ""
          }`}
        >
          {row.label}
        </td>
        <td className="border border-black px-1.5 py-0.5 text-right tabular-nums">
          {row.fee || ""}
        </td>
        <td className="border border-black px-1.5 py-0.5 text-right tabular-nums">
          {entry ? entry.quantity : ""}
        </td>
        <td className="border border-black px-1.5 py-0.5 text-right tabular-nums">
          {entry ? formatPeso(entry.amount) : ""}
        </td>
      </tr>
    );
  };

  return (
    <article className="oop-document mx-auto w-full max-w-[900px] bg-white p-6 text-[10px] leading-snug text-black ring-1 ring-black/10 sm:p-9">
      {/* Letterhead — provincial seal on the left, Bagong Pilipinas on the right */}
      <header className="relative text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={PAGE_LOGO}
          alt="South Cotabato Official Seal"
          className="absolute left-0 top-0 h-16 w-16 object-contain sm:h-[70px] sm:w-[70px]"
        />
        <div className="px-24">
          {SCSC_LETTERHEAD_LINES.map((line) => (
            <p
              key={line.text}
              className={
                line.bold ? "text-[12px] font-bold uppercase" : "uppercase"
              }
            >
              {line.text}
            </p>
          ))}
        </div>
      </header>

      {/* Control number, printed in red on the form */}
      <p className="mt-3 text-[11px] text-red-700">
        Control No.:{" "}
        <span className="font-bold underline">{controlNumber}</span>
      </p>

      {/* Title */}
      <h3 className="mt-4 text-center text-[14px] font-bold uppercase">
        Order of Payment
      </h3>

      {/* Client / activity fields on the left, ruled reference block on the right */}
      <div className="mt-4 flex items-start justify-between gap-8">
        <dl className="space-y-0.5 text-[11px]">
          <div className="flex items-end gap-2">
            <dt className="w-[135px] shrink-0 font-semibold uppercase">
              Client/Company:
            </dt>
            <dd className="min-w-0 flex-1 border-b border-black/70 pb-0.5">
              {clientName || "\u00A0"}
            </dd>
          </div>
          <div className="flex items-end gap-2">
            <dt className="w-[135px] shrink-0 uppercase">Address:</dt>
            <dd className="min-w-0 flex-1 border-b border-black/70 pb-0.5">
              {address || "\u00A0"}
            </dd>
          </div>
          <div className="flex items-end gap-2">
            <dt className="w-[135px] shrink-0 uppercase">Activity:</dt>
            <dd className="min-w-0 flex-1 border-b border-black/70 pb-0.5">
              {activityName || "\u00A0"}
            </dd>
          </div>
          <div className="flex items-end gap-2">
            <dt className="w-[135px] shrink-0 uppercase">Time/Date:</dt>
            <dd className="min-w-0 flex-1 border-b border-black/70 pb-0.5">
              {activityDate || "\u00A0"}
            </dd>
          </div>
          <div className="flex items-end gap-2">
            <dt className="w-[135px] shrink-0 uppercase">
              Telephone No. /Cellphone #:
            </dt>
            <dd className="min-w-0 flex-1 border-b border-black/70 pb-0.5">
              {contactNumber || "\u00A0"}
            </dd>
          </div>
          <div className="flex items-end gap-2">
            <dt className="w-[135px] shrink-0 uppercase">
              Participants/ attendees:
            </dt>
            <dd className="min-w-0 flex-1 border-b border-black/70 pb-0.5">
              {participants || "\u00A0"}
            </dd>
          </div>
        </dl>

        <div className="w-[260px] shrink-0 text-[11px]">
          <p className="border-b border-black pb-0.5 text-center">
            {clientName || "\u00A0"}
          </p>
          <p className="h-5 border-b border-black" />
          <p className="border-b border-black pb-0.5 text-center">
            {date || "\u00A0"}
          </p>
          <p className="h-5 border-b border-black" />
          <p className="h-5 border-b border-black" />
        </div>
      </div>

      {/* SERVICES AND FACILITIES OFFERED — the A–F rate card + AMOUNT */}
      <table className="mt-4 w-full border-collapse text-[10px]">
        <thead>
          <tr>
            <td
              colSpan={2}
              className="border border-black px-1.5 py-0.5 text-center font-bold uppercase text-red-800"
            >
              Services and Facilities Offered
            </td>
            <td className="border border-black px-1.5 py-0.5 text-center font-bold uppercase">
              Quantity
            </td>
            <td className="border border-black px-1.5 py-0.5 text-center font-bold uppercase">
              Amount
            </td>
          </tr>
          <tr>
            <td className="border border-black px-1.5 py-0.5 text-center font-bold uppercase">
              Particulars:
            </td>
            <td className="border border-black px-1.5 py-0.5 text-center font-bold uppercase">
              Fees
            </td>
            <td colSpan={2} className="border border-black px-1.5 py-0.5" />
          </tr>
        </thead>
        <tbody>
          {SCSC_RATE_CARD.map((section, sectionIndex) => (
            <React.Fragment key={section.section}>
              <tr>
                <td className="border border-black px-1.5 py-0.5 font-semibold">
                  {section.section}
                </td>
                <td className="border border-black px-1.5 py-0.5 text-right tabular-nums">
                  {section.fee || ""}
                </td>
                <td className="border border-black px-1.5 py-0.5" />
                <td className="border border-black px-1.5 py-0.5" />
              </tr>
              {section.rows.map((row, rowIndex) =>
                renderRow(row, sectionIndex, rowIndex)
              )}
            </React.Fragment>
          ))}

          {/* Booking charges that fit no printed row still have to be billed */}
          {extras.length > 0 && (
            <React.Fragment key="extras">
              <tr>
                <td
                  colSpan={4}
                  className="border border-black px-1.5 py-0.5 font-semibold"
                >
                  G. Other Charges
                </td>
              </tr>
              {extras.map((line, index) => (
                <tr key={`extra-${index}`}>
                  <td className="border border-black px-1.5 py-0.5">
                    {stripSessionPrefix(line?.label || "")}
                  </td>
                  <td className="border border-black px-1.5 py-0.5 text-right tabular-nums" />
                  <td className="border border-black px-1.5 py-0.5 text-right tabular-nums">
                    {lineQuantity(line)}
                  </td>
                  <td className="border border-black px-1.5 py-0.5 text-right tabular-nums">
                    {formatPeso(line?.amount)}
                  </td>
                </tr>
              ))}
            </React.Fragment>
          )}
        </tbody>
        <tfoot>
          <tr>
            <td
              colSpan={3}
              className="border border-black px-1.5 py-1 text-right font-bold uppercase"
            >
              Total
            </td>
            <td className="border border-black px-1.5 py-1 text-right font-bold tabular-nums text-red-700">
              {formatPeso(grandTotal)}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Terms and conditions printed under the table */}
      <ol className="mt-3 list-decimal space-y-0.5 pl-5 text-[10px]">
        {SCSC_TERMS.map((term) => (
          <li key={term}>{term}</li>
        ))}
      </ol>

      {/* Signatories — Recommended / Approved side by side, Conformed below */}
      <div className="mt-10 grid grid-cols-2 gap-8">
        {SCSC_SIGNATORIES.map((person) => (
          <div key={person.role}>
            <p>{person.role}</p>
            <p className="mt-8 font-bold uppercase underline">{person.name}</p>
            {person.lines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        ))}
      </div>

      <div className="mt-10">
        <p>Conformed by:</p>
        <p className="mt-12 w-[280px] border-t border-black pt-1 text-center text-[10px]">
          Client&apos;s Name and Signature
        </p>
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
            padding: 12mm;
            box-shadow: none !important;
            --tw-ring-shadow: 0 0 #0000 !important;
          }
          .no-print {
            display: none !important;
          }
          .oop-document tr {
            break-inside: avoid;
          }
          @page {
            size: A4 portrait;
            /* No page margin: the browser prints its URL/date/page-number
               header and footer inside the page margin, so leaving it out
               keeps them off the printout. The 12mm inset is applied to the
               document padding above instead. */
            margin: 0;
          }
        }
      `}</style>
    </article>
  );
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
  // Venue the reservation is for. Drives the letterhead facility line and the
  // Facebook contact so a Sports Complex booking doesn't print the Gymnasium.
  venueName = "",
  signatories = OOP_SIGNATORIES,
  // The "Prepared by" line. Defaults to the currently signed-in user so the
  // printed form shows whoever generated it, with their role underneath.
  preparedBy,
}) {
  const currentUser = useCurrentUser();
  const prepared = preparedBy || currentUser;

  // Venue-specific letterhead: the last office line names the facility, and the
  // Sports Complex has its own Facebook page.
  const isSportsComplex = /sports\s*complex/i.test(String(venueName));
  const officeLines = [
    ...OOP_LETTERHEAD_OFFICES.slice(0, -1),
    isSportsComplex ? OOP_FACILITY.SPORTS_COMPLEX : OOP_FACILITY.CULTURAL_CENTER,
  ];
  const contactLines = isSportsComplex
    ? OOP_LETTERHEAD_CONTACT_SPORTS
    : OOP_LETTERHEAD_CONTACT;

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

  // Sports Complex bookings print the official SCSC form (rate card + terms
  // + SCSC signatories); the Cultural Center keeps the original layout below.
  if (isSportsComplex) {
    return (
      <SportsComplexOrderOfPayment
        controlNumber={controlNumber}
        date={date}
        clientName={clientName}
        address={address}
        contactNumber={contactNumber}
        activityName={activityName}
        activityDate={activityDate}
        participants={participants}
        chargeLines={lines}
        totalAmount={totalAmount}
      />
    );
  }

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
          {officeLines.map((line) => (
            <p key={line} className="text-[11px] font-bold uppercase">
              {line}
            </p>
          ))}
          {contactLines.map((line) => (
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
            padding: 12mm;
            box-shadow: none !important;
            --tw-ring-shadow: 0 0 #0000 !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4 portrait;
            /* No page margin: the browser prints its URL/date/page-number
               header and footer inside the page margin, so leaving it out
               keeps them off the printout. The 12mm inset is applied to the
               document padding above instead. */
            margin: 0;
          }
        }
      `}</style>
    </article>
  );
}
