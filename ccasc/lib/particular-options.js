/**
 * Basketball game options.
 * The single "Basketball Game" particular uses encoded quantities
 * to select the game type. Pricing is handled in the reservations API.
 */
export const BASKETBALL_OPTIONS = [
  { value: 2, label: "Day w/o Shot Clock", price: 1000, shortLabel: "Day (no SC)" },
  { value: 3, label: "Day w/ Shot Clock", price: 1500, shortLabel: "Day (w/ SC)" },
  { value: 4, label: "Night w/o Shot Clock", price: 1500, shortLabel: "Night (no SC)" },
  { value: 5, label: "Night w/ Shot Clock", price: 2000, shortLabel: "Night (w/ SC)" },
  { value: 6, label: "Whole Day w/o Shot Clock", price: 2500, shortLabel: "Whole Day (no SC)" },
  { value: 7, label: "Whole Day w/ Shot Clock", price: 3500, shortLabel: "Whole Day (w/ SC)" },
];

/**
 * Get the display label for a basketball quantity selection.
 */
export function getBasketballLabel(qty) {
  const opt = BASKETBALL_OPTIONS.find(o => o.value === qty);
  return opt ? opt.label : null;
}

/**
 * Get the short display label for a basketball quantity selection.
 */
export function getBasketballShortLabel(qty) {
  const opt = BASKETBALL_OPTIONS.find(o => o.value === qty);
  return opt ? opt.shortLabel : null;
}

/**
 * Get the price for a basketball quantity selection.
 */
export function getBasketballPrice(qty) {
  const opt = BASKETBALL_OPTIONS.find(o => o.value === qty);
  return opt ? opt.price : null;
}

export const BASKETBALL_NAME = "Basketball Game";

export function isBasketballEncodedQuantity(qty) {
  const n = Number(qty);
  return n >= 2 && n <= 7;
}

/** Read quantity from a particulars map (supports string/number keys). */
export function readParticularQuantity(quantities, particularId) {
  if (!quantities) return 0;
  const key = String(particularId);
  const raw = quantities[key] ?? quantities[Number(particularId)];
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

export function isBasketballParticularName(name) {
  const n = name || "";
  return n === BASKETBALL_NAME || n.startsWith("Basketball Game");
}

export function isVenueRentalParticularName(name) {
  return /venue rental/i.test(name || "");
}

export function formatVenueRentalLabel(particularName, quantity = 1) {
  const name = particularName || "";
  const slotLabel = /night/i.test(name)
    ? "Night (5:00 PM – 12 MN)"
    : "Day (8:00 AM – 5:00 PM)";
  const base = `Venue Rental — ${slotLabel}`;
  const qty = Number(quantity) || 1;
  return qty > 1 ? `${base} × ${qty} day(s)` : base;
}

/** Display line for form preview (particular picker / summary). */
export function formatFormParticularLine(particularName, quantity, unitCost) {
  const qty = Number(quantity) || 0;
  const cost = Number(unitCost) || 0;

  if (particularName === BASKETBALL_NAME && isBasketballEncodedQuantity(qty)) {
    const optionLabel = getBasketballLabel(qty);
    const amount = getBasketballPrice(qty) || cost;
    return {
      label: optionLabel
        ? `Basketball Game — ${optionLabel}`
        : "Basketball Game",
      amount,
    };
  }

  if (isVenueRentalParticularName(particularName)) {
    return {
      label: formatVenueRentalLabel(particularName, qty),
      amount: cost * qty,
    };
  }

  if (isBasketballParticularName(particularName)) {
    return {
      label: qty > 0 ? `${particularName} × ${qty}` : particularName,
      amount: cost * qty,
    };
  }

  return {
    label: qty > 0 ? `${particularName} × ${qty}` : particularName,
    amount: cost * qty,
  };
}

/**
 * Display line for saved reservations (order of payment, API particulars).
 * Consolidated basketball encodes game type in quantity; multi-day uses eventDayCount.
 */
export function formatReservedParticularCharge(
  { name, quantity, unitCost },
  { eventDayCount = 1, allParticulars = [] } = {}
) {
  const qty = Number(quantity) || 0;
  const cost = Number(unitCost) || 0;

  if (name === BASKETBALL_NAME && isBasketballEncodedQuantity(qty)) {
    const perDay = getBasketballPrice(qty) || cost;
    const optionLabel = getBasketballLabel(qty);
    const baseLabel = optionLabel
      ? `Basketball Game — ${optionLabel}`
      : "Basketball Game";
    const basketballLines = (allParticulars || []).filter((p) =>
      isBasketballParticularName(p.name)
    );
    const applyEventDays =
      basketballLines.length === 1 &&
      basketballLines[0].name === BASKETBALL_NAME;
    const days = applyEventDays ? Math.max(1, eventDayCount) : 1;
    return {
      label: days > 1 ? `${baseLabel} × ${days} day(s)` : baseLabel,
      amount: perDay * days,
    };
  }

  return formatFormParticularLine(name, qty, cost);
}

/**
 * Aircon compressor tier info (for display hints).
 */
export const AIRCON_TIERS = [
  { qty: 4, label: "100–1K pax", price: 3200 },
  { qty: 6, label: "1K–3K pax", price: 4800 },
  { qty: 8, label: "4K–6K pax", price: 6400 },
  { qty: 10, label: "7K–10K pax", price: 8000 },
];