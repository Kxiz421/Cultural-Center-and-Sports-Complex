"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
  FACILITY_PACKAGE_PREFIX,
  BASKETBALL_OPTIONS,
  hasBasketballPackageOption,
  hasVenueRentalPackageOption,
  getBasketballEncodedQty,
  applyBasketballEncodedSelection,
  formatPackageRateHint,
  getPackageSlotRate,
  packageIncludesLedWall,
  getFacilityRateForSlot,
} from "@/lib/reservation-package-select";
import { TIME_SLOT, isDaySlot, isNightSlot, isWholeDaySlot } from "@/lib/time-slots";

const SHOT_CLOCK_ADDON = 500;

/**
 * Basketball game type selection with an "Add Shot Clock" toggle.
 * Day = ₱1,000 (₱1,500 w/ shot clock), Night = ₱1,500 (₱2,000 w/ shot
 * clock), Whole Day = ₱2,500 (₱3,500 w/ shot clock). The selected slot
 * determines the session; the button toggles the shot clock add-on.
 */
function BasketballGamePanel({
  particulars,
  particularQuantities,
  onParticularQuantitiesChange,
  timeSlotId,
  compact = false,
}) {
  const encodedQty = Number(
    getBasketballEncodedQty(particulars, particularQuantities) || 0
  );
  const baseValue = isWholeDaySlot(timeSlotId)
    ? 6
    : isNightSlot(timeSlotId)
      ? 4
      : 2;
  const withShotClock = encodedQty === baseValue + 1;
  const activeValue = withShotClock ? baseValue + 1 : baseValue;
  const activeOpt = BASKETBALL_OPTIONS.find((o) => o.value === activeValue);

  // Keep the encoded selection in sync with the slot: auto-select the base
  // rate when nothing is chosen, and remap (keeping shot-clock state) when
  // the session changes (e.g. Day → Night).
  React.useEffect(() => {
    if (encodedQty === baseValue || encodedQty === baseValue + 1) return;
    const wasShotClock = [3, 5, 7].includes(encodedQty);
    onParticularQuantitiesChange(
      applyBasketballEncodedSelection(
        particulars,
        particularQuantities,
        wasShotClock ? baseValue + 1 : baseValue
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encodedQty, baseValue]);

  const toggleShotClock = () =>
    onParticularQuantitiesChange(
      applyBasketballEncodedSelection(
        particulars,
        particularQuantities,
        withShotClock ? baseValue : baseValue + 1
      )
    );

  return (
    <div className="space-y-2">
      <Label className={compact ? "text-xs" : ""}>Basketball Game Type</Label>
      <div className="flex flex-col gap-2 rounded-md border p-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className={`font-medium ${compact ? "text-xs" : "text-sm"}`}>
            {activeOpt?.label || "Basketball Game"}
          </p>
          <p className="text-xs text-muted-foreground tabular-nums">
            ₱{(activeOpt?.price || 0).toLocaleString()}
          </p>
        </div>
        <Button
          type="button"
          variant={withShotClock ? "default" : "outline"}
          size="sm"
          onClick={toggleShotClock}
        >
          {withShotClock ? "Shot Clock Added ✓" : `Add Shot Clock (+₱${SHOT_CLOCK_ADDON.toLocaleString()})`}
        </Button>
      </div>
    </div>
  );
}

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
    return (
      <BasketballGamePanel
        particulars={particulars}
        particularQuantities={particularQuantities}
        onParticularQuantitiesChange={onParticularQuantitiesChange}
        timeSlotId={timeSlotId}
        compact={compact}
      />
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

/** Render a single Cultural Center facility as a selectable package item. */
function renderFacilitySelectItem(facility, timeSlotId) {
  const rate = getFacilityRateForSlot(facility, timeSlotId);
  const value = `${FACILITY_PACKAGE_PREFIX}${facility.facilityId}`;
  return (
    <SelectItem key={value} value={value} itemText={facility.name}>
      {rate > 0 && (
        <span className="text-xs font-normal whitespace-normal text-muted-foreground">
          — ₱{rate.toLocaleString()}
        </span>
      )}
    </SelectItem>
  );
}

/** Render Cultural Center facilities section (only for Cultural Center venue). */
function renderFacilitiesSection(facilities, timeSlotId, venueId) {
  if (String(venueId) !== "1") return null;
  if (!facilities || facilities.length === 0) return null;
  const active = facilities.filter((f) => f.statusId === 1);
  if (active.length === 0) return null;
  return (
    <>
      {active.map((facility) => renderFacilitySelectItem(facility, timeSlotId))}
    </>
  );
}

export function ReservationPackageSelectItems({
  packages,
  particulars,
  timeSlotId,
  sessionType,
  facilities,
  venueId,
}) {
  // When a session type is provided, filter accordingly (no Whole Day grouping)
  if (sessionType) {
    const filteredPackages = packages.filter((p) => {
      if (p.statusId !== 1) return false;
      const target = sessionType === "morning" ? TIME_SLOT.DAY : TIME_SLOT.NIGHT;
      return String(p.timeSlotId ?? "") === target;
    });
    const slot = sessionType === "morning" ? TIME_SLOT.DAY : TIME_SLOT.NIGHT;
    return (
      <>
        {sessionType === "morning" && hasVenueRentalPackageOption(particulars) && (
          <SelectItem value={VIRTUAL_PACKAGE_IDS.VENUE_RENTAL}>Venue Rental — Day</SelectItem>
        )}
        {sessionType === "night" && hasVenueRentalPackageOption(particulars) && (
          <SelectItem value={VIRTUAL_PACKAGE_IDS.VENUE_RENTAL}>Venue Rental — Night</SelectItem>
        )}
        {renderFacilitiesSection(facilities, slot, venueId)}
        {filteredPackages.map((pkg) => {
          const rate = getPackageSlotRate(pkg, slot, packages);
          return (
            <SelectItem
              key={pkg.packageId}
              value={String(pkg.packageId)}
              itemText={pkg.packageName}
            >
              {rate > 0 && (
                <span className="text-xs font-normal whitespace-normal text-muted-foreground">
                  — ₱{rate.toLocaleString()}
                </span>
              )}
            </SelectItem>
          );
        })}
      </>
    );
  }

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
        {renderFacilitiesSection(facilities, timeSlotId, venueId)}
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
      {renderFacilitiesSection(facilities, timeSlotId, venueId)}
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
              {rateHint ? (
                <span className="text-xs font-normal whitespace-normal text-muted-foreground">
                  — {rateHint}
                </span>
              ) : null}
            </SelectItem>
          );
        })}
    </>
  );
}
