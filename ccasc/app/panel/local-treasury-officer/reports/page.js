"use client";

import * as React from "react";
import { ReportGenerationScreen } from "@/components/report-generation-screen";

/**
 * Local Treasury Officer reports: both venues, every report type, for revenue
 * reconciliation.
 */
export default function LTOOReportsPage() {
  return (
    <ReportGenerationScreen description="Generate a monthly, weekly or yearly report for the Cultural Center and Sports Complex: the LIST OF SCGCC ACTIVITIES document, or the revenue per particular, venue or package, for reconciliation. Every report can be printed or exported." />
  );
}
