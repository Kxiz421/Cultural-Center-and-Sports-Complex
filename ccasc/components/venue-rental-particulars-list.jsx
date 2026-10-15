"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import { ParticularQuantityStepper } from "@/components/particular-quantity-stepper";
import { filterCustomParticulars } from "@/lib/reservation-package-select";
import { readParticularQuantity } from "@/lib/particular-options";

const BASKETBALL_OPTIONS = [
  { value: 2, label: "Day w/o Shot Clock", price: 1000 },
  { value: 3, label: "Day w/ Shot Clock", price: 1500 },
  { value: 4, label: "Night w/o Shot Clock", price: 1500 },
  { value: 5, label: "Night w/ Shot Clock", price: 2000 },
];

const AIRCON_TIERS = [
  { qty: 4, label: "100-1K pax", price: 3200 },
  { qty: 6, label: "1K-3K pax", price: 4800 },
  { qty: 8, label: "4K-6K pax", price: 6400 },
  { qty: 10, label: "7K-10K pax", price: 8000 },
];

function toPeso(amount) {
  return `₱${(Number(amount) || 0).toLocaleString()}`;
}

/**
 * The "Additional Services / Particulars" chooser shown whenever a Cultural
 * Center rental is booked - the Venue Rental option or an individual facility
 * rental, on the main form and inside the per-date dialog.
 *
 * It displays every attachable particular with a quantity stepper and a running
 * total of what has been chosen, so the selection is visible before the Order
 * of Payment is generated.
 *
 * @param {object} props
 * @param {object[]} props.particulars the particular catalogue
 * @param {boolean} [props.particularsLoading]
 * @param {Record<string, number>} props.particularQuantities particularId -> units
 * @param {(next: Record<string, number>) => void} props.onChange
 * @param {boolean} [props.compact] smaller type, used inside the per-date dialog
 */
export function VenueRentalParticularsList({
  particulars = [],
  particularsLoading = false,
  particularQuantities = {},
  onChange,
  compact = false,
}) {
  const choices = React.useMemo(
    () => filterCustomParticulars(particulars),
    [particulars]
  );

  const selected = choices.filter(
    (p) => Number(readParticularQuantity(particularQuantities, p.particularId)) > 0
  );
  const selectedTotal = selected.reduce((sum, p) => {
    const qty = Number(readParticularQuantity(particularQuantities, p.particularId)) || 0;
    return sum + (Number(p.unitCost) || 0) * qty;
  }, 0);

  const setQuantity = (particularId, value) =>
    onChange?.({ ...particularQuantities, [String(particularId)]: value });

  const labelClass = compact ? "text-xs" : "";
  const textClass = compact ? "text-xs" : "text-sm";

  return (
    <div className="space-y-2">
      <Label className={labelClass}>Additional Services / Particulars</Label>
      <div className={`space-y-2 rounded-lg border p-4 ${compact ? "p-3" : ""}`}>
        {particularsLoading ? (
          <p className={`${textClass} text-muted-foreground`}>Loading particulars...</p>
        ) : choices.length === 0 ? (
          <p className={`${textClass} text-muted-foreground`}>No particulars available.</p>
        ) : (
          <div className={`grid gap-3 ${compact ? "gap-2 md:grid-cols-2" : "md:grid-cols-2"}`}>
            {choices.map((p) => {
              const qty = readParticularQuantity(particularQuantities, p.particularId);
              const cost = p.unitCost ? Number(p.unitCost) : 0;
              const maxQty = p.totalQuantity >= 0 ? p.totalQuantity : 999;
              const hasInventory = p.itemId !== null && p.itemId !== undefined;
              const isBasketball = p.particularName === "Basketball Game";
              const isAircon = p.particularName === "Aircon Compressor";

              return (
                <div
                  key={p.particularId}
                  className="flex items-center justify-between rounded-md border p-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className={`font-medium truncate ${compact ? "text-xs" : "text-xs"}`}>
                      {p.particularName}
                    </p>
                    {cost > 0 && !isBasketball && !isAircon && (
                      <p className="text-xs text-muted-foreground">
                        {toPeso(cost)} / unit
                      </p>
                    )}
                    {isBasketball && (
                      <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                        {BASKETBALL_OPTIONS.map((option) => (
                          <div key={option.value}>
                            {option.label} = {toPeso(option.price)}
                          </div>
                        ))}
                      </div>
                    )}
                    {isAircon && (
                      <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                        {AIRCON_TIERS.map((tier) => (
                          <div key={tier.qty}>
                            {tier.qty} units = {toPeso(tier.price)} ({tier.label})
                          </div>
                        ))}
                      </div>
                    )}
                    {!isBasketball && !isAircon && (
                      <p className="text-xs text-muted-foreground">
                        {hasInventory
                          ? `Available: ${maxQty}`
                          : "No inventory record — contact admin"}
                      </p>
                    )}
                  </div>
                  <ParticularQuantityStepper
                    value={qty}
                    max={maxQty}
                    buttonClassName="size-7"
                    onChange={(value) => setQuantity(p.particularId, value)}
                  />
                </div>
              );
            })}
          </div>
        )}

        {selected.length > 0 && (
          <div className="flex items-center justify-between border-t pt-2 text-xs">
            <span className="text-muted-foreground">
              {selected.length} particular{selected.length === 1 ? "" : "s"} selected
            </span>
            <span className="font-semibold tabular-nums">{toPeso(selectedTotal)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
