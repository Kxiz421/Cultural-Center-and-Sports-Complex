import {
  BASKETBALL_NAME,
  getBasketballPrice,
  isBasketballEncodedQuantity,
} from "@/lib/particular-options";

/**
 * Rate basis of one reserved particular — mirrors the pricing rules in
 * `POST /api/reservations` so a particular is charged the same way wherever it
 * is priced (booking, revenue report, approved reschedule).
 */
export function particularLineWeight({
  particularName = "",
  quantity = 0,
  unitCost = 0,
  eventDayCount = 1,
} = {}) {
  const qty = Number(quantity) || 0;
  const cost = Number(unitCost) || 0;
  const days = Math.max(1, Number(eventDayCount) || 1);

  if (particularName === BASKETBALL_NAME && isBasketballEncodedQuantity(qty)) {
    return (getBasketballPrice(qty) || cost) * days;
  }
  if (particularName.startsWith("Basketball Game")) return cost;
  if (/venue rental/i.test(particularName)) return cost * (qty || 1);
  return cost * qty;
}
