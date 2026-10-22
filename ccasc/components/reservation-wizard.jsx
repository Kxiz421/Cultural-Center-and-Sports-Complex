"use client";

import * as React from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Presentational wizard chrome shared by the client and accounting-clerk
 * "New Reservation" forms. It holds no business logic — each form keeps its own
 * step list, validation and Next gating.
 */

/** Google-signup-style numbered step header. Completed steps are clickable. */
export function WizardSteps({ steps, current, onSelect }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-2">
      {steps.map((label, i) => {
        const isDone = i < current;
        const isCurrent = i === current;
        const clickable = Boolean(onSelect) && i < current;
        return (
          <li key={label} className="flex items-center gap-2">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onSelect(i)}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition",
                isCurrent &&
                  "border-primary bg-primary font-medium text-primary-foreground",
                isDone && "border-emerald-300 bg-emerald-50 text-emerald-700",
                !isCurrent && !isDone && "border-border text-muted-foreground",
                clickable && "cursor-pointer hover:opacity-80"
              )}
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  isCurrent && "bg-primary-foreground text-primary",
                  isDone && "bg-emerald-600 text-white",
                  !isCurrent && !isDone && "bg-muted text-muted-foreground"
                )}
              >
                {isDone ? <Check className="size-3" /> : i + 1}
              </span>
              <span className="whitespace-nowrap">{label}</span>
            </button>
            {i < steps.length - 1 && (
              <ChevronRight className="text-muted-foreground size-4 shrink-0" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Back / Next row. The final step renders its own submit button instead. */
export function WizardNav({
  onBack,
  onNext,
  backLabel = "Back",
  nextLabel = "Next",
  nextDisabled = false,
  hideNext = false,
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Button type="button" variant="outline" onClick={onBack} disabled={!onBack}>
        <ChevronLeft className="mr-2 size-4" />
        {backLabel}
      </Button>
      {!hideNext && (
        <Button type="button" onClick={onNext} disabled={nextDisabled}>
          {nextLabel}
          <ChevronRight className="ml-2 size-4" />
        </Button>
      )}
    </div>
  );
}
