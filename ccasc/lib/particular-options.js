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

/**
 * Check if a particular name is the Basketball Game.
 */
export const BASKETBALL_NAME = "Basketball Game";

/**
 * Aircon compressor tier info (for display hints).
 */
export const AIRCON_TIERS = [
  { qty: 4, label: "100–1K pax", price: 3200 },
  { qty: 6, label: "1K–3K pax", price: 4800 },
  { qty: 8, label: "4K–6K pax", price: 6400 },
  { qty: 10, label: "7K–10K pax", price: 8000 },
];