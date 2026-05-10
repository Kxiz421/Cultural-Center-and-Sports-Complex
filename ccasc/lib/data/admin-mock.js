/**
 * Example-only mock data for CCASC admin UI (South Cotabato Gymnasium &
 * Cultural Center / Sports Complex). Not real records.
 */

export const MOCK_ADMIN_USER = {
  id: "ADM-001",
  username: "admin",
  firstName: "Lourdes",
  lastName: "Fernandez",
  email: "l.fernandez@example.gov.ph",
};

export const MOCK_REVENUE = {
  daily: 42850.75,
  weekly: 246320.5,
  yearly: 3180450.0,
};

export const MOCK_BOOKING_STATUS = {
  pending: 14,
  confirmed: 37,
};

export const MOCK_USERS = [
  {
    id: "STF-101",
    accountType: "staff",
    firstName: "Noemi",
    middleName: "R.",
    lastName: "Quinto",
    username: "n.quinto",
    email: "n.quinto@example.gov.ph",
    phone: "+63 917 111 2233",
    role: "Program Coordinator – Cultural Center",
    status: "Active",
    verification: null,
    createdAt: "2025-08-12",
  },
  {
    id: "STF-102",
    accountType: "staff",
    firstName: "Harold",
    middleName: "S.",
    lastName: "Malaki",
    username: "h.malaki",
    email: "h.malaki@example.gov.ph",
    phone: "+63 918 444 5566",
    role: "Program Coordinator – Sports Complex",
    status: "Active",
    verification: null,
    createdAt: "2025-09-01",
  },
  {
    id: "STF-103",
    accountType: "staff",
    firstName: "Irish",
    middleName: "T.",
    lastName: "Bandola",
    username: "i.bandola",
    email: "i.bandola@example.gov.ph",
    phone: "+63 919 777 8899",
    role: "Accounting Clerk – Cultural Center",
    status: "Active",
    verification: null,
    createdAt: "2025-07-20",
  },
  {
    id: "PUB-24001",
    accountType: "client",
    orgName: "Provincial Tourism Office",
    firstName: "Marivic",
    middleName: "L.",
    lastName: "Salazar",
    username: "pto.koronadal",
    email: "pto.bookings@example.gov.ph",
    phone: "+63 920 333 4455",
    role: "Provincial department agency",
    status: "Active",
    verification: "Approved",
    createdAt: "2026-01-05",
    documents: { coe: "coe_pto_2026.pdf", idFile: "id_msalazar.pdf" },
  },
  {
    id: "PRI-88012",
    accountType: "client",
    orgName: "South Cotabato Events Collective Inc.",
    firstName: "Jerome",
    middleName: "A.",
    lastName: "Delos Reyes",
    username: "events.collective.sc",
    email: "jerome.d@example.org",
    phone: "+63 921 555 6677",
    role: "Private organization",
    status: "Pending",
    verification: "Request Resubmission",
    createdAt: "2026-02-28",
    documents: { coe: "coe_scec.pdf", idFile: "id_pending.jpg" },
  },
];

export const MOCK_FACILITIES = [
  {
    id: "FAC-CC-01",
    name: "Teatro Sanghiraya Hall",
    site: "Cultural Center",
    description:
      "Main performance hall with orchestra pit, theatrical lighting, and acoustic shell.",
    rateHourly: 8500,
    rateDaily: 65000,
    capacity: 920,
    availability: "Available",
    revenueYtd: 412800,
    photoNote: "hall-stage-a.jpg",
  },
  {
    id: "FAC-SC-02",
    name: "Governor’s Cup Indoor Arena – Court A",
    site: "Sports Complex",
    description:
      "FIBA-sized hardwood court with retractable bleachers and LED scoreboard.",
    rateHourly: 6200,
    rateDaily: 48000,
    capacity: 2400,
    availability: "Available",
    revenueYtd: 928400,
    photoNote: "arena-court-a.jpg",
  },
  {
    id: "FAC-CC-03",
    name: "Lanawan Exhibit Gallery",
    site: "Cultural Center",
    description:
      "Climate-controlled gallery suitable for exhibits and receptions.",
    rateHourly: 3200,
    rateDaily: 24000,
    capacity: 280,
    availability: "Unavailable",
    revenueYtd: 156900,
    photoNote: "gallery-interior.jpg",
  },
];

export const MOCK_CALENDAR_EVENTS_CULTURAL = [
  {
    id: "CAL-CC-1",
    title: "Kasadya Folk Dance Finals",
    date: "2026-03-15",
    start: "18:00",
    end: "21:30",
    venue: "Teatro Sanghiraya Hall",
    status: "Confirmed",
    type: "event",
  },
  {
    id: "CAL-CC-2",
    title: "Provincial Youth Choir Workshop",
    date: "2026-03-22",
    start: "09:00",
    end: "17:00",
    venue: "Lanawan Exhibit Gallery",
    status: "Confirmed",
    type: "event",
  },
  {
    id: "CAL-CC-3",
    title: "Stage rigging inspection",
    date: "2026-03-08",
    start: "08:00",
    end: "12:00",
    venue: "Teatro Sanghiraya Hall",
    status: "Maintenance",
    type: "maintenance",
  },
  {
    id: "CAL-CC-4",
    title: "Eid al-Fitr (special non-working)",
    date: "2026-03-31",
    start: "00:00",
    end: "23:59",
    venue: "All Cultural venues",
    status: "Holiday",
    type: "holiday",
  },
];

export const MOCK_CALENDAR_EVENTS_SPORTS = [
  {
    id: "CAL-SC-1",
    title: "BARANGAY LIGA Semifinals – Court A",
    date: "2026-03-14",
    start: "16:00",
    end: "22:00",
    venue: "Indoor Arena – Court A",
    status: "Confirmed",
    type: "event",
  },
  {
    id: "CAL-SC-2",
    title: "Regional Volleyball Invitational – Day 2",
    date: "2026-03-21",
    start: "08:00",
    end: "20:00",
    venue: "Indoor Arena – Court B",
    status: "Confirmed",
    type: "event",
  },
  {
    id: "CAL-SC-3",
    title: "Floor resurfacing – Court A",
    date: "2026-03-05",
    start: "06:00",
    end: "18:00",
    venue: "Indoor Arena – Court A",
    status: "Maintenance",
    type: "maintenance",
  },
];

export const MOCK_BOOKINGS = [
  {
    id: "BK-2026-0142",
    clientType: "Provincial department agency",
    clientName: "Provincial Tourism Office",
    accountId: "PUB-24001",
    facility: "Teatro Sanghiraya Hall",
    eventDate: "2026-04-02",
    status: "Confirmed",
    payment: "Partially paid",
    amountTotal: 185000,
    amountPaid: 92500,
  },
  {
    id: "BK-2026-0156",
    clientType: "Private organization",
    clientName: "South Cotabato Events Collective Inc.",
    accountId: "PRI-88012",
    facility: "Governor’s Cup Indoor Arena – Court A",
    eventDate: "2026-03-29",
    status: "Confirmed",
    payment: "Fully paid",
    amountTotal: 96000,
    amountPaid: 96000,
  },
  {
    id: "BK-2026-0161",
    clientType: "Private organization",
    clientName: "Matulas Fitness League",
    accountId: "PRI-77103",
    facility: "Indoor Arena – Court B",
    eventDate: "2026-04-18",
    status: "Pending",
    payment: "Partially paid",
    amountTotal: 72000,
    amountPaid: 24000,
  },
];

export const MOCK_PARTICULARS = [
  {
    id: "PRT-01",
    name: "Plastic monoblock chair",
    description: "White stacking chair with padded seat liner option.",
    quantityTotal: 2400,
    quantityAllocated: 860,
    status: "Available",
  },
  {
    id: "PRT-02",
    name: "Round banquet table (60in)",
    description: "Wood laminate top with folding legs.",
    quantityTotal: 180,
    quantityAllocated: 54,
    status: "Available",
  },
  {
    id: "PRT-03",
    name: "Portable PA speaker pair",
    description: "Active 15in speakers with stands and mixer bundle.",
    quantityTotal: 12,
    quantityAllocated: 10,
    status: "Available",
  },
  {
    id: "PRT-04",
    name: "LED PAR wash lights",
    description: "RGB wash fixtures with flight case.",
    quantityTotal: 48,
    quantityAllocated: 48,
    status: "Unavailable",
  },
];

export const MOCK_PACKAGES = [
  {
    id: "PKG-001",
    name: "Matrimonial Reception Classic",
    description:
      "Indoor reception setup with stage basics and climate-controlled hall blocks.",
    price: 98500,
    status: "Active",
    inclusions: [
      "Plastic monoblock chair",
      "Round banquet table (60in)",
      "Portable PA speaker pair",
      "LED wall panel (12sqm)",
    ],
  },
  {
    id: "PKG-002",
    name: "Sports Exhibition Plus",
    description:
      "Tournament day bundle with crowd control stanchions and announcer kit.",
    price: 132000,
    status: "Active",
    inclusions: [
      "Plastic monoblock chair",
      "Portable PA speaker pair",
      "LED PAR wash lights",
      "Air conditioning auxiliary units",
    ],
  },
  {
    id: "PKG-003",
    name: "Community Forum Lite",
    description: "Half-day forum layout with minimal AV.",
    price: 28500,
    status: "Archived",
    inclusions: ["Plastic monoblock chair", "Portable PA speaker pair"],
  },
];

export const MOCK_ANNOUNCEMENTS = [
  {
    id: "ANN-09",
    title: "Temporary lane closure – Sports Complex ingress",
    body: "Expect single-lane entry March 6–8 for pavement repairs. Bookings remain active.",
    recipients: ["Clients", "Program Coordinators", "Accounting Clerk"],
    postedAt: "2026-03-04T08:15:00",
    archived: false,
  },
  {
    id: "ANN-08",
    title: "Cultural Center fire drill – March 11",
    body: "Mandatory evacuation drill 10:00–10:45 AM; lobby exhibits will pause viewing.",
    recipients: ["Program Coordinators", "Accounting Clerk"],
    postedAt: "2026-02-26T14:00:00",
    archived: false,
  },
  {
    id: "ANN-07",
    title: "Holiday blackout – Good Friday",
    body: "No public bookings on April 3; maintenance window reserved for both sites.",
    recipients: ["Clients", "Program Coordinators"],
    postedAt: "2026-02-18T09:30:00",
    archived: true,
  },
];

export function formatPhp(amount) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount);
}
