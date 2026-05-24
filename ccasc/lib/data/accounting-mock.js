/**
 * Mock data for Accounting Clerk module (South Cotabato Gymnasium &
 * Cultural Center / Sports Complex). Not real records.
 */

export const MOCK_RESERVATION_SUMMARY = {
  total: 27,
  partiallyPaid: 12,
  fullyPaid: 15,
};

export const MOCK_RESERVATIONS = [
  {
    id: "RES-2026-0142",
    clientName: "Provincial Tourism Office",
    clientType: "Provincial department agency",
    venue: "Teatro Sanghiraya Hall",
    eventType: "Provincial Tourism Conference",
    eventDate: "2026-04-02",
    timeSlot: "08:00 – 17:00",
    status: "Confirmed",
    payment: "Partially paid",
    amountTotal: 185000,
    amountPaid: 92500,
    particulars: ["Plastic monoblock chair (200pcs)", "Portable PA speaker pair", "LED wall panel (12sqm)"],
  },
  {
    id: "RES-2026-0156",
    clientName: "South Cotabato Events Collective Inc.",
    clientType: "Private organization",
    venue: "Governor's Cup Indoor Arena – Court A",
    eventType: "Basketball Tournament",
    eventDate: "2026-03-29",
    timeSlot: "16:00 – 22:00",
    status: "Confirmed",
    payment: "Fully paid",
    amountTotal: 96000,
    amountPaid: 96000,
    particulars: ["Plastic monoblock chair (150pcs)", "Portable PA speaker pair", "LED PAR wash lights"],
  },
  {
    id: "RES-2026-0161",
    clientName: "Matulas Fitness League",
    clientType: "Private organization",
    venue: "Indoor Arena – Court B",
    eventType: "Fitness Expo",
    eventDate: "2026-04-18",
    timeSlot: "08:00 – 20:00",
    status: "Pending",
    payment: "Partially paid",
    amountTotal: 72000,
    amountPaid: 24000,
    particulars: ["Plastic monoblock chair (100pcs)", "Round banquet table (20pcs)"],
  },
  {
    id: "RES-2026-0170",
    clientName: "Provincial Agriculture Office",
    clientType: "Provincial department agency",
    venue: "Teatro Sanghiraya Hall",
    eventType: "Farmers Summit",
    eventDate: "2026-05-10",
    timeSlot: "09:00 – 17:00",
    status: "Confirmed",
    payment: "Fully paid",
    amountTotal: 175000,
    amountPaid: 175000,
    particulars: ["Plastic monoblock chair (300pcs)", "Portable PA speaker pair", "LED wall panel (12sqm)"],
  },
  {
    id: "RES-2026-0182",
    clientName: "DepEd South Cotabato",
    clientType: "Provincial department agency",
    venue: "Lanawan Exhibit Gallery",
    eventType: "Division Press Conference",
    eventDate: "2026-05-22",
    timeSlot: "07:00 – 17:00",
    status: "Pending",
    payment: "Partially paid",
    amountTotal: 52000,
    amountPaid: 26000,
    particulars: ["Plastic monoblock chair (80pcs)", "Round banquet table (15pcs)"],
  },
  {
    id: "RES-2026-0195",
    clientName: "South Cotabato Artists Guild",
    clientType: "Private organization",
    venue: "Teatro Sanghiraya Hall",
    eventType: "Art Exhibition Gala",
    eventDate: "2026-06-05",
    timeSlot: "18:00 – 21:30",
    status: "Confirmed",
    payment: "Fully paid",
    amountTotal: 135000,
    amountPaid: 135000,
    particulars: ["LED PAR wash lights (24pcs)", "LED wall panel (12sqm)", "Portable PA speaker pair"],
  },
];

export const MOCK_MONTHLY_REVENUE = [
  { month: "January", clientRevenue: 285000, pgoCharges: 125000 },
  { month: "February", clientRevenue: 342000, pgoCharges: 140000 },
  { month: "March", clientRevenue: 218500, pgoCharges: 98000 },
  { month: "April", clientRevenue: 396000, pgoCharges: 165000 },
  { month: "May", clientRevenue: 274000, pgoCharges: 112000 },
  { month: "June", clientRevenue: 312000, pgoCharges: 134000 },
  { month: "July", clientRevenue: 256000, pgoCharges: 108000 },
  { month: "August", clientRevenue: 289000, pgoCharges: 120000 },
  { month: "September", clientRevenue: 301000, pgoCharges: 128000 },
  { month: "October", clientRevenue: 267000, pgoCharges: 115000 },
  { month: "November", clientRevenue: 354000, pgoCharges: 148000 },
  { month: "December", clientRevenue: 425000, pgoCharges: 178000 },
];

export const MOCK_PARTICULARS = [
  { id: "PRT-01", name: "Plastic monoblock chair", unitPrice: 25, available: 2400 },
  { id: "PRT-02", name: "Round banquet table (60in)", unitPrice: 150, available: 180 },
  { id: "PRT-03", name: "Portable PA speaker pair", unitPrice: 3500, available: 12 },
  { id: "PRT-04", name: "LED PAR wash lights", unitPrice: 1200, available: 48 },
  { id: "PRT-05", name: "LED wall panel (12sqm)", unitPrice: 5000, available: 4 },
  { id: "PRT-06", name: "Air conditioning auxiliary units", unitPrice: 2000, available: 8 },
];

export const MOCK_PACKAGES = [
  { id: "PKG-001", name: "Matrimonial Reception Classic", dayRate: 85000, nightRate: 98500, inclusions: ["Plastic monoblock chair", "Round banquet table (60in)", "Portable PA speaker pair", "LED wall panel (12sqm)"] },
  { id: "PKG-002", name: "Sports Exhibition Plus", dayRate: 110000, nightRate: 132000, inclusions: ["Plastic monoblock chair", "Portable PA speaker pair", "LED PAR wash lights", "Air conditioning auxiliary units"] },
  { id: "PKG-003", name: "Community Forum Lite", dayRate: 25000, nightRate: 28500, inclusions: ["Plastic monoblock chair", "Portable PA speaker pair"] },
];

export function formatPhp(amount) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount);
}