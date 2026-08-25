"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getVenueRentalParticular,
  getVenueRentalPriceHint,
  resolveVenueRentalSlot,
  VIRTUAL_PACKAGE_IDS,
  BASKETBALL_OPTIONS,
  hasBasketballPackageOption,
  hasVenueRentalPackageOption,
  getBasketballEncodedQty,
  applyBasketballEncodedSelection,
} from "@/lib/reservation-package-select";

export function ReservationVirtualPackagePanel({
  packageId,
  particulars,
  particularQuantities,
  onParticularQuantitiesChange,
  timeSlotId,
  venueRentalSlot,
  onVenueRentalSlotChange,
  compact = false,
}) {
  if (packageId === VIRTUAL_PACKAGE_IDS.BASKETBALL) {
    if (!hasBasketballPackageOption(particulars)) return null;
    const encodedQty = getBasketballEncodedQty(particulars, particularQuantities);

    return (
      <div className="space-y-2">
        <Label className={compact ? "text-xs" : ""}>Basketball Game Type</Label>
        <Select
          value={encodedQty > 0 ? String(encodedQty) : ""}
          onValueChange={(val) =>
            onParticularQuantitiesChange(
              applyBasketballEncodedSelection(
                particulars,
                particularQuantities,
                parseInt(val, 10)
              )
            )
          }
        >
          <SelectTrigger className={compact ? "text-xs" : ""}>
            <SelectValue placeholder="Select game type" />
          </SelectTrigger>
          <SelectContent>
            {BASKETBALL_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={String(opt.value)}>
                {opt.label} — ₱{opt.price.toLocaleString()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (packageId === VIRTUAL_PACKAGE_IDS.VENUE_RENTAL) {
    const hints = getVenueRentalPriceHint(particulars);
    const slot = resolveVenueRentalSlot(venueRentalSlot, timeSlotId);
    const vr = getVenueRentalParticular(particulars, slot);
    const price = vr?.unitCost ? Number(vr.unitCost) : 0;

    return (
      <div className="space-y-3">
        <div className="space-y-2">
          <Label className={compact ? "text-xs" : ""}>Venue Rental Rate</Label>
          <Select
            value={venueRentalSlot || slot}
            onValueChange={(val) => onVenueRentalSlotChange?.(val)}
          >
            <SelectTrigger className={compact ? "text-xs" : ""}>
              <SelectValue placeholder="Select day or night rate" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">
                Day (8:00 AM – 5:00 PM) — ₱{hints.dayPrice.toLocaleString()}
              </SelectItem>
              <SelectItem value="2">
                Night (5:00 PM – 12 MN) — ₱{hints.nightPrice.toLocaleString()}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="rounded-lg border bg-muted/30 p-3 space-y-1 text-sm">
          <p className="font-medium">{vr?.particularName || "Venue Rental"}</p>
          <p className="font-medium tabular-nums">₱{price.toLocaleString()}</p>
        </div>
      </div>
    );
  }

  return null;
}

export function ReservationPackageSelectItems({
  packages,
  particulars,
}) {
  return (
    <>
      {hasBasketballPackageOption(particulars) && (
        <SelectItem value={VIRTUAL_PACKAGE_IDS.BASKETBALL}>Basketball Game</SelectItem>
      )}
      {hasVenueRentalPackageOption(particulars) && (
        <SelectItem value={VIRTUAL_PACKAGE_IDS.VENUE_RENTAL}>Venue Rental</SelectItem>
      )}
      {packages
        .filter((p) => p.statusId === 1)
        .map((pkg) => (
          <SelectItem key={pkg.packageId} value={String(pkg.packageId)}>
            {pkg.packageName}
            {pkg.dayRate ? ` (Day: ₱${Number(pkg.dayRate).toLocaleString()})` : ""}
            {pkg.nightRate ? ` (Night: ₱${Number(pkg.nightRate).toLocaleString()})` : ""}
          </SelectItem>
        ))}
    </>
  );
}
