import { esc, money } from "@/lib/csv";

/**
 * CSV export for the REVENUE report.
 *
 * Mirrors the printed document: the revenue grouped per particular / venue /
 * package / facility, the summary block, then the itemised charges (package,
 * particulars used and facilities booked) behind the figures.
 */
export function buildRevenueCsv(report) {
  if (!report) return "";

  const totals = report.totals || {};
  const groups = report.groups || [];
  const groupLabel = (report.groupLabel || "Particular").toUpperCase();
  const showQuantity = groups.some((group) => Number(group.quantity) > 0);
  const lines = [
    "REVENUE REPORT",
    `BY ${groupLabel} - ${report.filterLabel || ""}`,
    report.heading || "",
    `Venue scope: ${report.venueScopeLabel || "All Venues"}`,
    "",
    [
      groupLabel,
      "RESERVATIONS",
      ...(showQuantity ? ["QTY"] : []),
      "AMOUNT",
      "COLLECTED",
      "BALANCE",
    ].join(","),
  ];

  for (const group of groups) {
    lines.push(
      [
        esc(group.label),
        group.reservations,
        ...(showQuantity ? [group.quantity || 0] : []),
        money(group.amount),
        money(group.collected),
        money(group.balance),
      ].join(",")
    );
  }

  lines.push("");
  lines.push(["TOTAL REVENUE", money(totals.amount)].join(","));
  lines.push(["TOTAL COLLECTED", money(totals.collected)].join(","));
  lines.push(["BALANCE", money(totals.balance)].join(","));
  lines.push(["RESERVATIONS COVERED", totals.reservations ?? 0].join(","));

  lines.push("");
  lines.push("CHARGES INCLUDED - PACKAGE, PARTICULARS USED AND FACILITIES");
  lines.push(
    [
      "DATE",
      "ACTIVITY",
      "CLIENT",
      "PACKAGE",
      "PARTICULAR / FACILITY USED",
      "TYPE",
      "QTY",
      "AMOUNT",
      "COLLECTED",
      "BALANCE",
    ].join(",")
  );

  for (const row of report.items || []) {
    lines.push(
      [
        esc(row.dayLabel),
        esc(row.eventType),
        esc(row.clientName),
        esc(row.packageName),
        esc(row.itemLabel),
        esc(row.itemType),
        row.quantity || 0,
        money(row.amount),
        money(row.collected),
        money(row.balance),
      ].join(",")
    );
  }

  return lines.join("\n");
}

/** Triggers a browser download of the CSV. Returns false when empty. */
export function downloadRevenueCsv(report, filename) {
  const csv = buildRevenueCsv(report);
  if (!csv) return false;

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download =
    filename || `revenue-report-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}
