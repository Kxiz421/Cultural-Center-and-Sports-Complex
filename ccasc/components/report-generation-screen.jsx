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
import ReportRevenueDocument from "@/components/report-revenue-document";
import { downloadActivitiesCsv } from "@/lib/report-activities-export";
import { downloadRevenueCsv } from "@/lib/report-revenue-export";
import { useReports } from "@/hooks/use-reports";

/**
 * The complete "Report Generation" screen used by every panel.
 *
 * The Admin, Accounting Clerk, Local Treasury Officer and Program Coordinator
 * report pages are thin wrappers around this component; only the description,
 * the optional venue scope note and whether the Venue dropdown is shown differ.
 *
 * The Report Type toggle decides which document is generated and exported:
 * the LIST OF SCGCC ACTIVITIES report, or the REVENUE report per particular /
 * venue / package.
 *
 * @param {object} props
 * @param {string} [props.description] header copy under the page title
 * @param {string} [props.scopeNote] shown when the panel is limited to a venue
 * @param {boolean} [props.showVenue] render the Venue dropdown (staff only)
 * @param {string} [props.venueIds] venue ids the report is narrowed to
 */
export function ReportGenerationScreen({
  description,
  scopeNote,
  showVenue = true,
  venueIds,
}) {
  const reports = useReports({ venueIds });
  const isRevenue = reports.reportType === "revenue";
  // Sports Complex revenue is only ever reported per facility.
  const isFacilityOnly =
    isRevenue &&
    reports.revenueGroups.length === 1 &&
    reports.revenueGroups[0] === "facility";

  const handleExportCsv = () => {
    if (!reports.report) return;
    const exported = isRevenue
      ? downloadRevenueCsv(reports.report)
      : downloadActivitiesCsv(reports.report);

    if (exported) {
      toast.success("Report exported as CSV");
    } else {
      toast.error("No data to export");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="no-print">
        <ReportPageHeader description={description} />
      </div>

      {scopeNote && (
        <div className="no-print rounded-lg border bg-muted/40 px-3 py-2 text-sm">
          {scopeNote}
        </div>
      )}

      {isFacilityOnly && (
        <p className="no-print text-muted-foreground text-sm">
          Sports Complex revenue is booked per facility, so this report is
          grouped per facility only - packages and particulars are not part of
          Sports Complex billing.
        </p>
      )}

      <div className="no-print">
        <ReportControls
          reportType={reports.reportType}
          onReportTypeChange={reports.setReportType}
          period={reports.period}
          onPeriodChange={reports.setPeriod}
          month={reports.month}
          onMonthChange={reports.setMonth}
          week={reports.week}
          onWeekChange={reports.setWeek}
          year={reports.year}
          onYearChange={reports.setYear}
          venue={reports.venue}
          onVenueChange={showVenue ? reports.setVenue : undefined}
          revenueGroup={reports.revenueGroup}
          onRevenueGroupChange={reports.setRevenueGroup}
          revenueGroups={reports.revenueGroups}
          specific={reports.specific}
          onSpecificChange={reports.setSpecific}
          specificOptions={reports.specificOptions}
          optionsLoading={reports.optionsLoading}
          onGenerate={reports.generate}
          loading={reports.loading}
        />
      </div>

      {reports.report ? (
        <>
          <div className="no-print">
            <ReportActions
              onExportPdf={reports.printReport}
              onExportCsv={handleExportCsv}
            />
          </div>
          {isRevenue ? (
            <ReportRevenueDocument report={reports.report} />
          ) : (
            <ReportActivitiesDocument report={reports.report} />
          )}
        </>
      ) : (
        <div className="no-print">
          <ReportEmptyState />
        </div>
      )}
    </div>
  );
}
