"use client";

import * as React from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ParticularQuantityInput } from "@/components/particular-quantity-input";

const HOLD_SNAP_MS = 5000;
const HOLD_STEP_MS = 100;

function clampQty(value, max) {
  const cap = Number(max) || 999;
  if (value < 0) return 0;
  if (value > cap) return cap;
  return value;
}

/**
 * Minus/plus controls with hold-to-repeat; hold 5s snaps to 0 (minus) or max (plus).
 */
export function ParticularQuantityStepper({
  value = 0,
  max = 999,
  onChange,
  disabled,
  className,
  buttonClassName,
  inputClassName,
}) {
  const numericValue = Number(value) || 0;
  const cap = Number(max) || 999;
  const valueRef = React.useRef(numericValue);
  const holdTimerRef = React.useRef(null);
  const startTimeRef = React.useRef(0);
  const directionRef = React.useRef(0);

  valueRef.current = numericValue;

  const clearHold = React.useCallback(() => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  React.useEffect(() => () => clearHold(), [clearHold]);

  const startHold = (direction) => {
    if (disabled) return;

    directionRef.current = direction;
    startTimeRef.current = Date.now();
    clearHold();

    const stepOnce = () => {
      const current = valueRef.current;
      const dir = directionRef.current;
      if (dir > 0) {
        if (current >= cap) return false;
        const next = clampQty(current + 1, cap);
        onChange(next);
        return next < cap;
      }
      if (current <= 0) return false;
      const next = clampQty(current - 1, cap);
      onChange(next);
      return next > 0;
    };

    if (!stepOnce()) return;

    holdTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const dir = directionRef.current;

      if (elapsed >= HOLD_SNAP_MS) {
        onChange(dir > 0 ? cap : 0);
        clearHold();
        return;
      }

      if (!stepOnce()) {
        clearHold();
      }
    }, HOLD_STEP_MS);
  };

  const handlePointerDown = (direction, e) => {
    e.preventDefault();
    startHold(direction);
  };

  const handlePointerEnd = (e) => {
    e.preventDefault();
    clearHold();
  };

  return (
    <div className={cn("flex items-center gap-1 shrink-0", className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={disabled || numericValue <= 0}
        className={cn("size-7 touch-none select-none", buttonClassName)}
        onPointerDown={(e) => handlePointerDown(-1, e)}
        onPointerUp={handlePointerEnd}
        onPointerLeave={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        aria-label="Decrease quantity"
      >
        <Minus className="size-3" />
      </Button>
      <ParticularQuantityInput
        value={numericValue}
        max={cap}
        disabled={disabled}
        className={inputClassName}
        onChange={onChange}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={disabled || numericValue >= cap}
        className={cn("size-7 touch-none select-none", buttonClassName)}
        onPointerDown={(e) => handlePointerDown(1, e)}
        onPointerUp={handlePointerEnd}
        onPointerLeave={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        aria-label="Increase quantity"
      >
        <Plus className="size-3" />
      </Button>
    </div>
  );
}
