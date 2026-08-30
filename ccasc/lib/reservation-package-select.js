import {
  BASKETBALL_NAME,
  BASKETBALL_OPTIONS,
  getBasketballPrice,
  getBasketballLabel,
  isBasketballEncodedQuantity,
  formatFormParticularLine,
} from "@/lib/particular-options";
import { TIME_SLOT, isDaySlot, isWholeDaySlot } from "@/lib/time-slots";

export const VIRTUAL_PACKAGE_IDS = {
  BASKETBALL: "basketball",
  VENUE_RENTAL: "venue-rental",
};

export function isVirtualPackageId(packageId) {
  const id = String(packageId || "");
  return (
    id === VIRTUAL_PACKAGE_IDS.BASKETBALL ||
    id === VIRTUAL_PACKAGE_IDS.VENUE_RENTAL
  );
}

export function isRegularPackageId(packageId) {
  const id = String(packageId || "");
  return id && id !== "0" && id !== "custom" && !isVirtualPackageId(id);
}

/** Whether a package bundle includes the LED Wall inclusion or is an LED Wall package. */
export function packageIncludesLedWall(pkg) {
  if (!pkg) return false;
  if (/led\s*wall/i.test(pkg.packageName || "")) return true;
  const inclusions = pkg.inclusions || [];
  return inclusions.some((inc) => /led\s*wall/i.test(inc.itemName || ""));
}

function packagePairKey(pkg) {
  const led = packageIncludesLedWall(pkg);
  const base = String(pkg?.packageName || "")
    .replace(/\bwhole\s*day\b/gi, "")
    .replace(/\b(day|night)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  return `${led ? "led" : "std"}::${base}`;
}

function ownDayRate(pkg) {
  if (!pkg) return 0;
  const dayStandard = Number(pkg.dayRate ?? 0);
  const dayLed = Number(pkg.ledWallDayRate ?? 0);
  if (packageIncludesLedWall(pkg) && dayLed > 0) return dayLed;
  if (dayStandard > 0) return dayStandard;
  return dayLed > 0 ? dayLed : 0;
}

function ownNightRate(pkg) {
  if (!pkg) return 0;
  const nightStandard = Number(pkg.nightRate ?? 0);
  const nightLed = Number(pkg.ledWallNightRate ?? 0);
  if (packageIncludesLedWall(pkg) && nightLed > 0) return nightLed;
  if (nightStandard > 0) return nightStandard;
  return nightLed > 0 ? nightLed : 0;
}

function isComplementaryPackage(pkg, other) {
  const thisIsDay = ownDayRate(pkg) > 0 && ownNightRate(pkg) <= 0;
  const thisIsNight = ownNightRate(pkg) > 0 && ownDayRate(pkg) <= 0;
  if (thisIsDay) return ownNightRate(other) > 0;
  if (thisIsNight) return ownDayRate(other) > 0;
  return ownDayRate(other) > 0 || ownNightRate(other) > 0;
}

/** Matching day/night package (e.g. Standard Day <-> Standard Night, LED Day <-> LED Night). */
export function findCounterpartPackage(pkg, allPackages = []) {
  if (!pkg || !Array.isArray(allPackages) || allPackages.length === 0) return null;
  const key = packagePairKey(pkg);
  const selfId = String(pkg.packageId ?? "");
  const led = packageIncludesLedWall(pkg);
  const candidates = allPackages.filter((other) => {
    if (!other || String(other.packageId ?? "") === selfId) return false;
    if (packageIncludesLedWall(other) !== led) return false;
    return isComplementaryPackage(pkg, other);
  });
  return (
    candidates.find((other) => packagePairKey(other) === key) ||
    candidates[0] ||
    null
  );
}

/**
 * Resolve the billable rate for a package at a given time slot.
 * Whole Day combines this package's day rate with the matching night package
 * (or this package's own night rate when both are stored on one row).
 */
export function getPackageSlotRate(pkg, timeSlotId, allPackages = []) {
  if (!pkg) return 0;
  const dayRate = ownDayRate(pkg);
  const nightRate = ownNightRate(pkg);

  if (isWholeDaySlot(timeSlotId)) {
    const counterpart = findCounterpartPackage(pkg, allPackages);
    const day = dayRate || ownDayRate(counterpart);
    const night = nightRate || ownNightRate(counterpart);
    return (Number(day) || 0) + (Number(night) || 0);
  }
  if (isDaySlot(timeSlotId)) {
    return dayRate;
  }
  return nightRate;
}

/** Pick the time slot that actually has a rate for this package (day-only / night-only packages). */
export function resolvePackageBillingSlot(pkg, requestedSlotId, allPackages = []) {
  if (!pkg) return String(requestedSlotId || "1");
  const requested = String(requestedSlotId || pkg.timeSlotId || "1");
  if (getPackageSlotRate(pkg, requested, allPackages) > 0) return requested;
  const pkgSlot = pkg.timeSlotId ? String(pkg.timeSlotId) : "";
  if (pkgSlot && getPackageSlotRate(pkg, pkgSlot, allPackages) > 0) return pkgSlot;
  if (getPackageSlotRate(pkg, TIME_SLOT.DAY, allPackages) > 0) return TIME_SLOT.DAY;
  if (getPackageSlotRate(pkg, TIME_SLOT.NIGHT, allPackages) > 0) return TIME_SLOT.NIGHT;
  if (getPackageSlotRate(pkg, TIME_SLOT.WHOLE_DAY, allPackages) > 0) {
    return TIME_SLOT.WHOLE_DAY;
  }
  return requested;
}

export function getPackageBillingRate(pkg, requestedSlotId, allPackages = []) {
  const slot = resolvePackageBillingSlot(pkg, requestedSlotId, allPackages);
  return getPackageSlotRate(pkg, slot, allPackages);
}

export function formatPackageRateHint(pkg, allPackages = []) {
  if (!pkg) return "";
  const counterpart = findCounterpartPackage(pkg, allPackages);
  const day = ownDayRate(pkg) || ownDayRate(counterpart);
  const night = ownNightRate(pkg) || ownNightRate(counterpart);
  const wholeDay = (Number(day) || 0) + (Number(night) || 0);
  const parts = [];
  if (day > 0) parts.push(`Day ₱${day.toLocaleString()}`);
  if (night > 0) parts.push(`Night ₱${night.toLocaleString()}`);
  if (day > 0 && night > 0) {
    parts.push(`Whole ₱${wholeDay.toLocaleString()}`);
  }
  return parts.join(" · ");
}

export function packageSummaryLabel(pkg, timeSlotId, allPackages = []) {
  if (!pkg) return "";
  if (!isWholeDaySlot(timeSlotId)) return pkg.packageName;
  const family = String(pkg.packageName || "")
    .replace(/\bwhole\s*day\b/gi, "")
    .replace(/\b(day|night)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return family ? `${family} (Whole Day)` : `${pkg.packageName} (Whole Day)`;
}

export function findBasketballParticular(particulars) {
  return particulars.find((p) => p.particularName === BASKETBALL_NAME);
}

export function findVenueRentalParticulars(particulars) {
  const day = particulars.find(
    (p) =>
      /venue rental/i.test(p.particularName || "") &&
      /day/i.test(p.particularName || "")
  );
  const night = particulars.find(
    (p) =>
      /venue rental/i.test(p.particularName || "") &&
      /night/i.test(p.particularName || "")
  );
  return { day, night };
}

export function getVenueRentalParticular(particulars, timeSlotId) {
  const { day, night } = findVenueRentalParticulars(particulars);
  if (isWholeDaySlot(timeSlotId)) return day || night;
  return isDaySlot(timeSlotId) ? day : night;
}

export function getVenueRentalParticularsForSlot(particulars, timeSlotId) {
  const { day, night } = findVenueRentalParticulars(particulars);
  if (isWholeDaySlot(timeSlotId)) {
    return [day, night].filter(Boolean);
  }
  const one = isDaySlot(timeSlotId) ? day : night;
  return one ? [one] : [];
}

/** Prefer explicit venue rental slot; fall back to reservation time slot. */
export function resolveVenueRentalSlot(venueRentalSlot, timeSlotId) {
  const slot = venueRentalSlot || timeSlotId || TIME_SLOT.DAY;
  if (isWholeDaySlot(slot)) return TIME_SLOT.WHOLE_DAY;
  return isDaySlot(slot) ? TIME_SLOT.DAY : TIME_SLOT.NIGHT;
}

const BASKETBALL_TO_DAY = { 2: 2, 3: 3, 4: 2, 5: 3, 6: 2, 7: 3 };
const BASKETBALL_TO_NIGHT = { 2: 4, 3: 5, 4: 4, 5: 5, 6: 4, 7: 5 };
const BASKETBALL_TO_WHOLE_DAY = { 2: 6, 3: 7, 4: 6, 5: 7, 6: 6, 7: 7 };

/** Remap basketball encoded qty when reservation time slot changes (keeps shot clock preference). */
export function remapBasketballEncodedQtyForTimeSlot(encodedQty, timeSlotId) {
  const qty = Number(encodedQty);
  if (!qty || qty <= 0) return qty;
  if (isWholeDaySlot(timeSlotId)) return BASKETBALL_TO_WHOLE_DAY[qty] ?? qty;
  if (isDaySlot(timeSlotId)) return BASKETBALL_TO_DAY[qty] ?? qty;
  return BASKETBALL_TO_NIGHT[qty] ?? qty;
}

/** Time slot implied by basketball encoded qty (2/3 = day, 4/5 = night, 6/7 = whole day). */
export function basketballEncodedQtyToTimeSlot(encodedQty) {
  const qty = Number(encodedQty);
  if (qty === 2 || qty === 3) return TIME_SLOT.DAY;
  if (qty === 4 || qty === 5) return TIME_SLOT.NIGHT;
  if (qty === 6 || qty === 7) return TIME_SLOT.WHOLE_DAY;
  return null;
}

/**
 * Sync virtual package selections to match a time slot (day/night).
 * Returns updated particularQuantities and venueRentalSlot.
 */
export function syncVirtualPackageStateForTimeSlot(
  packageId,
  particulars,
  particularQuantities,
  venueRentalSlot,
  timeSlotId
) {
  const pq = { ...(particularQuantities || {}) };
  let vrSlot = venueRentalSlot;

  if (packageId === VIRTUAL_PACKAGE_IDS.BASKETBALL) {
    const encoded = getBasketballEncodedQty(particulars, pq);
    if (encoded) {
      const remapped = remapBasketballEncodedQtyForTimeSlot(encoded, timeSlotId);
      const applied = applyBasketballEncodedSelection(particulars, pq, remapped);
      Object.assign(pq, applied);
    }
  }

  if (packageId === VIRTUAL_PACKAGE_IDS.VENUE_RENTAL) {
    vrSlot = resolveVenueRentalSlot(timeSlotId, timeSlotId);
  }

  return { particularQuantities: pq, venueRentalSlot: vrSlot };
}

/** Derive time slot from virtual package selections (basketball type or venue rental slot). */
export function deriveTimeSlotFromVirtualPackage(
  packageId,
  particulars,
  particularQuantities,
  venueRentalSlot,
  fallbackTimeSlotId
) {
  if (packageId === VIRTUAL_PACKAGE_IDS.BASKETBALL) {
    const slot = basketballEncodedQtyToTimeSlot(
      getBasketballEncodedQty(particulars, particularQuantities)
    );
    if (slot) return slot;
  }
  if (packageId === VIRTUAL_PACKAGE_IDS.VENUE_RENTAL && venueRentalSlot) {
    return resolveVenueRentalSlot(venueRentalSlot, fallbackTimeSlotId);
  }
  return fallbackTimeSlotId;
}

const BASKETBALL_PARTICULAR_PATTERNS = {
  2: /w\/o Shot Clock[\s\u2013-]+Day/i,
  3: /w\/ Shot Clock[\s\u2013-]+Day/i,
  4: /w\/o Shot Clock[\s\u2013-]+Night/i,
  5: /w\/ Shot Clock[\s\u2013-]+Night/i,
};

/** Read basketball game type from consolidated encoded qty or split particular selection. */
export function getBasketballEncodedQty(particulars, particularQuantities) {
  const consolidated = findBasketballParticular(particulars);
  if (consolidated) {
    const qty = particularQuantities?.[consolidated.particularId] || 0;
    return isBasketballEncodedQuantity(qty) ? Number(qty) : 0;
  }
  for (const [encoded, pattern] of Object.entries(BASKETBALL_PARTICULAR_PATTERNS)) {
    const part = particulars.find((p) => pattern.test(p.particularName || ""));
    if (part && (particularQuantities?.[part.particularId] || 0) > 0) {
      return Number(encoded);
    }
  }
  return 0;
}

/** Apply basketball game type selection (works with consolidated or split DB particulars). */
export function applyBasketballEncodedSelection(
  particulars,
  particularQuantities,
  encodedQty
) {
  const pq = { ...(particularQuantities || {}) };
  for (const p of particulars) {
    const name = p.particularName || "";
    if (name === BASKETBALL_NAME || name.startsWith("Basketball Game")) {
      delete pq[p.particularId];
    }
  }
  const entry = resolveBasketballParticularEntry(particulars, encodedQty);
  if (entry) {
    pq[entry.particularId] = entry.quantity;
  }
  return pq;
}

export function isConsolidatedBasketballEntry(particulars, entry) {
  const consolidated = findBasketballParticular(particulars);
  return (
    consolidated &&
    entry?.particularId === consolidated.particularId &&
    isBasketballEncodedQuantity(entry.quantity)
  );
}

/** Build charge lines for reservation form summary (matches submit pricing). */
export function buildReservationSummaryLines({
  particulars,
  packages,
  packageId,
  particularQuantities,
  timeSlotId,
  venueRentalSlot,
  selectedDatesCount,
  customizePerDate,
  dateCustomizations,
}) {
  const lines = [];
  const numDays = Math.max(1, selectedDatesCount || 1);

  if (customizePerDate && Object.keys(dateCustomizations).length > 0) {
    for (const [date, cust] of Object.entries(dateCustomizations)) {
      if (isVirtualPackageId(cust.packageId)) {
        const info = getVirtualPackageDisplayInfo(
          cust.packageId,
          particulars,
          cust.particularQuantities,
          cust.timeSlotId || timeSlotId,
          cust.venueRentalSlot
        );
        if (info) lines.push({ date, label: info.label, amount: info.amount });
      } else if (isRegularPackageId(cust.packageId)) {
        const pkg = packages.find((p) => String(p.packageId) === cust.packageId);
        if (pkg) {
          const slot = cust.timeSlotId || timeSlotId;
          const rate = getPackageBillingRate(pkg, slot, packages);
          lines.push({
            date,
            label: packageSummaryLabel(pkg, slot, packages),
            amount: rate,
          });
        }
      } else if (
        cust.packageId === "0" ||
        cust.packageId === "custom" ||
        !cust.packageId
      ) {
        for (const [partId, qty] of Object.entries(cust.particularQuantities || {})) {
          if (qty > 0) {
            const part = particulars.find(
              (p) => String(p.particularId) === String(partId)
            );
            if (!part) continue;
            const { label, amount } = formatFormParticularLine(
              part.particularName,
              qty,
              part.unitCost
            );
            lines.push({ date, label, amount });
          }
        }
      }
    }
  } else if (isVirtualPackageId(packageId)) {
    const info = getVirtualPackageDisplayInfo(
      packageId,
      particulars,
      particularQuantities,
      timeSlotId,
      venueRentalSlot
    );
    if (info) {
      lines.push({
        label: numDays > 1 ? `${info.label} × ${numDays} day(s)` : info.label,
        amount: info.amount * numDays,
      });
    }
  } else if (isRegularPackageId(packageId)) {
    const pkg = packages.find((p) => String(p.packageId) === packageId);
    if (pkg) {
      const rate = getPackageBillingRate(pkg, timeSlotId, packages);
      const label = packageSummaryLabel(pkg, timeSlotId, packages);
      lines.push({
        label: numDays > 1 ? `${label} × ${numDays} day(s)` : label,
        amount: rate * numDays,
      });
    }
  } else if (packageId === "custom" || packageId === "0" || !packageId) {
    for (const [partId, qty] of Object.entries(particularQuantities || {})) {
      if (qty > 0) {
        const part = particulars.find((p) => String(p.particularId) === partId);
        if (!part) continue;
        const { label, amount } = formatFormParticularLine(
          part.particularName,
          qty,
          part.unitCost
        );
        lines.push({ label, amount });
      }
    }
  }

  return lines;
}

export function sumReservationSummaryLines(lines) {
  return lines.reduce((sum, line) => sum + line.amount, 0);
}

/** Safe numeric package id for API (virtual ids like "basketball" become null). */
export function parseReservationPackageId(packageId) {
  const parsed = parseInt(packageId, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/** Resolve basketball selection to API particular payload. */
export function resolveBasketballParticularEntry(particulars, encodedQty) {
  if (!encodedQty || encodedQty <= 0) return null;

  const consolidated = findBasketballParticular(particulars);
  if (consolidated) {
    return { particularId: consolidated.particularId, quantity: encodedQty };
  }

  const pattern = BASKETBALL_PARTICULAR_PATTERNS[encodedQty];
  if (!pattern) return null;
  const part = particulars.find((p) => pattern.test(p.particularName || ""));
  if (!part) return null;
  return { particularId: part.particularId, quantity: 1 };
}

export function filterCustomParticulars(particulars) {
  return particulars.filter((p) => {
    const name = p.particularName || "";
    if (name === BASKETBALL_NAME || name.startsWith("Basketball Game")) return false;
    if (/venue rental/i.test(name)) return false;
    return true;
  });
}

export function getVirtualPackageParticulars(
  packageId,
  particulars,
  particularQuantities,
  timeSlotId,
  venueRentalSlot
) {
  if (packageId === VIRTUAL_PACKAGE_IDS.BASKETBALL) {
    const encodedQty = getBasketballEncodedQty(particulars, particularQuantities);
    const entry = resolveBasketballParticularEntry(particulars, encodedQty);
    return entry ? [entry] : [];
  }

  if (packageId === VIRTUAL_PACKAGE_IDS.VENUE_RENTAL) {
    const slot = resolveVenueRentalSlot(venueRentalSlot, timeSlotId);
    return getVenueRentalParticularsForSlot(particulars, slot).map((vr) => ({
      particularId: vr.particularId,
      quantity: 1,
    }));
  }

  return [];
}

export function calculateVirtualPackageAmount(
  packageId,
  particulars,
  particularQuantities,
  timeSlotId,
  venueRentalSlot
) {
  if (packageId === VIRTUAL_PACKAGE_IDS.BASKETBALL) {
    const encodedQty = getBasketballEncodedQty(particulars, particularQuantities);
    if (encodedQty > 0) {
      const encodedPrice = getBasketballPrice(encodedQty);
      if (encodedPrice) return encodedPrice;
      const entry = resolveBasketballParticularEntry(particulars, encodedQty);
      if (entry) {
        const part = particulars.find((p) => p.particularId === entry.particularId);
        return part?.unitCost ? Number(part.unitCost) : 0;
      }
    }
    return 0;
  }

  if (packageId === VIRTUAL_PACKAGE_IDS.VENUE_RENTAL) {
    const slot = resolveVenueRentalSlot(venueRentalSlot, timeSlotId);
    return getVenueRentalParticularsForSlot(particulars, slot).reduce(
      (sum, vr) => sum + (vr.unitCost ? Number(vr.unitCost) : 0),
      0
    );
  }

  return 0;
}

/** Label and unit amount for virtual package line items in reservation summaries. */
export function getVirtualPackageDisplayInfo(
  packageId,
  particulars,
  particularQuantities,
  timeSlotId,
  venueRentalSlot
) {
  if (!isVirtualPackageId(packageId)) return null;

  if (packageId === VIRTUAL_PACKAGE_IDS.BASKETBALL) {
    const encodedQty = getBasketballEncodedQty(particulars, particularQuantities);
    if (!encodedQty) return null;
    const optionLabel = getBasketballLabel(encodedQty);
    const amount = calculateVirtualPackageAmount(
      packageId,
      particulars,
      particularQuantities,
      timeSlotId,
      venueRentalSlot
    );
    return {
      label: optionLabel
        ? `Basketball Game — ${optionLabel}`
        : "Basketball Game",
      amount,
    };
  }

  if (packageId === VIRTUAL_PACKAGE_IDS.VENUE_RENTAL) {
    const slot = resolveVenueRentalSlot(venueRentalSlot, timeSlotId);
    const items = getVenueRentalParticularsForSlot(particulars, slot);
    if (items.length === 0) return null;
    const amount = items.reduce(
      (sum, vr) => sum + (vr.unitCost ? Number(vr.unitCost) : 0),
      0
    );
    const slotLabel = isWholeDaySlot(slot)
      ? "Whole Day (8:00 AM – 10:00 PM)"
      : isDaySlot(slot)
        ? "Day (8:00 AM – 5:00 PM)"
        : "Night (5:00 PM – 10:00 PM)";
    return {
      label: `Venue Rental — ${slotLabel}`,
      amount,
    };
  }

  return null;
}

export function getVenueRentalPriceHint(particulars) {
  const { day, night } = findVenueRentalParticulars(particulars);
  return {
    dayPrice: day?.unitCost ? Number(day.unitCost) : 0,
    nightPrice: night?.unitCost ? Number(night.unitCost) : 0,
    wholeDayPrice:
      (day?.unitCost ? Number(day.unitCost) : 0) +
      (night?.unitCost ? Number(night.unitCost) : 0),
  };
}

export function hasBasketballPackageOption(particulars) {
  return (
    findBasketballParticular(particulars) ||
    particulars.some((p) => (p.particularName || "").startsWith("Basketball Game"))
  );
}

export function hasVenueRentalPackageOption(particulars) {
  const { day, night } = findVenueRentalParticulars(particulars);
  return Boolean(day || night);
}

export { BASKETBALL_OPTIONS };
