/**
 * Copy and data for the public landing page (`app/page.js`).
 *
 * Everything here is sourced from the app itself so the landing page never
 * drifts from what the system actually does:
 *
 * - Venues, facilities and rates  -> the facility records managed in the admin
 *   Facility Management screen, read at runtime through
 *   `app/api/public/facilities` (see `components/landing/use-facilities.js`).
 *   Nothing about them is hard-coded here.
 * - Time slots                    -> `lib/time-slots.js` (TIME_SLOT_OPTIONS)
 * - Booking lead time             -> `lib/reservation-advance-booking.js`
 * - Deposit rate                  -> `components/order-of-payment-document.jsx`
 *   (`OOP_DEPOSIT_RATE`) -- duplicated here because that constant lives in a
 *   client component; keep the two in sync.
 * - Contact details               -> official Order of Payment letterhead
 */

import { MIN_ADVANCE_BOOKING_DAYS } from "@/lib/reservation-advance-booking";
import { TIME_SLOT_OPTIONS } from "@/lib/time-slots";

/** "PHP 20,000" style money text, no decimals on the landing page. */
export function formatPeso(amount) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
}

export const DEPOSIT_RATE = 0.1;

/** Same booking rule, re-exported under a copy-friendly name. */
export const MIN_LEAD_TIME = MIN_ADVANCE_BOOKING_DAYS;

export const NAV_LINKS = [
  { href: "#venues", label: "Venues" },
  { href: "#facilities", label: "Facilities" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#faq", label: "FAQ" },
  { href: "#contact", label: "Contact" },
];

export const HERO_STATS = [
  { label: "Bookable venues", value: "2" },
  // Counted from the facility records at runtime (`countFacilities`).
  { label: "Facilities", value: null, countFacilities: true },
  { label: "Days advance notice", value: `${MIN_ADVANCE_BOOKING_DAYS}+` },
];

export const VENUES = [
  {
    venueId: 1,
    name: "South Cotabato Gymnasium and Cultural Center",
    address: "26 Rafael Alunan Avenue, Zone IV, Koronadal City, South Cotabato",
    description:
      "The province's primary indoor venue for graduations, concerts, exhibits, conventions and civic gatherings.",
  },
  {
    venueId: 2,
    name: "South Cotabato Sports Complex",
    address: "Koronadal City, South Cotabato",
    description:
      "Outdoor and courtside facilities for athletic meets, leagues, trainings and community sports.",
  },
];

/**
 * Venue groups for the facilities section, in the order (and with the short
 * titles) the admin Facility Management screen uses. The facilities themselves
 * are never listed here - they come from the database at runtime.
 *
 * Sports Complex facilities are billed for the whole day at their single day
 * rate whatever slot is picked (see `getFacilityRateForSlot` in
 * `lib/reservation-package-select.js`); that is also why the admin table hides
 * their Night rate column.
 */
export const FACILITY_VENUES = [
  { venueId: 1, label: "Cultural Center" },
  { venueId: 2, label: "Sports Complex" },
];

export const ADD_ONS = [
  { name: "Chairs", note: "Up to 700 units" },
  { name: "Tables", note: "Standard rectangular" },
  { name: "Wireless microphone", note: "4 units" },
  { name: "Wired microphone", note: "10 units" },
  { name: "LED wall", note: "117 panels" },
  { name: "Aircon compressor", note: "Up to 10 units" },
];

/**
 * The steps a booking goes through, mirroring the client panel:
 * reservation -> Order of Payment -> document submission (Documents module)
 * -> coordinator confirmation.
 */
export const STEPS = [
  {
    title: "Create your account",
    description:
      "Register as a client with your name and organization details. Registration is free and only takes a few minutes.",
  },
  {
    title: "Submit a reservation",
    description: `Choose a venue, facility and event date. Reservations must be filed at least ${MIN_ADVANCE_BOOKING_DAYS} days ahead, and pick a Day, Night or Whole Day slot.`,
  },
  {
    title: "Order of Payment",
    description:
      "An Order of Payment is issued for your reservation. Settle it, including the 10% deposit that secures your slot, through the Provincial Treasurer's Office.",
  },
  {
    title: "Submit your documents",
    description:
      "Upload the documents for verification from your dashboard: the Official Receipt for a Sports Complex booking, or the Billing Statement and Official Receipt for the Cultural Center followed by its Certification and Contract of Lease.",
  },
  {
    title: "Booking confirmed",
    description:
      "Once your payment and documents are verified the booking is confirmed, and a notification lands in your inbox with the details.",
  },
];

export const FAQS = [
  {
    question: "How far in advance should I book?",
    answer: `Reservations must be filed at least ${MIN_ADVANCE_BOOKING_DAYS} days before your event date. The booking form will not accept earlier dates.`,
  },
  {
    question: "What time slots can I reserve?",
    answer: `Three slots are available: ${TIME_SLOT_OPTIONS.map((slot) => slot.label).join(", ")}.`,
  },
  {
    question: "Do I need to pay a deposit?",
    answer:
      "Yes. The Order of Payment issued for your reservation includes a 10% deposit that secures your slot.",
  },
  {
    question: "Can I rent equipment and add-ons?",
    answer:
      "Yes. Chairs, tables, wired and wireless microphones, the LED wall and aircon compressors can be added to a reservation, subject to availability.",
  },
  {
    question: "Can I change my schedule after booking?",
    answer:
      "Yes. Submit a reschedule request from your dashboard and the Program Coordinator will review the new dates.",
  },
  {
    question: "Are the published rates final?",
    answer:
      "Rates shown here are for reference only. The official Order of Payment issued for your reservation is the final basis for payment.",
  },
];

export const CONTACT = {
  office: "South Cotabato Economic Enterprise Management Office",
  address: "Alunan Ave., Brgy. Zone IV, City of Koronadal",
  phone: "(083) 228-9314",
  facebook: "SouthCot Gym",
  supportNote:
    "Problems signing in? Contact your facility or provincial IT support.",
};

