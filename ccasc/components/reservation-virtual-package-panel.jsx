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
  formatPackageRateHint,
  getPackageSlotRate,
  packageIncludesLedWall,
} from "@/lib/reservation-package-select";
import { TIME_SLOT, isNightSlot, isWholeDaySlot } from "@/lib/time-slots";

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
    const slotOptions = BASKETBALL_OPTIONS.filter((opt) => {
      if (isWholeDaySlot(timeSlotId)) return opt.value === 6 || opt.value === 7;
      if (isNightSlot(timeSlotId)) return opt.value === 4 || opt.value === 5;
      return opt.value === 2 || opt.value === 3;
    });

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
            {slotOptions.map((opt) => (
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
    const price = isWholeDaySlot(slot)
      ? hints.wholeDayPrice
      : vr?.unitCost
        ? Number(vr.unitCost)
        : 0;

    return (
      <div className="space-y-3">
        <div className="space-y-2">
          <Label className={compact ? "text-xs" : ""}>Venue Rental Rate</Label>
          <Select
            value={venueRentalSlot || slot}
            onValueChange={(val) => onVenueRentalSlotChange?.(val)}
          >
            <SelectTrigger className={compact ? "text-xs" : ""}>
              <SelectValue placeholder="Select rate" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TIME_SLOT.DAY}>
                Day (8:00 AM – 5:00 PM) — ₱{hints.dayPrice.toLocaleString()}
              </SelectItem>
              <SelectItem value={TIME_SLOT.NIGHT}>
                Night (5:00 PM – 10:00 PM) — ₱{hints.nightPrice.toLocaleString()}
              </SelectItem>
              <SelectItem value={TIME_SLOT.WHOLE_DAY}>
                Whole Day (8:00 AM – 10:00 PM) — ₱
                {hints.wholeDayPrice.toLocaleString()}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="rounded-lg border bg-muted/30 p-3 space-y-1 text-sm">
          <p className="font-medium">
            {isWholeDaySlot(slot)
              ? "Venue Rental — Whole Day"
              : vr?.particularName || "Venue Rental"}
          </p>
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
  timeSlotId,
}) {
  // When Whole Day is selected, group complementary packages into combined options
  if (timeSlotId && isWholeDaySlot(timeSlotId)) {
    const active = packages.filter((p) => p.statusId === 1);
    const standardPkgs = active.filter((p) => !packageIncludesLedWall(p));
    const ledPkgs = active.filter((p) => packageIncludesLedWall(p));

    // Pick the package with a day rate as the representative value (Standard Day or LED Wall Day)
    const standardDay = standardPkgs.find((p) => getPackageSlotRate(p, TIME_SLOT.DAY, packages) > 0)
      || standardPkgs[0];
    const ledDay = ledPkgs.find((p) => getPackageSlotRate(p, TIME_SLOT.DAY, packages) > 0)
      || ledPkgs[0];

    const standardTotal = standardDay ? getPackageSlotRate(standardDay, timeSlotId, packages) : 0;
    const ledTotal = ledDay ? getPackageSlotRate(ledDay, timeSlotId, packages) : 0;

    return (
      <>
        {hasBasketballPackageOption(particulars) && (
          <SelectItem value={VIRTUAL_PACKAGE_IDS.BASKETBALL}>Basketball Game</SelectItem>
        )}
        {hasVenueRentalPackageOption(particulars) && (
          <SelectItem value={VIRTUAL_PACKAGE_IDS.VENUE_RENTAL}>Venue Rental</SelectItem>
        )}
        {standardDay && (
          <SelectItem value={String(standardDay.packageId)}>
            <span className="font-medium">Whole Day Package (without LED Wall)</span>
            <span className="text-xs font-normal whitespace-normal text-muted-foreground ml-1">
              — ₱{standardTotal.toLocaleString()}
            </span>
          </SelectItem>
        )}
        {ledDay && (
          <SelectItem value={String(ledDay.packageId)}>
            <span className="font-medium">Whole Day Package (with LED Wall)</span>
            <span className="text-xs font-normal whitespace-normal text-muted-foreground ml-1">
              — ₱{ledTotal.toLocaleString()}
            </span>
          </SelectItem>
        )}
      </>
    );
  }

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
        .map((pkg) => {
          const rateHint = formatPackageRateHint(pkg, packages);
          return (
            <SelectItem
              key={pkg.packageId}
              value={String(pkg.packageId)}
              itemText={pkg.packageName}
            >
              {pkg.packageName}
              {rateHint ? (
                <span className="text-xs font-normal whitespace-normal text-muted-foreground">
                  {" "}— {rateHint}
                </span>
              ) : null}
            </SelectItem>
          );
        })}
    </>
  );
}
