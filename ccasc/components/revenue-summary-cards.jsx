"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

function formatPhp(amount) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(Number(amount) || 0);
}

/**
 * The four revenue windows every revenue-bearing staff dashboard shows.
 *
 * `revenue` is the `{ daily, weekly, monthly, yearly }` object returned by the
 * dashboard APIs (see `lib/revenue-summary.js`). `note` may be a string or a
 * `(key) => string` function to caption each card for its scope — e.g. when the
 * dashboard only covers one venue instead of both.
 */
const REVENUE_WINDOWS = [
  { key: "daily", label: "Daily Revenue", note: "Receipts recorded today." },
  { key: "weekly", label: "Weekly Revenue", note: "Since Sunday this week." },
  { key: "monthly", label: "Monthly Revenue", note: "This calendar month." },
  { key: "yearly", label: "Yearly Revenue", note: "This calendar year." },
];

export function RevenueSummaryCards({ revenue, note, className }) {
  const values = revenue || {};

  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {REVENUE_WINDOWS.map((window) => (
        <Card key={window.key}>
          <CardHeader className="pb-2">
            <CardDescription>{window.label}</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {formatPhp(values[window.key])}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-xs">
            {typeof note === "function"
              ? note(window.key)
              : note || window.note}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default RevenueSummaryCards;
