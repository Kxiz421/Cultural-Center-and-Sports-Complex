"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Package, Trophy, Clock, Lock, RotateCcw } from "lucide-react";
import { TIME_SLOT_OPTIONS } from "@/lib/time-slots";
import {
  BASKETBALL_OPTIONS,
  isBasketballParticularName,
} from "@/lib/particular-options";
import { SPORTS_COMPLEX_VENUE_ID } from "@/lib/venues";

/**
 * Facilities / particulars / time slot editor used by the reschedule request
 * form.
 *
 * A reservation may be edited on the same date too, while it is still editable:
 *
 *   Cultural Center -> until the 10% deposit has been applied
 *   Sports Complex  -> until the booking has been confirmed
 *
 * (`lib/reschedule-scope.js` owns that rule; the API enforces it as well.)
 *
 * The draft is the *requested end state*: Sports Complex facilities with their
 * units, Cultural Center particulars with their quantity, and the booking time
 * slot. A quantity of 0 removes that facility / particular from the request.
 *
 * @param {object} props
 * @param {object} props.reservation reservation row from /api/reservations
 * @param {object} props.value `{ timeSlotId, facilities, particulars }`
 * @param {(next: object) => void} props.onChange
 */
export function RescheduleScopePanel({ reservation, value, onChange }) {
  const [catalog, setCatalog] = React.useState([]);
  const [reservedByDate, setReservedByDate] = React.useState({});
  const [loading, setLoading] = React.useState(false);

  const isSports = Number(reservation?.venueId) === SPORTS_COMPLEX_VENUE_ID;
  const dates = React.useMemo(
    () => (reservation?.eventDates || []).filter(Boolean),
    [reservation]
  );

  React.useEffect(() => {
    if (!reservation) return undefined;
    let cancelled = false;
    setLoading(true);

    const load = async () => {
      try {
        if (isSports) {
          const reservationNumber = String(reservation.id).replace(/^RES-/i, "");
          const [facRes, availRes] = await Promise.all([
            fetch("/api/facilities"),
            dates.length > 0
              ? fetch(
                  `/api/facilities/availability?venueId=${
                    reservation.venueId
                  }&dates=${dates
                    .map(encodeURIComponent)
                    .join(",")}&excludeReservationId=${reservationNumber}`
                )
              : Promise.resolve(null),
          ]);
          const facilities = await facRes.json();
          if (cancelled) return;
          setCatalog(
            (Array.isArray(facilities) ? facilities : []).filter(
              (f) => Number(f.venueId) === Number(reservation.venueId)
            )
          );
          if (availRes) {
            const availability = await availRes.json();
            if (!cancelled) setReservedByDate(availability?.reservedByDate || {});
          }
        } else {
          const res = await fetch("/api/particulars");
          const items = await res.json();
          if (cancelled) return;
          setCatalog(
            (Array.isArray(items) ? items : []).filter(
              (item) => Number(item.statusId) !== 4
            )
          );
          setReservedByDate({});
        }
      } catch {
        if (!cancelled) setCatalog([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [reservation, isSports, dates]);

  /** Facilities another active reservation already holds on an event day. */
  const unavailableFacilityIds = React.useMemo(() => {
    const taken = new Set();
    for (const list of Object.values(reservedByDate)) {
      for (const id of list || []) taken.add(String(id));
    }
    return taken;
  }, [reservedByDate]);

  if (!reservation) return null;

  if (!reservation.canManageScope) {
    return (
      <div className="space-y-2 rounded-lg border border-dashed p-4">
        <Label className="flex items-center gap-2 text-sm font-semibold">
          <Lock className="size-4 text-muted-foreground" />
          Facilities, Particulars &amp; Time Slot
        </Label>
        <p className="text-muted-foreground text-sm">
          {reservation.scopeLockReason ||
            "This reservation can no longer change its facilities, particulars or time slot."}
        </p>
      </div>
    );
  }

  const facilityQuantity = (id) => {
    const entry = (value.facilities || []).find(
      (f) => Number(f.facilityId) === Number(id)
    );
    return Number(entry?.quantity) || 0;
  };

  const particularQuantity = (id) => {
    const entry = (value.particulars || []).find(
      (p) => Number(p.particularId) === Number(id)
    );
    return Number(entry?.quantity) || 0;
  };

  const setFacilityQuantity = (facilityId, quantity) => {
    const next = (value.facilities || []).filter(
      (f) => Number(f.facilityId) !== Number(facilityId)
    );
    if (quantity > 0) next.push({ facilityId: Number(facilityId), quantity });
    onChange({ ...value, facilities: next });
  };

  const setParticularQuantity = (particularId, quantity) => {
    const next = (value.particulars || []).filter(
      (p) => Number(p.particularId) !== Number(particularId)
    );
    if (quantity > 0) {
      next.push({ particularId: Number(particularId), quantity });
    }
    onChange({ ...value, particulars: next });
  };

  const resetScope = () => {
    onChange({
      timeSlotId: reservation.timeSlotId ?? null,
      facilities: (reservation.facilities || []).map((f) => ({
        facilityId: Number(f.facilityId),
        quantity: Number(f.quantity) || 1,
      })),
      particulars: (reservation.particulars || []).map((p) => ({
        particularId: Number(p.particularId),
        quantity: Number(p.quantity) || 0,
      })),
    });
  };

  const timeSlotValue = String(value.timeSlotId ?? reservation.timeSlotId ?? "1");
  const selectedCount = isSports
    ? (value.facilities || []).length
    : (value.particulars || []).length;

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-2">
        <Label className="flex items-center gap-2 text-sm font-semibold">
          {isSports ? (
            <Trophy className="size-4 text-muted-foreground" />
          ) : (
            <Package className="size-4 text-muted-foreground" />
          )}
          {isSports ? "Facilities & Time Slot" : "Particulars & Time Slot"}
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={resetScope}
        >
          <RotateCcw className="size-3.5" />
          Reset to current
        </Button>
      </div>

      <p className="text-muted-foreground text-xs">
        These can be changed even on the same date while the reservation is not
        yet {isSports ? "confirmed" : "covered by the 10% deposit"}. The amount
        is recalculated when the coordinator approves the request.
      </p>

      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm">
          <Clock className="size-4 text-muted-foreground" />
          Time Slot
        </Label>
        <Select
          value={timeSlotValue}
          onValueChange={(next) =>
            onChange({ ...value, timeSlotId: parseInt(next, 10) })
          }
        >
          <SelectTrigger className="w-full sm:w-[320px]">
            <SelectValue placeholder="Select time slot" />
          </SelectTrigger>
          <SelectContent>
            {TIME_SLOT_OPTIONS.map((option) => (
              <SelectItem key={option.id} value={String(option.id)}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">
          Loading {isSports ? "facilities" : "particulars"}...
        </p>
      ) : catalog.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No {isSports ? "facilities" : "particulars"} available.
        </p>
      ) : (
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs">
            {selectedCount} selected. Set a quantity to include an item; 0
            removes it.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {catalog.map((item) => {
              const id = isSports ? item.facilityId : item.particularId;
              const name = isSports ? item.name : item.particularName;
              const quantity = isSports
                ? facilityQuantity(id)
                : particularQuantity(id);
              const taken = isSports && unavailableFacilityIds.has(String(id));
              const isBasketball =
                !isSports && isBasketballParticularName(item.particularName || "");

              return (
                <div
                  key={`${isSports ? "fac" : "part"}-${id}`}
                  className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 ${
                    taken ? "opacity-60" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{name}</p>
                    <p className="text-muted-foreground text-xs">
                      {isSports
                        ? `₱${Number(item.rateDay || 0).toLocaleString()} / day`
                        : item.unitCost
                          ? `₱${Number(item.unitCost).toLocaleString()} per unit`
                          : "Not priced"}
                    </p>
                  </div>

                  {isBasketball ? (
                    <Select
                      value={quantity > 0 ? String(quantity) : "0"}
                      onValueChange={(next) =>
                        setParticularQuantity(id, parseInt(next, 10))
                      }
                    >
                      <SelectTrigger className="w-[150px] shrink-0">
                        <SelectValue placeholder="Not included" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Not included</SelectItem>
                        {BASKETBALL_OPTIONS.map((option) => (
                          <SelectItem
                            key={option.value}
                            value={String(option.value)}
                          >
                            {option.shortLabel || option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type="text"
                      inputMode="numeric"
                      disabled={taken}
                      value={quantity > 0 ? String(quantity) : ""}
                      placeholder={taken ? "Reserved" : "0"}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, "").slice(0, 5);
                        const next = raw === "" ? 0 : parseInt(raw, 10);
                        if (isSports) setFacilityQuantity(id, next);
                        else setParticularQuantity(id, next);
                      }}
                      className="w-[80px] shrink-0 text-right"
                    />
                  )}
                </div>
              );
            })}
          </div>
          {isSports && unavailableFacilityIds.size > 0 && (
            <p className="text-muted-foreground text-xs">
              <Badge variant="secondary" className="mr-1">
                Reserved
              </Badge>
              facilities are already taken on one of the event dates.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default RescheduleScopePanel;
