"use client";

import * as React from "react";
import { ParticularsReportScreen } from "@/components/particulars-report-screen";

/**
 * Admin particulars report: restocking and damage movements of one particular
 * or of every particular. Opened from the "Generate Report" button on
 * `/panel/admin/particulars`.
 */
export default function AdminParticularsReportsPage() {
  return (
    <ParticularsReportScreen description="Generate a monthly, weekly, yearly or single-day report of a particular's restocking and damage records — the date, the quantity and the staff member behind each entry. Every report can be printed or exported." />
  );
}
