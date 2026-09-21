/**
 * CSV export for the LIST OF SCGCC ACTIVITIES report.
 *
 * Mirrors the printed document (DATE / ACTIVITIES / TIME / AMOUNT plus the
 * summary block) and — like every other generated report — omits receipt
 * (OR) numbers entirely.
 */

/** Quotes a CSV field only when it contains a comma, quote or newline. */
function esc(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Bare 2-decimal figure — avoids thousands separators breaking CSV columns. */
function money(value) {
  return (Number(value) || 0).toFixed(2);
}

export function buildActivitiesCsv(report) {
  if (!report) return "";

  const totals = report.totals || {};
  const lines = [
    "LIST OF SCGCC ACTIVITIES",
    report.heading || "",
    "",
    ["DATE", "ACTIVITIES", "TIME", "AMOUNT"].join(","),
  ];

  for (const section of report.sections || []) {
    if (section.band) lines.push(esc(section.band));
    for (const row of section.rows || []) {
      lines.push(
        [
          esc(row.dayLabel),
          esc(row.activities),
          esc(row.time),
          money(row.amount),
        ].join(",")
      );
    }
  }

  lines.push("");
  lines.push(["TOTAL AMOUNT", money(totals.totalAmount)].join(","));
  lines.push(
    ["TOTAL AMOUNT CHARGED TO PGO", money(totals.chargedToPgo)].join(",")
  );
  lines.push(["PGSC ACTIVITIES - FOC", money(totals.pgscFoc)].join(","));
  lines.push(
    [
      "TOTAL AMOUNT PAID BY PRIVATE SECTORS EVENT",
      money(totals.privateSectors),
    ].join(",")
  );
  lines.push(["TOTAL INCOME", money(totals.totalIncome)].join(","));

  return lines.join("\n");
}

/** Triggers a browser download of the CSV. Returns false when empty. */
export function downloadActivitiesCsv(report, filename) {
  const csv = buildActivitiesCsv(report);
  if (!csv) return false;

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download =
    filename ||
    `list-of-activities-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}
