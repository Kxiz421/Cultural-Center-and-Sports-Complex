"use client";

import { ParticularsReportScreen } from "@/components/particulars-report-screen";

/**
 * Program Coordinator — Cultural Center: particulars stock report.
 *
 * Same document and actions as the admin report page, reached from the
 * "Generate Report" button of the coordinator's particulars module, and using
 * the same `/api/particulars/reports` payload so both panels stay identical.
 */
export default function CoordinatorParticularsReportsPage() {
  return (
    <ParticularsReportScreen
      backHref="/panel/program-coordinator/particulars"
      description="Generate a monthly, weekly, yearly or single-day report of the restocking and damage records of a particular — or of all particulars — with the date and the staff member behind each entry. Every report can be printed or exported."
    />
  );
}
