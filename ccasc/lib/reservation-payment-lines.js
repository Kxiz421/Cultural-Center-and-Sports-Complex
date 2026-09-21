import { formatReservedParticularCharge } from "@/lib/particular-options";

/**
 * Builds the charge lines that describe a reservation.
 *
 * Stored charge lines win; otherwise falls back to particulars, then the
 * single venue/package rate. Shared by the client Order of Payment page and
 * the reservation-history detail view so both show identical figures.
 */
export function buildPaymentLines(data, dateList = []) {
  if (data?.chargeLines?.length > 0) {
    return data.chargeLines.map((line) => ({
      date: line.date || null,
      label: line.label,
      amount: Number(line.amount) || 0,
    }));
  }

  if (data?.particulars?.length > 0) {
    return data.particulars.map((p) => {
      const { label, amount } = formatReservedParticularCharge(
        { name: p.name, quantity: p.quantity, unitCost: p.unitCost },
        { eventDayCount: dateList.length, allParticulars: data.particulars }
      );
      return { date: null, label, amount };
    });
  }

  return [
    {
      date: null,
      label: "Venue / Package Rate",
      amount: Number(data?.totalAmount) || 0,
    },
  ];
}
