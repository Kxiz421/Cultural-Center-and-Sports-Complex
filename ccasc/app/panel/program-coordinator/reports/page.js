"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  ReportActions,
  ReportControls,
  ReportEmptyState,
  ReportPageHeader,
} from "@/components/report-generator";
import ReportActivitiesDocument from "@/components/report-activities-document";
import { downloadActivitiesCsv } from "@/lib/report-activities-export";
import { useActivitiesReport } from "@/hooks/use-activities-report";

/**
 * The Program Coordinator only handles the Cultural Center (venueId 1), so the
 * activity report is scoped to that venue. Everything else — the period
 * selector, the generated document and the exports — is identical to the other
 * report screens.
 */
export default function CoordinatorReportsPage() {
  const report = useActivitiesReport({ venueIds: "1" });

  const handleExportCsv = () => {
    if (!report.report) return;
    if (!downloadActivitiesCsv(report.report)) {
      toast.error("No data to export");
    } else {
      toast.success("Report exported as CSV");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="no-print">
        <ReportPageHeader description="Generate a monthly, weekly or yearly list of activities for the Cultural Center. Every report prints in the official LIST OF SCGCC ACTIVITIES format." />
      </div>

      <div className="no-print">
        <ReportControls
          period={report.period}
          onPeriodChange={report.setPeriod}
          month={report.month}
          onMonthChange={report.setMonth}
          week={report.week}
          onWeekChange={report.setWeek}
          year={report.year}
          onYearChange={report.setYear}
          onGenerate={report.generate}
          loading={report.loading}
        />
      </div>

      {report.report ? (
        <>
          <div className="no-print">
            <ReportActions
              onExportPdf={report.printReport}
              onExportCsv={handleExportCsv}
            />
          </div>
          <ReportActivitiesDocument report={report.report} />
        </>
      ) : (
        <div className="no-print">
          <ReportEmptyState />
        </div>
      )}
    </div>
  );
}
