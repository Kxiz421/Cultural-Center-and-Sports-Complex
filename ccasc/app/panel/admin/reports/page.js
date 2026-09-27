"use client";

import * as React from "react";
import { ReportGenerationScreen } from "@/components/report-generation-screen";

/**
 * Admin reports: both venues, every report type.
 */
export default function AdminReportsPage() {
  return (
    <ReportGenerationScreen description="Generate a monthly, weekly or yearly report for the Cultural Center and Sports Complex: the LIST OF SCGCC ACTIVITIES document, or the revenue per particular, venue or package. Every report can be printed or exported." />
  );
}
