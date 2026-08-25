import {
  BASKETBALL_NAME,
  BASKETBALL_OPTIONS,
  getBasketballPrice,
  getBasketballLabel,
  isBasketballEncodedQuantity,
  formatFormParticularLine,
} from "@/lib/particular-options";

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
  return String(timeSlotId) === "1" ? day : night;
}

/** Prefer explicit venue rental slot; fall back to reservation time slot. */
export function resolveVenueRentalSlot(venueRentalSlot, timeSlotId) {
  const slot = venueRentalSlot || timeSlotId || "1";
  return String(slot) === "1" ? "1" : "2";
}

const BASKETBALL_DAY_TO_NIGHT = { 2: 4, 3: 5 };
const BASKETBALL_NIGHT_TO_DAY = { 4: 2, 5: 3 };

/** Remap basketball encoded qty when reservation time slot changes (keeps shot clock preference). */
export function remapBasketballEncodedQtyForTimeSlot(encodedQty, timeSlotId) {
  const qty = Number(encodedQty);
  if (!qty || qty <= 0) return qty;
  if (String(timeSlotId) === "1") {
    return BASKETBALL_NIGHT_TO_DAY[qty] ?? qty;
  }
  return BASKETBALL_DAY_TO_NIGHT[qty] ?? qty;
}

/** Time slot implied by basketball encoded qty (2/3 = day, 4/5 = night). */
export function basketballEncodedQtyToTimeSlot(encodedQty) {
  const qty = Number(encodedQty);
  if (qty === 2 || qty === 3) return "1";
  if (qty === 4 || qty === 5) return "2";
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
    vrSlot = String(timeSlotId) === "1" ? "1" : "2";
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
          const rate =
            String(slot) === "1"
              ? Number(pkg.dayRate || 0)
              : Number(pkg.nightRate || 0);
          lines.push({ date, label: pkg.packageName, amount: rate });
        }
      } else if (
        cust.packageId === "0" ||
        cust.packageId === "custom" ||
        !cust.packageId
      ) {
        for (const [partId, qty] of Object.entries(cust.particularQuantities || {})) {
          if (qty > 0) {
            const part = particulars.find((p) => String(p.particularId) === partId);
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
      const rate =
        timeSlotId === "1"
          ? Number(pkg.dayRate || 0)
          : Number(pkg.nightRate || 0);
      lines.push({
        label: `Package Rate × ${numDays} day(s)`,
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
    const vr = getVenueRentalParticular(particulars, slot);
    return vr ? [{ particularId: vr.particularId, quantity: 1 }] : [];
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
    const vr = getVenueRentalParticular(particulars, slot);
    return vr?.unitCost ? Number(vr.unitCost) : 0;
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
    const vr = getVenueRentalParticular(particulars, slot);
    if (!vr) return null;
    const slotLabel =
      slot === "1"
        ? "Day (8:00 AM – 5:00 PM)"
        : "Night (5:00 PM – 12 MN)";
    return {
      label: `Venue Rental — ${slotLabel}`,
      amount: vr.unitCost ? Number(vr.unitCost) : 0,
    };
  }

  return null;
}

export function getVenueRentalPriceHint(particulars) {
  const { day, night } = findVenueRentalParticulars(particulars);
  return {
    dayPrice: day?.unitCost ? Number(day.unitCost) : 0,
    nightPrice: night?.unitCost ? Number(night.unitCost) : 0,
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
