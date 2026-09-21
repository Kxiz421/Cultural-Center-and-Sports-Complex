"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Search, UserCheck, UserPlus, Loader2, Info, Layers, Calendar, Plus, RotateCcw, ChevronLeft, ChevronRight, Building2, Clock, Printer } from "lucide-react";
import {
  isVirtualPackageId,
  isRegularPackageId,
  isFacilityPackageId,
  parseFacilityId,
  VIRTUAL_PACKAGE_IDS,
  filterCustomParticulars,
  getVirtualPackageParticulars,
  getVirtualPackageDisplayInfo,
  syncVirtualPackageStateForTimeSlot,
  deriveTimeSlotFromVirtualPackage,
  parseReservationPackageId,
  isConsolidatedBasketballEntry,
  buildReservationSummaryLines,
  sumReservationSummaryLines,
  resolveVenueRentalSlot,
} from "@/lib/reservation-package-select";
import { readParticularQuantity } from "@/lib/particular-options";
import { TIME_SLOT, TIME_SLOT_OPTIONS, timeSlotAfterPackageChange, isWholeDaySlot } from "@/lib/time-slots";
import {
  ReservationVirtualPackagePanel,
  ReservationPackageSelectItems,
} from "@/components/reservation-virtual-package-panel";
import { ParticularQuantityStepper } from "@/components/particular-quantity-stepper";
import OrderOfPaymentDocument from "@/components/order-of-payment-document";
import {
  getMinEventDate,
  getMinEventDateKey,
  isEventDateTooSoon,
  validateAdvanceBookingDates,
  MIN_ADVANCE_BOOKING_DAYS,
} from "@/lib/reservation-advance-booking";

const VENUES = [
  { id: 1, name: "Cultural Center" },
  { id: 2, name: "Sports Complex" },
];

const TIME_SLOTS = TIME_SLOT_OPTIONS.map((slot) => ({
  id: slot.id,
  name: slot.label,
}));

const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

/**
 * Get the correct facility rate based on the selected time slot.
 */
function getFacilityRateBySlot(facility, timeSlotId) {
  const dayRate = Number(facility?.rateDay ?? facility?.rateHourly ?? 0);
  const nightRate = Number(facility?.rateNight ?? facility?.rateDaily ?? 0);
  const slot = String(timeSlotId || "1");
  if (slot === "2") return nightRate > 0 ? nightRate : dayRate;
  if (slot === "3") return dayRate + nightRate;
  return dayRate > 0 ? dayRate : nightRate;
}

function normalizeFacilityIds(value) {
  if (Array.isArray(value)) {
    return value.map(String).filter((id) => id && id !== "0");
  }
  if (value && value !== "0") return [String(value)];
  return [];
}

/** Get the maximum quantity allowed for a facility (from DB capacity field). */
function getFacilityMaxQuantity(facility) {
  const capacity = Number(facility?.capacity ?? 0);
  return capacity > 0 ? capacity : 99;
}

/** Check if any facility has a quantity > 0, given a quantities map. */
function hasAnyFacilityQuantity(qtyMap) {
  return Object.values(qtyMap).some((q) => Number(q) > 0);
}

function buildFacilitySummaryLines({
  facilities,
  facilityQuantities,
  selectedDatesCount,
  timeSlotId,
}) {
  const lines = [];
  const numDays = Math.max(1, selectedDatesCount || 1);
  for (const [id, qty] of Object.entries(facilityQuantities || {})) {
    const parsedQty = Number(qty) || 0;
    if (parsedQty <= 0) continue;
    const facility = facilities.find((f) => String(f.facilityId) === String(id));
    if (!facility) continue;
    const rate = getFacilityRateBySlot(facility, timeSlotId);
    const label =
      numDays > 1
        ? `${facility.name} × ${parsedQty} × ${numDays} day(s)`
        : parsedQty > 1
          ? `${facility.name} × ${parsedQty}`
          : facility.name;
    lines.push({
      label,
      amount: rate * parsedQty * numDays,
      facilityId: String(facility.facilityId),
      quantity: parsedQty,
    });
  }
  return lines;
}

export default function WalkInReservationPage() {
  const minEventDateKey = getMinEventDateKey();

  // Toggle state
  const [isExistingUser, setIsExistingUser] = React.useState(false);

  // Existing user search
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState([]);
  const [searching, setSearching] = React.useState(false);
  const [selectedClient, setSelectedClient] = React.useState(null);
  const [showSearchResults, setShowSearchResults] = React.useState(false);

  // Walk-in manual fields
  const [clientName, setClientName] = React.useState("");
  const [clientContact, setClientContact] = React.useState("");
  const [clientEmail, setClientEmail] = React.useState("");

  // Reservation details
  const [venueId, setVenueId] = React.useState("");
  const [eventType, setEventType] = React.useState("");
  const [eventDate, setEventDate] = React.useState("");
  const [timeSlotId, setTimeSlotId] = React.useState("");
  const [packageId, setPackageId] = React.useState("");
  const [venueRentalSlot, setVenueRentalSlot] = React.useState("");
  const [notes, setNotes] = React.useState("");

  // Packages
  const [packages, setPackages] = React.useState([]);
  const [packagesLoading, setPackagesLoading] = React.useState(true);

  // Particulars
  const [particulars, setParticulars] = React.useState([]);
  const [particularQuantities, setParticularQuantities] = React.useState({});
  const [particularsLoading, setParticularsLoading] = React.useState(true);

  // Sports Complex facilities
  const [facilities, setFacilities] = React.useState([]);
  const [selectedFacilityIds, setSelectedFacilityIds] = React.useState([]);
  const [facilityQuantities, setFacilityQuantities] = React.useState({});
  const [facilitiesLoading, setFacilitiesLoading] = React.useState(false);
  /** dateKey → facilityId[] already reserved by other reservations */
  const [reservedByDate, setReservedByDate] = React.useState({});
  const [facilityAvailLoading, setFacilityAvailLoading] = React.useState(false);

  // Per-date customization for multi-day
  const [customizePerDate, setCustomizePerDate] = React.useState(false);
  const [dateCustomizations, setDateCustomizations] = React.useState({});
  const [showCustomizeDialog, setShowCustomizeDialog] = React.useState(false);

  // Dialog and submission
  const [showOrder, setShowOrder] = React.useState(false);
  // Order of Payment generated for the walk-in client after a successful save.
  const [savedOrder, setSavedOrder] = React.useState(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [eventDates, setEventDates] = React.useState([]);
  const [selectedDates, setSelectedDates] = React.useState(new Set());
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const [availability, setAvailability] = React.useState({});
  const [availLoading, setAvailLoading] = React.useState(false);

  // Search debounce ref
  const searchTimeoutRef = React.useRef(null);
  const submitLockRef = React.useRef(false);

  // Load packages and particulars on mount
  React.useEffect(() => {
    async function loadData() {
      try {
        const [pkgRes, partRes] = await Promise.all([
          fetch("/api/packages"),
          fetch("/api/particulars"),
        ]);
        const pkgData = await pkgRes.json();
        const partData = await partRes.json();
        if (Array.isArray(pkgData)) setPackages(pkgData);
        if (Array.isArray(partData)) setParticulars(partData);
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setPackagesLoading(false);
        setParticularsLoading(false);
      }
    }
    loadData();
  }, []);

  // Load facilities based on venue selection
  React.useEffect(() => {
    if (venueId === "2" || venueId === "1") {
      setFacilitiesLoading(true);
      fetch("/api/facilities")
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) {
            const matchingFacilities = data.filter((item) => item.venueId === parseInt(venueId, 10));
            setFacilities(matchingFacilities);
          } else {
            setFacilities([]);
          }
        })
        .catch((err) => {
          console.error("Failed to load facilities:", err);
          setFacilities([]);
        })
        .finally(() => setFacilitiesLoading(false));
    } else {
      setFacilities([]);
      setSelectedFacilityIds([]);
      setReservedByDate({});
      setFacilityQuantities({});
    }
  }, [venueId]);

// Fetch availability when venue or month changes
  React.useEffect(() => {
    if (!venueId) return;
    const monthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}`;
    setAvailLoading(true);
    fetch(`/api/availability?venueId=${venueId}&month=${monthStr}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.dates) {
          const map = {};
          for (const d of data.dates) map[d.date] = d;
          setAvailability(map);
        }
      })
      .catch((err) => console.error("Failed to load availability:", err))
      .finally(() => setAvailLoading(false));
  }, [venueId, currentMonth]);

  // Load facility availability when dates are selected for Sports Complex
  React.useEffect(() => {
    if (venueId !== "2") {
      setReservedByDate({});
      return;
    }
    const dates = [...selectedDates].sort();
    if (dates.length === 0) {
      setReservedByDate({});
      return;
    }
    let cancelled = false;
    setFacilityAvailLoading(true);
    fetch(
      `/api/facilities/availability?venueId=2&dates=${dates.map(encodeURIComponent).join(",")}`
    )
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setReservedByDate(data.reservedByDate || {});
      })
      .catch((err) => {
        console.error("Failed to load facility availability:", err);
        if (!cancelled) setReservedByDate({});
      })
      .finally(() => {
        if (!cancelled) setFacilityAvailLoading(false);
      });
    return () => { cancelled = true; };
  }, [venueId, selectedDates]);

  // Drop facility selections that conflict with newly loaded reserved facilities
  React.useEffect(() => {
    if (Object.keys(reservedByDate).length === 0) return;
    if (!venueId || venueId !== "2") return;
    const reservedOnAny = new Set();
    for (const date of selectedDates) {
      for (const id of reservedByDate[date] || []) reservedOnAny.add(String(id));
    }
    setSelectedFacilityIds((prev) => {
      const next = prev.filter((id) => !reservedOnAny.has(String(id)));
      return next.length === prev.length ? prev : next;
    });
  }, [reservedByDate, selectedDates, venueId]);

  // Initialize date customizations when customize mode is turned on or dates change
  React.useEffect(() => {
    if (customizePerDate && selectedDates.size > 0) {
      setDateCustomizations((prev) => {
        const updated = { ...prev };
        for (const date of selectedDates) {
          if (!updated[date]) {
            updated[date] = {
              morning: {
                enabled: true,
                packageId: packageId || "0",
                particularQuantities: { ...particularQuantities },
                timeSlotId: TIME_SLOT.DAY,
                venueRentalSlot: venueRentalSlot || "",
              },
              night: {
                enabled: false,
                packageId: "0",
                particularQuantities: {},
                timeSlotId: TIME_SLOT.NIGHT,
                venueRentalSlot: "",
              },
            };
          }
        }
        for (const date of Object.keys(updated)) {
          if (!selectedDates.has(date)) {
            delete updated[date];
          }
        }
        return updated;
      });
    }
  }, [customizePerDate, selectedDates]);

  // Search clients when query changes
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    setSelectedClient(null);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.trim().length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    // Debounce search
    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/clients/search?q=${encodeURIComponent(value.trim())}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setSearchResults(data);
          setShowSearchResults(true);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setSearching(false);
      }
    }, 300);
  };

  const handleSelectClient = (client) => {
    setSelectedClient(client);
    setSearchQuery(client.fullName);
    setShowSearchResults(false);
    setSearchResults([]);
  };

  const handleTimeSlotChange = (value) => {
    setTimeSlotId(value);

    // Remap package when switching time slot to keep the selected value valid
    const isWholeDay = isWholeDaySlot(value);
    const remapped = (currentPkgId) => {
      if (!currentPkgId || currentPkgId === "0" || currentPkgId === "custom" || isVirtualPackageId(currentPkgId)) return currentPkgId;
      const currentNum = Number(currentPkgId);
      if (isWholeDay && (currentNum === 3 || currentNum === 4)) {
        // Night → Day: 3→1 (Standard), 4→2 (LED)
        return String(currentNum - 2);
      }
      return currentPkgId;
    };
    setPackageId((prev) => remapped(prev));

    if (packageId === VIRTUAL_PACKAGE_IDS.VENUE_RENTAL) {
      setVenueRentalSlot(resolveVenueRentalSlot(value, value));
    }

    if (packageId === VIRTUAL_PACKAGE_IDS.BASKETBALL) {
      const synced = syncVirtualPackageStateForTimeSlot(
        VIRTUAL_PACKAGE_IDS.BASKETBALL,
        particulars,
        particularQuantities,
        "",
        value
      );
      setParticularQuantities(synced.particularQuantities);
    }

    if (customizePerDate && Object.keys(dateCustomizations).length > 0) {
      setDateCustomizations((prev) => {
        const updated = { ...prev };
        for (const date of Object.keys(updated)) {
          const morningCust = updated[date]?.morning || {};
          const morningSynced = syncVirtualPackageStateForTimeSlot(
            morningCust.packageId,
            particulars,
            morningCust.particularQuantities || {},
            morningCust.venueRentalSlot,
            value
          );
          const nightCust = updated[date]?.night || {};
          const nightSynced = syncVirtualPackageStateForTimeSlot(
            nightCust.packageId,
            particulars,
            nightCust.particularQuantities || {},
            nightCust.venueRentalSlot,
            value
          );
          updated[date] = {
            morning: {
              ...morningCust,
              timeSlotId: value,
              packageId: remapped(morningCust.packageId),
              particularQuantities: morningSynced.particularQuantities,
              venueRentalSlot:
                morningCust.packageId === VIRTUAL_PACKAGE_IDS.VENUE_RENTAL
                  ? morningSynced.venueRentalSlot
                  : morningCust.venueRentalSlot,
            },
            night: {
              ...nightCust,
              timeSlotId: value,
              packageId: remapped(nightCust.packageId),
              particularQuantities: nightSynced.particularQuantities,
              venueRentalSlot:
                nightCust.packageId === VIRTUAL_PACKAGE_IDS.VENUE_RENTAL
                  ? nightSynced.venueRentalSlot
                  : nightCust.venueRentalSlot,
            },
          };
        }
        return updated;
      });
    }
  };

  const handleVirtualParticularQuantitiesChange = (pq) => {
    setParticularQuantities(pq);
    if (packageId === VIRTUAL_PACKAGE_IDS.BASKETBALL) {
      const slot = deriveTimeSlotFromVirtualPackage(
        packageId,
        particulars,
        pq,
        venueRentalSlot,
        timeSlotId
      );
      if (slot && slot !== timeSlotId) {
        setTimeSlotId(slot);
      }
    }
  };

  const handleVenueRentalSlotChange = (val) => {
    setVenueRentalSlot(val);
    setTimeSlotId(val);
  };

  const isSportsComplex = venueId === "2";

  const reservedFacilityIdsGlobal = React.useMemo(() => {
    const reserved = new Set();
    for (const date of selectedDates) {
      for (const id of reservedByDate[date] || []) reserved.add(String(id));
    }
    return reserved;
  }, [reservedByDate, selectedDates]);

  const toggleFacilitySelection = (facilityId) => {
    const id = String(facilityId);
    if (reservedFacilityIdsGlobal.has(id)) {
      toast.error("This facility is already reserved on one of the selected dates.");
      return;
    }
    setSelectedFacilityIds((prev) => {
      if (prev.includes(id)) {
        setFacilityQuantities((qPrev) => {
          const next = { ...qPrev };
          delete next[id];
          return next;
        });
        return prev.filter((x) => x !== id);
      } else {
        const facility = facilities.find((f) => String(f.facilityId) === id);
        const maxQty = facility ? (facility.capacity > 0 ? facility.capacity : 99) : 99;
        setFacilityQuantities((qPrev) => ({ ...qPrev, [id]: 1 }));
        return [...prev, id];
      }
    });
  };

  const handleDateVirtualParticularQuantitiesChange = (date, pq) => {
    const cust = dateCustomizations[date] || {};
    const slot = deriveTimeSlotFromVirtualPackage(
      cust.packageId,
      particulars,
      pq,
      cust.venueRentalSlot,
      cust.timeSlotId || timeSlotId
    );
    setDateCustomizations((prev) => ({
      ...prev,
      [date]: {
        ...prev[date],
        particularQuantities: pq,
        timeSlotId: slot || prev[date]?.timeSlotId || timeSlotId,
      },
    }));
  };

  const handleDateVenueRentalSlotChange = (date, val) => {
    setDateCustomizations((prev) => ({
      ...prev,
      [date]: { ...prev[date], venueRentalSlot: val, timeSlotId: val },
    }));
  };

  const handlePackageSelect = (value) => {
    // Cultural Center facility rental selected from the packages dropdown.
    // Priced from the facility's own rate — see buildReservationSummaryLines.
    if (isFacilityPackageId(value)) {
      setPackageId(value);
      setVenueRentalSlot("");
      setParticularQuantities({});
      if (customizePerDate && Object.keys(dateCustomizations).length > 0) {
        setDateCustomizations((prev) => {
          const updated = { ...prev };
          for (const date of Object.keys(updated)) {
            updated[date] = {
              ...updated[date],
              packageId: value,
              particularQuantities: {},
              venueRentalSlot: "",
              timeSlotId: updated[date]?.timeSlotId || timeSlotId,
            };
          }
          return updated;
        });
      }
      return;
    }
    if (isVirtualPackageId(value)) {
      setPackageId(value);
      if (value === VIRTUAL_PACKAGE_IDS.VENUE_RENTAL) {
        setVenueRentalSlot((prev) => prev || timeSlotId || "1");
      } else {
        setVenueRentalSlot("");
      }
      setParticularQuantities({});
      if (customizePerDate && Object.keys(dateCustomizations).length > 0) {
        setDateCustomizations((prev) => {
          const updated = { ...prev };
          for (const date of Object.keys(updated)) {
            updated[date] = {
              ...updated[date],
              packageId: value,
              particularQuantities: {},
              timeSlotId: updated[date]?.timeSlotId || timeSlotId,
              venueRentalSlot:
                value === VIRTUAL_PACKAGE_IDS.VENUE_RENTAL
                  ? venueRentalSlot || timeSlotId || "1"
                  : "",
            };
          }
          return updated;
        });
      }
      return;
    }
    if (value && value !== "0" && value !== "custom") {
      const selectedPkg = packages.find(p => String(p.packageId) === value);
      if (selectedPkg) {
        setPackageId(value);
        setTimeSlotId((prev) =>
          timeSlotAfterPackageChange(prev, selectedPkg.timeSlotId)
        );
        setParticularQuantities({});
        if (customizePerDate && Object.keys(dateCustomizations).length > 0) {
          setDateCustomizations((prev) => {
            const updated = { ...prev };
            for (const date of Object.keys(updated)) {
              updated[date] = { ...updated[date], packageId: value, particularQuantities: {} };
            }
            return updated;
          });
        }
        return;
      }
    }
    setPackageId(value);
    if (value === "custom" || value === "0") {
      setParticularQuantities({});
      if (customizePerDate && Object.keys(dateCustomizations).length > 0) {
        setDateCustomizations((prev) => {
          const updated = { ...prev };
          for (const date of Object.keys(updated)) {
            updated[date] = { ...updated[date], packageId: value, particularQuantities: {} };
          }
          return updated;
        });
      }
    }
  };

  // Per-date customization handlers — morning/night sessions
  const handleDateSessionPackageSelect = (date, session, pkgId) => {
    let nextTimeSlotId =
      dateCustomizations[date]?.[session]?.timeSlotId || (session === "morning" ? TIME_SLOT.DAY : TIME_SLOT.NIGHT);
    // Cultural Center facility rental for this date/session (priced from the facility rate)
    if (isFacilityPackageId(pkgId)) {
      setDateCustomizations((prev) => ({
        ...prev,
        [date]: {
          ...prev[date],
          [session]: {
            ...prev[date]?.[session],
            enabled: true,
            packageId: pkgId,
            timeSlotId: nextTimeSlotId,
            venueRentalSlot: "",
            particularQuantities: {},
          },
        },
      }));
      return;
    }
    const selectedPkg = packages.find((p) => String(p.packageId) === pkgId);

    if (selectedPkg && isRegularPackageId(pkgId)) {
      nextTimeSlotId = timeSlotAfterPackageChange(
        nextTimeSlotId,
        selectedPkg.timeSlotId
      );
    } else if (pkgId === VIRTUAL_PACKAGE_IDS.VENUE_RENTAL) {
      nextTimeSlotId =
        dateCustomizations[date]?.[session]?.venueRentalSlot ||
        venueRentalSlot ||
        timeSlotId ||
        TIME_SLOT.DAY;
    }

    setDateCustomizations((prev) => ({
      ...prev,
      [date]: {
        ...prev[date],
        [session]: {
          ...prev[date]?.[session],
          enabled: true,
          packageId: pkgId,
          timeSlotId: nextTimeSlotId,
          venueRentalSlot:
            pkgId === VIRTUAL_PACKAGE_IDS.VENUE_RENTAL
              ? prev[date]?.[session]?.venueRentalSlot || venueRentalSlot || nextTimeSlotId
              : "",
          particularQuantities:
            isVirtualPackageId(pkgId) || (pkgId && pkgId !== "0" && pkgId !== "custom")
              ? (prev[date]?.[session]?.particularQuantities || {})
              : (prev[date]?.[session]?.particularQuantities || {}),
        },
      },
    }));
  };

  // Legacy single-package per date handler (backward compatibility)
  const handleDatePackageSelect = (date, pkgId) => {
    let nextTimeSlotId =
      dateCustomizations[date]?.timeSlotId || timeSlotId || "1";
    // Cultural Center facility rental for this date (priced from the facility rate)
    if (isFacilityPackageId(pkgId)) {
      setDateCustomizations((prev) => ({
        ...prev,
        [date]: {
          ...prev[date],
          packageId: pkgId,
          timeSlotId: nextTimeSlotId,
          venueRentalSlot: "",
          particularQuantities: {},
        },
      }));
      return;
    }
    const selectedPkg = packages.find((p) => String(p.packageId) === pkgId);

    if (selectedPkg && isRegularPackageId(pkgId)) {
      nextTimeSlotId = timeSlotAfterPackageChange(
        nextTimeSlotId,
        selectedPkg.timeSlotId
      );
    } else if (pkgId === VIRTUAL_PACKAGE_IDS.VENUE_RENTAL) {
      nextTimeSlotId =
        dateCustomizations[date]?.venueRentalSlot ||
        venueRentalSlot ||
        timeSlotId ||
        "1";
    }

    setDateCustomizations((prev) => ({
      ...prev,
      [date]: {
        ...prev[date],
        packageId: pkgId,
        timeSlotId: nextTimeSlotId,
        venueRentalSlot:
          pkgId === VIRTUAL_PACKAGE_IDS.VENUE_RENTAL
            ? prev[date]?.venueRentalSlot || venueRentalSlot || nextTimeSlotId
            : "",
        particularQuantities:
          isVirtualPackageId(pkgId) || (pkgId && pkgId !== "0" && pkgId !== "custom")
            ? {}
            : (prev[date]?.particularQuantities || {}),
      },
    }));
  };

  const handleDateSessionVirtualParticularQuantitiesChange = (date, session, pq) => {
    const cust = dateCustomizations[date]?.[session] || {};
    const slot = deriveTimeSlotFromVirtualPackage(
      cust.packageId,
      particulars,
      pq,
      cust.venueRentalSlot,
      cust.timeSlotId || (session === "morning" ? TIME_SLOT.DAY : TIME_SLOT.NIGHT)
    );
    setDateCustomizations((prev) => ({
      ...prev,
      [date]: {
        ...prev[date],
        [session]: {
          ...prev[date]?.[session],
          particularQuantities: pq,
          timeSlotId: slot || prev[date]?.[session]?.timeSlotId || (session === "morning" ? TIME_SLOT.DAY : TIME_SLOT.NIGHT),
        },
      },
    }));
  };

  const handleDateSessionVenueRentalSlotChange = (date, session, val) => {
    setDateCustomizations((prev) => ({
      ...prev,
      [date]: {
        ...prev[date],
        [session]: {
          ...prev[date]?.[session],
          venueRentalSlot: val,
          timeSlotId: val,
        },
      },
    }));
  };

// Toggle date selection for calendar
  const toggleDate = (dateStr) => {
    if (!availability[dateStr]?.available || isEventDateTooSoon(dateStr)) return;
    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateStr)) next.delete(dateStr);
      else next.add(dateStr);
      return next;
    });
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };
  const toggleCustomizeMode = () => {
    if (!customizePerDate) {
      const initial = {};
      const isSports = venueId === "2";
      for (const date of selectedDates) {
        initial[date] = {
          morning: {
            enabled: true,
            packageId: packageId || "0",
            particularQuantities: { ...particularQuantities },
            timeSlotId: TIME_SLOT.DAY,
            venueRentalSlot: venueRentalSlot || "",
          },
          night: {
            enabled: false,
            packageId: "0",
            particularQuantities: {},
            timeSlotId: TIME_SLOT.NIGHT,
            venueRentalSlot: "",
          },
          ...(isSports ? { facilityIds: [...selectedFacilityIds] } : {}),
        };
      }
      setDateCustomizations(initial);
      setShowCustomizeDialog(true);
    } else {
      setDateCustomizations({});
      setShowCustomizeDialog(false);
    }
    setCustomizePerDate(!customizePerDate);
  };

  const handleGenerateOrder = () => {
    // In per-date mode the global time slot/package selects are locked; the
    // slot is carried per date instead of the global form value.
    const hasPerDateSettings = customizePerDate && Object.keys(dateCustomizations).length > 0;
    const effectiveEventDate = [...selectedDates].sort()[0];
    const effectiveTimeSlotId =
      timeSlotId ||
      (hasPerDateSettings
        ? Object.values(dateCustomizations).find((c) => c && c.timeSlotId)?.timeSlotId
        : "") ||
      TIME_SLOT.DAY;
    if (!venueId || !effectiveEventDate || !effectiveTimeSlotId || !eventType) {
      toast.error("Please fill in all required fields.");
      return;
    }

    // Validate 7-day advance booking
    const datesToCheck = [effectiveEventDate, ...selectedDates].filter(Boolean);
    const advanceCheck = validateAdvanceBookingDates(datesToCheck);
    if (!advanceCheck.valid) {
      toast.error(advanceCheck.error);
      return;
    }

    if (isExistingUser && !selectedClient) {
      toast.error("Please search and select an existing user.");
      return;
    }

    if (!isExistingUser && !clientName) {
      toast.error("Please enter the walk-in client's name.");
      return;
    }

    // Sports Complex validation: require at least one facility
    if (isSportsComplex && selectedFacilityIds.length === 0) {
      toast.error("Please select at least one facility.");
      return;
    }

    if (!isSportsComplex && !customizePerDate && isVirtualPackageId(packageId)) {
      const entries = getVirtualPackageParticulars(
        packageId,
        particulars,
        particularQuantities,
        timeSlotId,
        venueRentalSlot
      );
      if (!entries.length) {
        toast.error("Please complete your Basketball Game or Venue Rental selection.");
        return;
      }
    }

    setShowOrder(true);
  };

  const handleSubmitReservation = async () => {
    if (submitting || submitLockRef.current) return;

    const sortedDates = [...selectedDates].sort();
    const primaryDate = sortedDates[0];

    const datesToCheck = [...sortedDates];
    const advanceCheck = validateAdvanceBookingDates(datesToCheck);
    if (!advanceCheck.valid) {
      toast.error(advanceCheck.error);
      return;
    }

    submitLockRef.current = true;
    setSubmitting(true);
    try {
      let actualClientId;
      let notesStr;

      if (isExistingUser && selectedClient) {
        // Use the existing user's client ID
        actualClientId = selectedClient.clientId;
        notesStr = `Walk-in client: ${selectedClient.fullName} | Contact: ${selectedClient.contact || "N/A"} | Email: ${selectedClient.email}${notes ? ` | Notes: ${notes}` : ''}`;
      } else {
        // For non-existing users, use a default walk-in client
        let walkInClient = null;

        try {
          const checkRes = await fetch(`/api/clients/search?q=walkin`);
          const checkData = await checkRes.json();
          if (Array.isArray(checkData) && checkData.length > 0) {
            walkInClient = checkData.find(c => c.email === "walkin@ccasc.gov");
          }
        } catch (e) {
          console.error("Failed to check for walk-in client:", e);
        }

        if (!walkInClient) {
          actualClientId = 1; // Default walk-in client ID
        } else {
          actualClientId = walkInClient.clientId;
        }

        notesStr = `Walk-in client: ${clientName} | Contact: ${clientContact || "N/A"} | Email: ${clientEmail || "N/A"}${notes ? ` | Notes: ${notes}` : ''}`;
      }

      // Build particulars and package for submit
      const hasPerDateSettings = customizePerDate && Object.keys(dateCustomizations).length > 0;
      // While per-date settings lock the time slot/package selects, the time slot
      // lives on each date's customization instead of the global form value.
      let payloadTimeSlotId = timeSlotId;
      if (hasPerDateSettings) {
        const primaryCust = dateCustomizations[primaryDate];
        payloadTimeSlotId =
          primaryCust?.timeSlotId ||
          Object.values(dateCustomizations).find((c) => c && c.timeSlotId)?.timeSlotId ||
          timeSlotId ||
          TIME_SLOT.DAY;
      }

      let selectedParticulars = [];
      let selectedPackageId = parseReservationPackageId(packageId);

      // For Sports Complex, override with facility IDs and no packages/particulars
      if (isSportsComplex) {
        selectedPackageId = null;
        selectedParticulars = [];
      } else if (customizePerDate && Object.keys(dateCustomizations).length > 0) {
        const aggregatedParticulars = {};
        const basketballDayCounts = {};
        const collectSession = (session) => {
          if (!session || !session.enabled) return;
          if (isVirtualPackageId(session.packageId)) {
            const entries = getVirtualPackageParticulars(
              session.packageId,
              particulars,
              session.particularQuantities,
              session.timeSlotId || timeSlotId,
              session.venueRentalSlot
            );
            for (const entry of entries) {
              if (isConsolidatedBasketballEntry(particulars, entry)) {
                basketballDayCounts[entry.particularId] =
                  (basketballDayCounts[entry.particularId] || 0) + 1;
                aggregatedParticulars[entry.particularId] = entry.quantity;
              } else {
                aggregatedParticulars[entry.particularId] =
                  (aggregatedParticulars[entry.particularId] || 0) + entry.quantity;
              }
            }
          } else if (
            session.packageId === "0" ||
            session.packageId === "custom" ||
            !session.packageId
          ) {
            for (const [partId, qty] of Object.entries(session.particularQuantities || {})) {
              if (qty > 0) {
                aggregatedParticulars[partId] = (aggregatedParticulars[partId] || 0) + qty;
              }
            }
          }
        };
        for (const [, cust] of Object.entries(dateCustomizations)) {
          // Support both old flat model and new morning/night model
          if (cust.morning || cust.night) {
            collectSession(cust.morning);
            collectSession(cust.night);
          } else {
            // Legacy flat model
            collectSession(cust);
          }
        }
        selectedParticulars = Object.entries(aggregatedParticulars)
          .filter(([, qty]) => qty > 0)
          .map(([id, qty]) => ({
            particularId: parseInt(id, 10),
            quantity: qty,
            ...(basketballDayCounts[id] ? { days: basketballDayCounts[id] } : {}),
          }));
        const firstCust = dateCustomizations[sortedDates[0]];
        const firstMorningPkg = firstCust?.morning?.packageId;
        const firstNightPkg = firstCust?.night?.packageId;
        if (firstMorningPkg && isRegularPackageId(firstMorningPkg)) {
          selectedPackageId = parseReservationPackageId(firstMorningPkg);
        } else if (firstNightPkg && isRegularPackageId(firstNightPkg)) {
          selectedPackageId = parseReservationPackageId(firstNightPkg);
        } else if (firstCust && isRegularPackageId(firstCust.packageId)) {
          selectedPackageId = parseReservationPackageId(firstCust.packageId);
        } else {
          selectedPackageId = null;
        }
      } else if (isVirtualPackageId(packageId)) {
        const numDays = sortedDates.length > 0 ? sortedDates.length : 1;
        selectedParticulars = getVirtualPackageParticulars(
          packageId,
          particulars,
          particularQuantities,
          timeSlotId,
          venueRentalSlot
        ).map((p) => {
          if (packageId === VIRTUAL_PACKAGE_IDS.VENUE_RENTAL) {
            return { ...p, quantity: p.quantity * numDays };
          }
          if (isConsolidatedBasketballEntry(particulars, p)) {
            return { ...p, days: numDays };
          }
          if (packageId === VIRTUAL_PACKAGE_IDS.BASKETBALL) {
            return { ...p, quantity: p.quantity * numDays };
          }
          return p;
        });
        selectedPackageId = null;
      } else {
        // Only include particulars if custom or no package
        if (packageId === "custom" || packageId === "0" || !packageId) {
          selectedParticulars = Object.entries(particularQuantities)
            .filter(([, qty]) => qty > 0)
            .map(([id, qty]) => ({ particularId: parseInt(id, 10), quantity: qty }));
        } else {
          selectedPackageId = parseReservationPackageId(packageId);
          selectedParticulars = []; // Inclusions are free, don't send as paid particulars
        }
      }

      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venueId: parseInt(venueId, 10),
          eventType,
          eventDate: primaryDate,
          eventDates: [...new Set([primaryDate, ...sortedDates].filter(Boolean))].sort(),
          timeSlotId: parseInt(payloadTimeSlotId, 10),
          packageId: selectedPackageId,
          clientId: actualClientId,
          notes: notesStr,
          clientName: isExistingUser && selectedClient ? selectedClient.fullName : clientName,
          clientContact: isExistingUser && selectedClient ? selectedClient.contact : clientContact,
          clientEmail: isExistingUser && selectedClient ? selectedClient.email : clientEmail,
          particulars: selectedParticulars.length > 0 ? selectedParticulars : undefined,
          chargeLines: summaryLines,
          ...(isSportsComplex
            ? customizePerDate
              ? {
                  facilityAssignments: Object.fromEntries(
                    [...new Set([primaryDate, ...sortedDates].filter(Boolean))].sort().map((date) => [
                      date,
                      (dateCustomizations[date]?.facilityIds || []).map(String),
                    ])
                  ),
                  facilityQuantities,
                }
              : { facilityIds: selectedFacilityIds, facilityQuantities }
            : {}),
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to create reservation");
      }

      const data = await res.json();
      toast.success(`Reservation ${data.id} created successfully!${isExistingUser && selectedClient ? ` Linked to ${selectedClient.fullName}.` : ''}`);

      // Build the Order of Payment for the walk-in client before the form
      // resets — this is what gets printed and handed to them.
      setSavedOrder({
        controlNumber: data.id,
        date: new Date().toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        }),
        clientName:
          isExistingUser && selectedClient
            ? selectedClient.fullName
            : clientName || "Walk-in Client",
        contactNumber:
          isExistingUser && selectedClient
            ? selectedClient.contact || ""
            : clientContact || "",
        activityName: eventType,
        activityDate: sortedDates
          .map((d) =>
            new Date(`${d}T00:00:00`).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })
          )
          .join(", "),
        chargeLines: summaryLines,
        totalAmount: total,
        eventDates: sortedDates,
      });

      // Reset form
      setShowOrder(false);
      setVenueId("");
      setEventType("");
      setEventDate("");
      setTimeSlotId("");
      setPackageId("");
      setVenueRentalSlot("");
      setNotes("");
      setClientName("");
      setClientContact("");
      setClientEmail("");
      setSelectedClient(null);
      setSearchQuery("");
      setSearchResults([]);
      setSelectedDates(new Set());
      setParticularQuantities({});
      setCustomizePerDate(false);
      setDateCustomizations({});
      setEventDates([]);
      setSelectedFacilityIds([]);
      setReservedByDate({});
      setFacilityQuantities({});
    } catch (err) {
      toast.error(err.message);
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
    }
  };

  // Get display info for the confirmation dialog
  const getDisplayClientInfo = () => {
    if (isExistingUser && selectedClient) {
      return {
        name: selectedClient.fullName,
        contact: selectedClient.contact || "N/A",
        email: selectedClient.email,
      };
    }
    return {
      name: clientName || "Walk-in Client",
      contact: clientContact || "No contact",
      email: clientEmail || "No email",
    };
  };

  const displayClient = getDisplayClientInfo();

  const getPackageDisplayLabel = () => {
    if (isVirtualPackageId(packageId)) {
      const info = getVirtualPackageDisplayInfo(
        packageId,
        particulars,
        particularQuantities,
        timeSlotId,
        venueRentalSlot
      );
      return info?.label || (packageId === VIRTUAL_PACKAGE_IDS.BASKETBALL ? "Basketball Game" : "Venue Rental");
    }
    if (isRegularPackageId(packageId)) {
      return packages.find((p) => String(p.packageId) === packageId)?.packageName || "—";
    }
    if (isFacilityPackageId(packageId)) {
      const facilityId = parseFacilityId(packageId);
      const facility = facilities.find((f) => f.facilityId === facilityId);
      return facility?.name || "Facility";
    }
    return "—";
  };

  const summaryLines = isSportsComplex
    ? buildFacilitySummaryLines({
        facilities,
        facilityQuantities,
        selectedDatesCount: selectedDates.size,
        timeSlotId,
      })
    : buildReservationSummaryLines({
        particulars,
        packages,
        packageId,
        particularQuantities,
        timeSlotId,
        venueRentalSlot,
        selectedDatesCount: selectedDates.size,
        customizePerDate,
        dateCustomizations,
        facilities,
      });
  const total = sumReservationSummaryLines(summaryLines);

// Render calendar grid for multi-date selection
  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const minEventDate = getMinEventDate();

    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(year, month, d);
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ date: d, key, dt });
    }

    const monthLabel = `${MONTHS[month]} ${year}`;
    const selectedArr = [...selectedDates].sort();

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Button type="button" variant="ghost" size="sm" onClick={prevMonth}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="font-medium text-sm">{monthLabel}</span>
          <Button type="button" variant="ghost" size="sm" onClick={nextMonth}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="text-muted-foreground py-1">{d}</div>
          ))}
          {days.map((day, i) => {
            if (!day) return <div key={`e${i}`} />;
            const isSelected = selectedDates.has(day.key);
            const avail = availability[day.key];
            const isTooSoon = day.dt < minEventDate || avail?.isTooSoon;
            const isPast = avail?.isPast || day.dt < today;
            const isAvailable = avail?.available && !isPast && !isTooSoon;
            const isBlocked = avail?.blocked || isPast || isTooSoon;

            return (
              <button
                key={day.key}
                type="button"
                disabled={!isAvailable}
                onClick={() => toggleDate(day.key)}
                className={`
                  py-2 rounded-md text-sm transition-colors
                  ${isSelected ? "bg-primary text-white font-semibold" : ""}
                  ${isAvailable && !isSelected ? "hover:bg-primary/10 cursor-pointer" : ""}
                  ${isBlocked ? "text-muted-foreground/30 line-through cursor-not-allowed" : ""}
                  ${!isBlocked && !isSelected ? "text-foreground" : ""}
                `}
                title={
                  isTooSoon
                    ? `Must be at least ${MIN_ADVANCE_BOOKING_DAYS} days in advance`
                    : isBlocked
                      ? avail?.reason || "Unavailable"
                      : day.key
                }
              >
                {day.date}
              </button>
            );
          })}
        </div>
        {selectedArr.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {selectedArr.map((d) => (
              <Badge key={d} variant="secondary" className="text-xs">
                {d} <button onClick={() => toggleDate(d)} className="ml-1 hover:text-red-500">×</button>
              </Badge>
            ))}
          </div>
        )}
        {availLoading && <p className="text-xs text-muted-foreground text-center">Loading availability...</p>}
      </div>
    );
  };
const renderPerDateFacilities = (date, cust) => {
    const dateReservedIds = new Set((reservedByDate[date] || []).map(String));
    const availableFacilities = facilities.filter((f) => !dateReservedIds.has(String(f.facilityId)));
    const availableIds = availableFacilities.map((f) => String(f.facilityId));
    const dateFacilityIds = cust.facilityIds || [];
    const selectedAvailable = availableIds.filter((id) => dateFacilityIds.includes(id));
    const allSelected = availableIds.length > 0 && selectedAvailable.length === availableIds.length;
    const someSelected = selectedAvailable.length > 0 && selectedAvailable.length < availableIds.length;

    return (
      <div className="space-y-2 mb-4">
        <Label className="text-xs">Facilities for {date}</Label>
        {facilities.length === 0 ? (
          <p className="text-xs text-muted-foreground py-1">No facilities available.</p>
        ) : (
          <div className="rounded-md border divide-y max-h-48 overflow-y-auto">
            {/* Select All */}
            <label
              className="flex items-center gap-3 px-3 py-2 text-sm border-b cursor-pointer hover:bg-muted/40"
              onClick={() => {
                if (allSelected) {
                  setDateCustomizations((prev) => ({
                    ...prev,
                    [date]: {
                      ...prev[date],
                      facilityIds: (prev[date]?.facilityIds || []).filter(
                        (id) => !availableIds.includes(String(id))
                      ),
                    },
                  }));
                } else {
                  setDateCustomizations((prev) => {
                    const existing = new Set((prev[date]?.facilityIds || []).map(String));
                    availableIds.forEach((id) => existing.add(id));
                    return {
                      ...prev,
                      [date]: { ...prev[date], facilityIds: [...existing] },
                    };
                  });
                }
              }}
            >
              <Checkbox
                checked={someSelected ? "indeterminate" : allSelected}
              />
              <span className="flex-1 min-w-0 font-medium truncate text-muted-foreground text-xs">
                Select All
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {selectedAvailable.length}/{availableIds.length} available
              </span>
            </label>
            {facilities.map((f) => {
              const id = String(f.facilityId);
              const dateReserved = dateReservedIds.has(id);
              const checked = dateFacilityIds.includes(id);
              const rate = getFacilityRateBySlot(f, cust.morning?.timeSlotId || timeSlotId);
              return (
                <label
                  key={id}
                  className={`flex items-center gap-3 px-3 py-2 text-sm ${
                    dateReserved
                      ? "cursor-not-allowed opacity-60"
                      : "cursor-pointer hover:bg-muted/40"
                  }`}
                  onClick={() => {
                    if (dateReserved) return;
                    setDateCustomizations((prev) => {
                      const existing = prev[date]?.facilityIds || [];
                      const next = existing.includes(id)
                        ? existing.filter((x) => x !== id)
                        : [...existing, id];
                      return { ...prev, [date]: { ...prev[date], facilityIds: next } };
                    });
                  }}
                >
                  <Checkbox checked={checked} disabled={dateReserved} />
                  <span className="flex-1 min-w-0 font-medium truncate">{f.name}</span>
                  {dateReserved ? (
                    <span className="shrink-0 text-xs text-destructive">Reserved</span>
                  ) : (
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      ₱{rate.toLocaleString()}/day
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        )}
      </div>
    );
  };
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Walk-In Reservation
        </h2>
        <p className="text-muted-foreground text-sm">
          Create reservations on behalf of walk-in clients. Toggle to search for existing users or enter new client details manually.
        </p>
      </div>

      {/* Order of Payment — generated once the reservation is saved */}
      {savedOrder && (
        <div className="flex flex-col gap-4">
          <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 p-4">
            <div>
              <p className="font-medium">
                Order of Payment ready — {savedOrder.controlNumber}
              </p>
              <p className="text-muted-foreground text-sm">
                Print this and hand it to the client for payment at the
                Accounting Office.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSavedOrder(null)}>
                Close
              </Button>
              <Button onClick={() => window.print()}>
                <Printer className="mr-2 size-4" />
                Print Order of Payment
              </Button>
            </div>
          </div>

          <OrderOfPaymentDocument
            controlNumber={savedOrder.controlNumber}
            date={savedOrder.date}
            clientName={savedOrder.clientName}
            address=""
            contactNumber={savedOrder.contactNumber}
            activityName={savedOrder.activityName}
            activityDate={savedOrder.activityDate}
            participants=""
            chargeLines={savedOrder.chargeLines}
            totalAmount={savedOrder.totalAmount}
            eventDates={savedOrder.eventDates}
          />
        </div>
      )}

      {/* Toggle: Existing User or Walk-in */}
      <Card>
        <CardHeader>
          <CardTitle>Client Type</CardTitle>
          <CardDescription>
            Choose whether the client is an existing user or a new walk-in client.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button
              variant={!isExistingUser ? "default" : "outline"}
              onClick={() => {
                setIsExistingUser(false);
                setSelectedClient(null);
                setSearchQuery("");
                setSearchResults([]);
              }}
              className="flex items-center gap-2"
            >
              <UserPlus className="size-4" />
              New Walk-in Client
            </Button>
            <Button
              variant={isExistingUser ? "default" : "outline"}
              onClick={() => {
                setIsExistingUser(true);
                setClientName("");
                setClientContact("");
                setClientEmail("");
              }}
              className="flex items-center gap-2"
            >
              <UserCheck className="size-4" />
              Existing User
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Client Information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Client Information</CardTitle>
            <CardDescription>
              {isExistingUser
                ? "Search for an existing registered user."
                : "Enter the walk-in client's details."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isExistingUser ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Search Existing User *</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, email, or contact number..."
                      value={searchQuery}
                      onChange={handleSearchChange}
                      onFocus={() => {
                        if (searchResults.length > 0 && !selectedClient) {
                          setShowSearchResults(true);
                        }
                      }}
                      onBlur={() => {
                        // Delay hiding to allow click on result
                        setTimeout(() => setShowSearchResults(false), 200);
                      }}
                      className="pl-10"
                    />
                    {searching && (
                      <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                    )}
                  </div>

                  {/* Search Results Dropdown */}
                  {showSearchResults && searchResults.length > 0 && !selectedClient && (
                    <div className="border rounded-md shadow-lg bg-background max-h-60 overflow-y-auto z-50">
                      {searchResults.map((client) => (
                        <button
                          key={client.id}
                          type="button"
                          className="w-full text-left px-4 py-3 hover:bg-muted transition-colors border-b last:border-b-0"
                          onMouseDown={() => handleSelectClient(client)}
                        >
                          <div className="font-medium">{client.fullName}</div>
                          <div className="text-xs text-muted-foreground">
                            {client.email} | {client.contact || "No contact"}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {showSearchResults && searchResults.length === 0 && searchQuery.trim().length >= 2 && !searching && (
                    <div className="text-sm text-muted-foreground py-2">
                      No users found matching "{searchQuery}"
                    </div>
                  )}
                </div>

                {/* Selected Client Details */}
                {selectedClient && (
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <UserCheck className="size-4 text-primary" />
                      <span className="text-sm font-medium">Selected User</span>
                      <Badge variant="secondary" className="ml-auto">Linked Account</Badge>
                    </div>
                    <div className="grid gap-2 md:grid-cols-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Name:</span>
                        <span className="ml-1 font-medium">{selectedClient.fullName}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Email:</span>
                        <span className="ml-1">{selectedClient.email}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Contact:</span>
                        <span className="ml-1">{selectedClient.contact || "N/A"}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      This reservation will be linked to the user's account. They will receive notifications.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input
                    placeholder="Juan Dela Cruz"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contact Number</Label>
                  <Input
                    placeholder="+63 9XX XXX XXXX"
                    value={clientContact}
                    onChange={(e) => setClientContact(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="client@example.com"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                  />
                </div>
              </div>
            )}
            <Separator className="my-6" />
            {/* Reservation Details inside Client Info Card */}
            <div className="space-y-2">
              <Label>Venue *</Label>
              <Select value={venueId} onValueChange={setVenueId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select venue" />
                </SelectTrigger>
                <SelectContent>
                  {VENUES.map((v) => (
                    <SelectItem key={v.id} value={String(v.id)}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Event Type *</Label>
              <Input
                placeholder="e.g. Seminar, Conference"
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Select Dates <span className="text-red-500">*</span></Label>
              <p className="text-xs text-muted-foreground">
                Events must be at least {MIN_ADVANCE_BOOKING_DAYS} days from today. Earliest date:{" "}
                <span className="font-medium">{minEventDateKey}</span>. Blocked dates are unavailable.
              </p>
              {venueId ? renderCalendar() : (
                <p className="text-sm text-muted-foreground py-4">Please select a venue first to see available dates.</p>
              )}

              {/* Customize Per Date Button - only shown when multiple dates selected for Cultural Center */}
              {selectedDates.size > 1 && !isSportsComplex && (
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    type="button"
                    variant={customizePerDate ? "default" : "outline"}
                    size="sm"
                    onClick={toggleCustomizeMode}
                    className="flex items-center gap-2"
                  >
                    <Layers className="size-4" />
                    {customizePerDate ? "Using Per-Date Settings" : "Customize Per Date"}
                  </Button>
                  {customizePerDate && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCustomizeDialog(true)}
                    >
                      Edit Per-Date Details
                    </Button>
                  )}
                </div>
              )}
            </div>
            {isSportsComplex ? (
                <div className="space-y-2">
                  <Label>Time Slot</Label>
                  <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                    <Clock className="size-4 text-muted-foreground shrink-0" />
                    <span className="font-medium">
                      {TIME_SLOT_OPTIONS.find((s) => s.value === timeSlotId)?.label || "Day (8:00 AM – 5:00 PM)"}
                    </span>
                  </div>
                </div>
              ) : (
              <div className="space-y-2">
                <Label>Time Slot *</Label>
                <Select value={timeSlotId} onValueChange={handleTimeSlotChange} disabled={customizePerDate}>
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue placeholder="Select time slot" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {customizePerDate && (
                  <p className="text-xs text-muted-foreground">
                    Locked while using per-date settings. Press Using Per-Date Settings to unlock.
                  </p>
                )}
              </div>
              )}
            {!isSportsComplex && (
              <div className="space-y-2">
                <Label>Package</Label>
                <Select value={packageId} onValueChange={handlePackageSelect} disabled={customizePerDate}>
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue placeholder={packagesLoading ? "Loading packages..." : "Select package"} />
                  </SelectTrigger>
                  <SelectContent position="popper" className="w-(--radix-select-trigger-width)">
                    <SelectItem value="0">None</SelectItem>
                    <ReservationPackageSelectItems packages={packages} particulars={particulars} timeSlotId={timeSlotId} facilities={facilities} venueId={venueId} />
                  </SelectContent>
                </Select>
                {customizePerDate && (
                  <p className="text-xs text-muted-foreground">
                    Locked while using per-date settings. Edit each date in Per-Date Details.
                  </p>
                )}
              </div>
              )}
{/* Conditional: Package Inclusions, virtual packages, particulars, or Facilities */}
            {isSportsComplex ? (
              <div className="space-y-2">
                <Label>Facilities</Label>
                <p className="text-xs text-muted-foreground">
                  Select one or more facilities. Prices shown reflect the selected time slot.
                  {selectedDates.size > 0
                    ? " Facilities already reserved on a selected date cannot be chosen."
                    : " Select dates first to see which facilities are available."}
                </p>
                {facilitiesLoading || (selectedDates.size > 0 && facilityAvailLoading) ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="size-4 animate-spin" />
                    {facilitiesLoading ? "Loading facilities..." : "Checking reserved facilities..."}
                  </div>
                ) : facilities.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No Sports Complex facilities found.</p>
                ) : (
                  <div className="rounded-md border divide-y max-h-64 overflow-y-auto">
                    {/* Select All */}
                    {(() => {
                      const availableFacilities = facilities.filter(
                        (f) => !reservedFacilityIdsGlobal.has(String(f.facilityId))
                      );
                      const availableIds = availableFacilities.map((f) => String(f.facilityId));
                      const selectedAvailable = availableIds.filter((id) =>
                        selectedFacilityIds.includes(id)
                      );
                      const allSelected =
                        availableIds.length > 0 && selectedAvailable.length === availableIds.length;
                      const someSelected =
                        selectedAvailable.length > 0 && selectedAvailable.length < availableIds.length;
                      const selectAllDisabled = selectedDates.size === 0;
                      return (
                        <label
                          className={`flex items-center gap-3 px-3 py-2.5 text-sm border-b ${
                            selectAllDisabled
                              ? "cursor-not-allowed opacity-60"
                              : "cursor-pointer hover:bg-muted/40"
                          }`}
                        >
                          <Checkbox
                            checked={!selectAllDisabled && someSelected ? "indeterminate" : allSelected}
                            onCheckedChange={(checked) => {
                              if (selectAllDisabled) return;
                              if (checked) {
                                setSelectedFacilityIds((prev) => {
                                  const next = new Set(prev.map(String));
                                  availableIds.forEach((id) => next.add(id));
                                  return Array.from(next);
                                });
                              } else {
                                setSelectedFacilityIds((prev) =>
                                  prev.filter((id) => !availableIds.includes(String(id)))
                                );
                              }
                            }}
                            disabled={selectAllDisabled}
                          />
                          <span className="flex-1 min-w-0 font-medium truncate text-muted-foreground">
                            Select All
                          </span>
                          {availableIds.length > 0 && (
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {selectedAvailable.length}/{availableIds.length} available
                            </span>
                          )}
                        </label>
                      );
                    })()}
                    {facilities.map((f) => {
                      const id = String(f.facilityId);
                      const reserved = reservedFacilityIdsGlobal.has(id);
                      const checked = selectedFacilityIds.includes(id);
                      const rate = getFacilityRateBySlot(f, timeSlotId);
                      const disabled = reserved || selectedDates.size === 0;
                      const maxQty = f.capacity > 0 ? f.capacity : 99;
                      const currentQty = facilityQuantities[id] || 0;
                      return (
                        <label
                          key={id}
                          className={`flex items-center gap-3 px-3 py-2.5 text-sm ${
                            disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-muted/40"
                          }`}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleFacilitySelection(id)}
                            disabled={disabled}
                          />
                          <span className="flex-1 min-w-0 font-medium truncate">{f.name}</span>
                          {reserved ? (
                            <span className="shrink-0 text-xs text-destructive">Reserved</span>
                          ) : (
                            <span className="shrink-0 tabular-nums text-muted-foreground">
                              ₱{rate.toLocaleString()}/day
                            </span>
                          )}
                          {checked && (
                            <div className="shrink-0 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <span className="text-[10px] text-muted-foreground mr-1">Qty:</span>
                              <button
                                type="button"
                                className="size-6 rounded border border-input bg-background text-xs font-medium hover:bg-accent disabled:opacity-30"
                                disabled={currentQty <= 1}
                                onClick={() => {
                                  setFacilityQuantities((prev) => {
                                    const next = { ...prev };
                                    const newVal = Math.max(1, (next[id] || 1) - 1);
                                    if (newVal <= 0) delete next[id];
                                    else next[id] = newVal;
                                    return next;
                                  });
                                }}
                              >−</button>
                              <span className="tabular-nums text-xs font-medium w-6 text-center">{currentQty}</span>
                              <button
                                type="button"
                                className="size-6 rounded border border-input bg-background text-xs font-medium hover:bg-accent disabled:opacity-30"
                                disabled={currentQty >= maxQty}
                                onClick={() => {
                                  setFacilityQuantities((prev) => ({
                                    ...prev,
                                    [id]: Math.min(maxQty, (prev[id] || 1) + 1),
                                  }));
                                }}
                              >+</button>
                            </div>
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}
                {Object.keys(facilityQuantities).length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {Object.entries(facilityQuantities).reduce((sum, [, q]) => sum + (Number(q) || 0), 0)} unit(s) selected
                  </p>
                )}
              </div>
            ) : customizePerDate ? (
              <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
                <p>
                  Packages and additional services are configured per date. Use{" "}
                  <span className="font-medium text-foreground">Edit Per-Date Details</span> to
                  update each day, or press{" "}
                  <span className="font-medium text-foreground">Using Per-Date Settings</span> to
                  unlock the default time slot and package.
                </p>
              </div>
            ) : (
            <div className="space-y-2">
              {packageId === VIRTUAL_PACKAGE_IDS.VENUE_RENTAL ? (
                <>
                  <ReservationVirtualPackagePanel
                    packageId={packageId}
                    particulars={particulars}
                    particularQuantities={particularQuantities}
                    onParticularQuantitiesChange={handleVirtualParticularQuantitiesChange}
                    timeSlotId={timeSlotId}
                    venueRentalSlot={venueRentalSlot}
                    onVenueRentalSlotChange={handleVenueRentalSlotChange}
                  />
                  <Separator className="my-3" />
                  <div className="space-y-2">
                    <Label>Additional Services / Particulars</Label>
                    <div className="space-y-2 border rounded-lg p-4">
                      {particularsLoading ? (
                        <p className="text-sm text-muted-foreground">Loading particulars...</p>
                      ) : filterCustomParticulars(particulars).length === 0 ? (
                        <p className="text-sm text-muted-foreground">No particulars available.</p>
                      ) : (
                        <div className="grid gap-3 md:grid-cols-2">
                          {filterCustomParticulars(particulars).map((p) => {
                            const qty = readParticularQuantity(
                              particularQuantities,
                              p.particularId
                            );
                            const cost = p.unitCost ? Number(p.unitCost) : 0;
                            const maxQty = p.totalQuantity >= 0 ? p.totalQuantity : 999;
                            const hasInventory = p.itemId !== null && p.itemId !== undefined;
                            const isAircon = p.particularName === "Aircon Compressor";
                            const airconTiers = [
                              { qty: 4, label: "100-1K pax", price: 3200 },
                              { qty: 6, label: "1K-3K pax", price: 4800 },
                              { qty: 8, label: "4K-6K pax", price: 6400 },
                              { qty: 10, label: "7K-10K pax", price: 8000 },
                            ];
                            return (
                              <div key={p.particularId} className="flex items-center justify-between rounded-md border p-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium truncate">{p.particularName}</p>
                                  {cost > 0 && !isAircon && (
                                    <p className="text-xs text-muted-foreground">P{cost.toLocaleString()} / unit</p>
                                  )}
                                  {isAircon && (
                                    <div className="text-[10px] text-muted-foreground mt-1 space-y-0.5">
                                      {airconTiers.map((t) => (
                                        <div key={t.qty}>{t.qty} units = P{t.price.toLocaleString()} ({t.label})</div>
                                      ))}
                                    </div>
                                  )}
                                  {!isAircon && (
                                    <p className="text-xs text-muted-foreground">
                                      {hasInventory ? `Available: ${maxQty}` : "No inventory record — contact admin"}
                                    </p>
                                  )}
                                </div>
                                <ParticularQuantityStepper
                                  value={qty}
                                  max={maxQty}
                                  buttonClassName="size-7"
                                  onChange={(val) =>
                                    setParticularQuantities((prev) => ({
                                      ...prev,
                                      [String(p.particularId)]: val,
                                    }))
                                  }
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : isVirtualPackageId(packageId) ? (
                <ReservationVirtualPackagePanel
                  packageId={packageId}
                  particulars={particulars}
                  particularQuantities={particularQuantities}
                  onParticularQuantitiesChange={handleVirtualParticularQuantitiesChange}
                  timeSlotId={timeSlotId}
                  venueRentalSlot={venueRentalSlot}
                  onVenueRentalSlotChange={handleVenueRentalSlotChange}
                />
              ) : isRegularPackageId(packageId) ? (
                <>
                  <Label>Package Inclusions</Label>
                  <p className="text-xs text-muted-foreground">This package includes the following items at no additional cost.</p>
                  <div className="border rounded-lg p-4">
                    {(() => {
                      const pkg = packages.find(p => String(p.packageId) === packageId);
                      if (!pkg || !pkg.inclusions || pkg.inclusions.length === 0) {
                        return <p className="text-sm text-muted-foreground">No inclusions for this package.</p>;
                      }
                      return (
                        <div className="grid gap-2 md:grid-cols-2">
                          {pkg.inclusions.map((inc, idx) => (
                            <div key={idx} className="flex items-center justify-between rounded-md border p-2 bg-muted/30">
                              <p className="text-xs font-medium truncate">{inc.itemName}</p>
                              <span className="text-xs text-muted-foreground shrink-0 ml-2">× {inc.quantityAvailable}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </>
              ) : (packageId === "custom" || packageId === "0" || !packageId) ? null : null}
            </div>
            )}
            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <Input
                placeholder="Any special requests..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary & Generate */}
      <Card>
        <CardHeader>
          <CardTitle>Reservation Summary</CardTitle>
          <CardDescription>
            Review the reservation details before submitting.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>Client Type</span>
              <Badge variant={isExistingUser ? "default" : "secondary"}>
                {isExistingUser ? "Existing User" : "Walk-in Client"}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Client</span>
              <span className="font-medium">
                {isExistingUser && selectedClient
                  ? selectedClient.fullName
                  : clientName || "&mdash;"}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Venue</span>
              <span className="font-medium">
                {venueId ? VENUES.find(v => String(v.id) === venueId)?.name : "&mdash;"}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Event Type</span>
              <span className="font-medium">{eventType || "&mdash;"}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Date(s)</span>
              <span className="font-medium text-right">
                {selectedDates.size > 0
                  ? `${[...selectedDates].sort().join(", ")}`
                  : "&mdash;"}
                {selectedDates.size > 1 && (
                  <span className="text-xs text-muted-foreground ml-1">({selectedDates.size} days)</span>
                )}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Time Slot</span>
              <span className="font-medium">
                {timeSlotId ? TIME_SLOTS.find(t => String(t.id) === timeSlotId)?.name : "&mdash;"}
              </span>
            </div>
            {packageId && packageId !== "0" && packageId !== "custom" && (
              <div className="flex items-center justify-between text-sm">
                <span>{isVirtualPackageId(packageId) ? "Selection" : "Package"}</span>
                <span className="font-medium">{getPackageDisplayLabel()}</span>
              </div>
            )}
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Selected Dates</span>
                <span className="font-medium">{selectedDates.size > 0 ? selectedDates.size : 1} day(s)</span>
              </div>
              {summaryLines.length > 0 ? (
                summaryLines.map((line, i) => (
                  <div
                    key={`${line.date || "line"}-${i}`}
                    className={line.date ? "border-t pt-1 mt-1" : undefined}
                  >
                    {line.date && (
                      <p className="text-xs font-medium text-muted-foreground">{line.date}</p>
                    )}
                    <div className="flex items-start justify-between gap-3 pl-2">
                      <span className="min-w-0 wrap-break-word">{line.label}</span>
                      <span className="shrink-0 tabular-nums font-medium">
                        ₱{line.amount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">No charges selected yet.</p>
              )}
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span className="tabular-nums">₱{total.toLocaleString()}</span>
              </div>
            </div>
            {isExistingUser && selectedClient && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-primary">Account Linked</span>
                <span className="font-medium text-primary">Yes</span>
              </div>
            )}
            <Separator />
            <p className="text-muted-foreground text-xs">
              This reservation will be saved to the database with status "Pending" and will appear in the facility calendar.
              {isExistingUser && selectedClient && " The client will receive a notification about this reservation."}
            </p>
          </div>

          <Button
            className="mt-6 w-full"
            size="lg"
            onClick={handleGenerateOrder}
          >
            Review & Submit Reservation
          </Button>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showOrder} onOpenChange={setShowOrder}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirm Reservation</DialogTitle>
            <DialogDescription>
              Provincial Government of South Cotabato &mdash; Cultural Center & Sports Complex
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant={isExistingUser ? "default" : "secondary"}>
                  {isExistingUser ? "Existing User" : "Walk-in Client"}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">CLIENT</p>
                  <p className="font-medium">{displayClient.name}</p>
                  <p className="text-muted-foreground">
                    {displayClient.contact}
                  </p>
                  <p className="text-muted-foreground">
                    {displayClient.email}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground text-xs">DATE</p>
                  <p className="font-medium">{eventDate || "TBD"}</p>
                  <p className="text-muted-foreground text-xs">VENUE</p>
                  <p className="font-medium">
                    {venueId ? VENUES.find(v => String(v.id) === venueId)?.name : "TBD"}
                  </p>
                  <p className="text-muted-foreground text-xs">EVENT</p>
                  <p className="font-medium">{eventType || "TBD"}</p>
                </div>
              </div>
              {packageId && packageId !== "0" && packageId !== "custom" && (
                <div className="mt-2 text-xs text-muted-foreground">
                  {isVirtualPackageId(packageId) ? "Selection" : "Package"}: {getPackageDisplayLabel()}
                </div>
              )}
            </div>

            <div className="text-muted-foreground text-xs">
              {isExistingUser && selectedClient ? (
                <p>
                  This reservation will be linked to <strong>{selectedClient.fullName}</strong>'s account.
                  They will receive a notification. The program coordinator will also be notified.
                </p>
              ) : (
                <p>
                  This reservation will be saved with status "Pending" and will be visible in the facility calendar. The accounting clerk can process payments after submission.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOrder(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitReservation} disabled={submitting}>
              {submitting ? "Saving..." : "Confirm & Save Reservation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Per-Date Customization Dialog */}
      <Dialog open={showCustomizeDialog} onOpenChange={setShowCustomizeDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="size-5" />
              Customize Per Date
            </DialogTitle>
            <DialogDescription>
              Set different packages and particulars for each selected date. Each date can have a Morning and Night session.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {[...selectedDates].sort().map((date) => {
              const cust = dateCustomizations[date] || { morning: { enabled: true, packageId: "0", particularQuantities: {} }, night: { enabled: false, packageId: "0", particularQuantities: {} } };
              const renderSessionControls = (session, sessionKey, sessionLabel, timeSlotForSession) => {
                const s = cust[sessionKey] || { enabled: false, packageId: "0", particularQuantities: {} };
                const sessionTimeLabel = sessionKey === "morning" ? "8:00 AM - 5:00 PM" : "5:00 PM - 10:00 PM";
                return (
                  <div className="border-t pt-3 mt-3 first:border-t-0 first:pt-0 first:mt-0">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-sm font-medium flex items-center gap-2">
                        {sessionKey === "morning" ? <span>&#9728;&#65039;</span> : <span>&#127769;&#65039;</span>}
                        {sessionLabel} <span className="text-xs text-muted-foreground font-normal">({sessionTimeLabel})</span>
                      </h5>
                      <label className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1">
                        <input type="checkbox" checked={s.enabled}
                          onChange={(e) => setDateCustomizations((prev) => ({ ...prev, [date]: { ...prev[date], [sessionKey]: { ...(prev[date]?.[sessionKey] || {}), enabled: e.target.checked } } }))}
                          className="size-3.5" /> Enable
                      </label>
                    </div>
                    {s.enabled && (
                      <div className="space-y-3 pl-2">
                        <div className="space-y-2">
                          <Label className="text-xs">{sessionLabel} Package</Label>
                          <Select value={s.packageId} onValueChange={(v) => handleDateSessionPackageSelect(date, sessionKey, v)}>
                            <SelectTrigger className="w-full min-w-0">
                              <SelectValue placeholder="Select package" />
                            </SelectTrigger>
                            <SelectContent position="popper" className="w-(--radix-select-trigger-width)">
                              <SelectItem value="0">None</SelectItem>
                              <ReservationPackageSelectItems packages={packages} particulars={particulars} timeSlotId={timeSlotForSession} sessionType={sessionKey} facilities={facilities} venueId={venueId} />
                            </SelectContent>
                          </Select>
                        </div>
                        {s.packageId === VIRTUAL_PACKAGE_IDS.VENUE_RENTAL && (
                          <>
                            <ReservationVirtualPackagePanel
                              packageId={s.packageId}
                              particulars={particulars}
                              particularQuantities={s.particularQuantities || {}}
                              onParticularQuantitiesChange={(pq) => handleDateSessionVirtualParticularQuantitiesChange(date, sessionKey, pq)}
                              timeSlotId={timeSlotForSession}
                              venueRentalSlot={s.venueRentalSlot || ""}
                              onVenueRentalSlotChange={(val) => handleDateSessionVenueRentalSlotChange(date, sessionKey, val)}
                            />
                            <Separator className="my-2" />
                            <div className="space-y-2">
                              <Label className="text-xs">Additional Services / Particulars</Label>
                              <div className="space-y-2 border rounded-lg p-3">
                                {particularsLoading ? (
                                  <p className="text-xs text-muted-foreground">Loading particulars...</p>
                                ) : filterCustomParticulars(particulars).length === 0 ? (
                                  <p className="text-xs text-muted-foreground">No particulars available.</p>
                                ) : (
                                  <div className="grid gap-2 md:grid-cols-2">
                                    {filterCustomParticulars(particulars).map((p) => {
                                      const qty = readParticularQuantity(s.particularQuantities || {}, p.particularId);
                                      const cost = p.unitCost ? Number(p.unitCost) : 0;
                                      const maxQty = p.totalQuantity >= 0 ? p.totalQuantity : 999;
                                      const hasInventory = p.itemId !== null && p.itemId !== undefined;
                                      const isAircon = p.particularName === "Aircon Compressor";
                                      return (
                                        <div key={p.particularId} className="flex items-center justify-between rounded-md border p-2">
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium truncate">{p.particularName}</p>
                                            {cost > 0 && !isAircon && (
                                              <p className="text-xs text-muted-foreground">₱{cost.toLocaleString()} / unit</p>
                                            )}
                                            {!isAircon && (
                                              <p className="text-[10px] text-muted-foreground">
                                                {hasInventory ? `Available: ${maxQty}` : "No inventory record"}
                                              </p>
                                            )}
                                          </div>
                                          <ParticularQuantityStepper
                                            value={qty}
                                            max={maxQty}
                                            buttonClassName="size-7"
                                            onChange={(val) => {
                                              const newPq = { ...(s.particularQuantities || {}), [p.particularId]: val };
                                              handleDateSessionVirtualParticularQuantitiesChange(date, sessionKey, newPq);
                                            }}
                                          />
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              };
              return (
                <div key={date} className="rounded-lg border p-4">
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Calendar className="size-4 text-muted-foreground" />
                    {date}
                  </h4>
                  {isSportsComplex && renderPerDateFacilities(date, cust)}
                  {dateCustomizations[date]?.morning || dateCustomizations[date]?.night ? (
                    <>
                      {renderSessionControls(cust, "morning", "Morning Session", TIME_SLOT.DAY)}
                      {renderSessionControls(cust, "night", "Night Session", TIME_SLOT.NIGHT)}
                    </>
                  ) : (
                    /* Legacy single-package view - render original controls */
                    <div className="space-y-2 mb-3">
                      <Label className="text-xs">Package for {date}</Label>
                      <Select value={cust.packageId} onValueChange={(v) => handleDatePackageSelect(date, v)}>
                        <SelectTrigger className="w-full min-w-0">
                          <SelectValue placeholder="Select package" />
                        </SelectTrigger>
                        <SelectContent position="popper" className="w-(--radix-select-trigger-width)">
                          <SelectItem value="0">None</SelectItem>
                          <ReservationPackageSelectItems packages={packages} particulars={particulars} timeSlotId={cust.timeSlotId || timeSlotId} facilities={facilities} venueId={venueId} />
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomizeDialog(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

                  
                        
                    
                    
