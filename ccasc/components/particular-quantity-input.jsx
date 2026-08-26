"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

function clampQty(value, max) {
  const cap = Number(max) || 999;
  if (value < 0) return 0;
  if (value > cap) return cap;
  return value;
}

/**
 * Quantity field that updates parent state on each keystroke (not only blur/Enter).
 * Uses text + inputMode numeric so multi-digit typing stays responsive.
 */
export function ParticularQuantityInput({
  value = 0,
  max = 999,
  onChange,
  className,
  disabled,
}) {
  const numericValue = Number(value) || 0;
  const [draft, setDraft] = React.useState(String(numericValue));
  const [focused, setFocused] = React.useState(false);
  const lastEmittedRef = React.useRef(numericValue);

  React.useEffect(() => {
    lastEmittedRef.current = numericValue;
    if (!focused) {
      setDraft(String(numericValue));
    }
  }, [numericValue, focused]);

  // Sync display when parent changes value (e.g. +/- buttons while input is focused).
  React.useEffect(() => {
    if (numericValue !== lastEmittedRef.current) {
      setDraft(String(numericValue));
      lastEmittedRef.current = numericValue;
    }
  }, [numericValue]);

  const applyValue = (raw) => {
    if (raw === "") {
      lastEmittedRef.current = 0;
      onChange(0);
      return;
    }
    const parsed = parseInt(raw, 10);
    if (Number.isNaN(parsed)) {
      lastEmittedRef.current = 0;
      onChange(0);
      return;
    }
    const next = clampQty(parsed, max);
    lastEmittedRef.current = next;
    onChange(next);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      disabled={disabled}
      value={focused ? draft : String(numericValue)}
      onFocus={() => {
        setFocused(true);
        setDraft(String(numericValue));
      }}
      onBlur={() => {
        setFocused(false);
        if (draft === "") {
          lastEmittedRef.current = 0;
          onChange(0);
          setDraft("0");
        } else {
          const parsed = parseInt(draft, 10);
          const next = Number.isNaN(parsed) ? 0 : clampQty(parsed, max);
          lastEmittedRef.current = next;
          onChange(next);
          setDraft(String(next));
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      onChange={(e) => {
        const raw = e.target.value.replace(/\D/g, "");
        setDraft(raw);
        if (raw !== "") {
          applyValue(raw);
        }
      }}
      className={cn(
        "min-w-[2.5rem] w-14 shrink-0 text-center text-sm border border-input rounded-md",
        "bg-background text-foreground py-1 px-2 tabular-nums",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        className
      )}
    />
  );
}
