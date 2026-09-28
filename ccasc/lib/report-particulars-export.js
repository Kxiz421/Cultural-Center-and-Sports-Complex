import { esc } from "@/lib/csv";
import { movementFilterLabel } from "@/lib/report-particulars";

/**
 * CSV export for the PARTICULARS STOCK REPORT.
 *
 * Mirrors the printed document: the per-particular summary (stock on hand and
 * the restocked / damaged quantities of the period), the chronological movement
 * log with the staff member behind each entry, then the totals block.
 *
 * The Movement filter of the report is echoed in the header, and the summary
 * keeps both quantity columns even when the report is narrowed to one movement
 * type (the printed document drops the empty column, a spreadsheet does not
 * need to).
 *
 * Quantities are plain integers — unlike the revenue exports there is no money
 * column, so `lib/csv.js`'s `money()` helper is not used here.
 */
export function buildParticularsCsv(report) {
  if (!report) return "";

  const totals = report.totals || {};
  const lines = [
    "PARTICULARS STOCK REPORT",
    report.heading || "",
    `Coverage: ${report.filterLabel || "All Particulars"}`,
    `Movement: ${movementFilterLabel(report.movement)}`,
    `Period: ${report.rangeLabel || ""}`,
    "",
    "PARTICULAR SUMMARY",
    [
      "PARTICULAR",
      "STOCK ON HAND",
      "RESTOCKED",
      "DAMAGED",
      "NET CHANGE",
      "RECORDS",
    ].join(","),
  ];

  for (const group of report.groups || []) {
    lines.push(
      [
        esc(group.particularName),
        group.stockOnHand ?? 0,
        group.restocked,
        group.damaged,
        group.netChange,
        group.records,
      ].join(",")
    );
  }

  lines.push("");
  lines.push(
    ["TOTAL RESTOCKED", totals.restocked ?? 0].join(",")
  );
  lines.push(["TOTAL DAMAGED", totals.damaged ?? 0].join(","));
  lines.push(["NET CHANGE", totals.netChange ?? 0].join(","));
  lines.push(["RECORDS", totals.records ?? 0].join(","));
  lines.push(["PARTICULARS COVERED", totals.particulars ?? 0].join(","));
  lines.push(
    ["PARTICULARS WITH MOVEMENT", totals.particularsWithMovement ?? 0].join(",")
  );
  lines.push(["TOTAL STOCK ON HAND", totals.stockOnHand ?? 0].join(","));

  lines.push("");
  lines.push("MOVEMENT LOG");
  lines.push(
    [
      "DATE",
      "TIME",
      "PARTICULAR",
      "TYPE",
      "QTY",
      "RESTOCKED BY / REPORTED BY",
      "STAFF ID",
    ].join(",")
  );

  for (const section of report.sections || []) {
    if (section.band) lines.push(esc(section.band));
    for (const row of section.rows || []) {
      lines.push(
        [
          esc(row.dateLabel),
          esc(row.timeLabel),
          esc(row.particularName),
          esc(row.typeLabel),
          row.quantity,
          esc(row.performedByName),
          esc(row.performedById),
        ].join(",")
      );
    }
  }

  return lines.join("\n");
}

/** Triggers a browser download of the CSV. Returns false when empty. */
export function downloadParticularsCsv(report, filename) {
  const csv = buildParticularsCsv(report);
  if (!csv) return false;

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download =
    filename ||
    `particulars-stock-report-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}
