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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Search, UserCheck, UserPlus, Loader2, Info, Layers, Calendar, Plus, RotateCcw, ChevronLeft, ChevronRight, Building2, Clock } from "lucide-react";
import {
  isVirtualPackageId,
  isRegularPackageId,
  VIRTUAL_PACKAGE_IDS,
  getVirtualPackageParticulars,
  getVirtualPackageDisplayInfo,
  syncVirtualPackageStateForTimeSlot,
  deriveTimeSlotFromVirtualPackage,
  parseReservationPackageId,
  isConsolidatedBasketballEntry,
  sumReservationSummaryLines,
  resolveVenueRentalSlot,
} from "@/lib/reservation-package-select";
import { TIME_SLOT, TIME_SLOT_OPTIONS, timeSlotAfterPackageChange, isWholeDaySlot } from "@/lib/time-slots";
import {
  ReservationVirtualPackagePanel,
  ReservationPackageSelectItems,
} from "@/components/reservation-virtual-package-panel";
import {
  getMinEventDate,
  getMinEventDateKey,
  isEventDateTooSoon,
  validateAdvanceBookingDates,
  MIN_ADVANCE_BOOKING_DAYS,
} from "@/lib/reservation-advance-booking";

const VENUES = [
  { id: 2, name: "Sports Complex" },
];

const TIME_SLOTS = TIME_SLOT_OPTIONS.map((slot) => ({
  id: slot.id,
  name: slot.label,
}));

const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

/** Prefer admin "Rate / day" (`rateDaily`); fall back to hourly if day rate is unset. */
function getFacilityDayRate(facility) {
  const dayRate = Number(facility?.rateDaily ?? 0);
  if (dayRate > 0) return dayRate;
  return Number(facility?.rateHourly ?? 0);
}

function normalizeFacilityIds(value) {
  if (Array.isArray(value)) {
    return value.map(String).filter((id) => id && id !== "0");
  }
  if (value && value !== "0") return [String(value)];
  return [];
}

function buildFacilitySummaryLines({
  facilities,
  selectedFacilityIds,
  selectedDatesCount,
  customizePerDate,
  dateCustomizations,
}) {
  const lines = [];
  const numDays = Math.max(1, selectedDatesCount || 1);

  if (customizePerDate && Object.keys(dateCustomizations).length > 0) {
    for (const [date, cust] of Object.entries(dateCustomizations)) {
      const ids = normalizeFacilityIds(cust.facilityIds ?? cust.facilityId);
      for (const id of ids) {
        const facility = facilities.find((f) => String(f.facilityId) === String(id));
        if (!facility) continue;
        lines.push({
          date,
          label: facility.name,
          amount: getFacilityDayRate(facility),
          facilityId: String(facility.facilityId),
        });
      }
    }
    return lines;
  }

  for (const id of selectedFacilityIds) {
    const facility = facilities.find((f) => String(f.facilityId) === String(id));
    if (!facility) continue;
    const rate = getFacilityDayRate(facility);
    lines.push({
      label: numDays > 1 ? `${facility.name} × ${numDays} day(s)` : facility.name,
      amount: rate * numDays,
      facilityId: String(facility.facilityId),
    });
  }
  return lines;
}

export default function CoordinatorReservationsPage() {
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
  const [venueId, setVenueId] = React.useState("2"); // Sports Complex only
  const [eventType, setEventType] = React.useState("");
  const [eventDate, setEventDate] = React.useState("");
  const [timeSlotId, setTimeSlotId] = React.useState("1"); // Day (8AM-5PM)
  const [packageId, setPackageId] = React.useState(VIRTUAL_PACKAGE_IDS.VENUE_RENTAL);
  const [venueRentalSlot, setVenueRentalSlot] = React.useState(TIME_SLOT.DAY);
  const [notes, setNotes] = React.useState("");

  // Packages
  const [packages, setPackages] = React.useState([]);
  const [packagesLoading, setPackagesLoading] = React.useState(true);

  // Facilities (Sports Complex venueId=2) — multi-select by day rate
  const [facilities, setFacilities] = React.useState([]);
  const [selectedFacilityIds, setSelectedFacilityIds] = React.useState([]);
  const [facilitiesLoading, setFacilitiesLoading] = React.useState(true);
  /** dateKey → facilityId[] already reserved by other reservations */
  const [reservedByDate, setReservedByDate] = React.useState({});
  const [facilityAvailLoading, setFacilityAvailLoading] = React.useState(false);

  // Particulars
  const [particulars, setParticulars] = React.useState([]);
  const [particularQuantities, setParticularQuantities] = React.useState({});
  const [particularsLoading, setParticularsLoading] = React.useState(true);

  // Per-date customization for multi-day
  const [customizePerDate, setCustomizePerDate] = React.useState(false);
  const [dateCustomizations, setDateCustomizations] = React.useState({});
  const [showCustomizeDialog, setShowCustomizeDialog] = React.useState(false);

  // Dialog and submission
  const [showOrder, setShowOrder] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [eventDates, setEventDates] = React.useState([]);
  const [selectedDates, setSelectedDates] = React.useState(new Set());
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const [availability, setAvailability] = React.useState({});
  const [availLoading, setAvailLoading] = React.useState(false);

  // Search debounce ref
  const searchTimeoutRef = React.useRef(null);
  const submitLockRef = React.useRef(false);

  // Load facilities on mount
  React.useEffect(() => {
    async function loadData() {
      try {
        // First try the facilities API
        const facRes = await fetch("/api/facilities");
        const facData = await facRes.json();
        
        if (Array.isArray(facData)) {
          // Get all Sports Complex facilities (venueId=2)
          const sportsComplexFacilities = facData.filter(
            (item) => item.venueId === 2
          );
          console.log("Facilities API returned", sportsComplexFacilities.length, "Sports Complex facilities out of", facData.length, "total");
          
          if (sportsComplexFacilities.length > 0) {
            setFacilities(sportsComplexFacilities);
            setFacilitiesLoading(false);
            return;
          }
        }
        
        // Fallback: try inventory API for Sports Complex items
        console.log("Falling back to inventory API for Sports Complex items");
        const invRes = await fetch("/api/inventory");
        const invData = await invRes.json();
        if (Array.isArray(invData)) {
          const sportsItems = invData.filter(
            (item) => item.venueId === 2
          ).map(item => ({
            facilityId: item.itemId || item.id,
            name: item.itemName || item.name,
            rateHourly: 0,
            rateDaily: Number(item.unitCost || 0),
            venueId: item.venueId,
            availability: item.status || "Available"
          }));
          setFacilities(sportsItems);
        }
      } catch (err) {
        console.error("Failed to load facilities:", err);
      } finally {
        setFacilitiesLoading(false);
      }
    }
    loadData();
  }, []);

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

  // Load which facilities are already reserved on the selected dates
  React.useEffect(() => {
    const dates = [...selectedDates].sort();
    if (dates.length === 0) {
      setReservedByDate({});
      return;
    }

    let cancelled = false;
    setFacilityAvailLoading(true);
    fetch(
      `/api/facilities/availability?venueId=${venueId}&dates=${dates.map(encodeURIComponent).join(",")}`
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

    return () => {
      cancelled = true;
    };
  }, [venueId, selectedDates]);

  // Drop selections that conflict with newly loaded reserved facilities
  React.useEffect(() => {
    if (Object.keys(reservedByDate).length === 0) return;

    if (!customizePerDate) {
      const reservedOnAny = new Set();
      for (const date of selectedDates) {
        for (const id of reservedByDate[date] || []) reservedOnAny.add(String(id));
      }
      setSelectedFacilityIds((prev) => {
        const next = prev.filter((id) => !reservedOnAny.has(String(id)));
        return next.length === prev.length ? prev : next;
      });
      return;
    }

    setDateCustomizations((prev) => {
      let changed = false;
      const updated = { ...prev };
      for (const date of Object.keys(updated)) {
        const reserved = new Set((reservedByDate[date] || []).map(String));
        const current = normalizeFacilityIds(updated[date]?.facilityIds ?? updated[date]?.facilityId);
        const nextIds = current.filter((id) => !reserved.has(String(id)));
        if (nextIds.length !== current.length) {
          changed = true;
          updated[date] = { ...updated[date], facilityIds: nextIds, facilityId: undefined };
        }
      }
      return changed ? updated : prev;
    });
  }, [reservedByDate, selectedDates, customizePerDate]);

  // Initialize date customizations when customize mode is turned on or dates change
  React.useEffect(() => {
    if (customizePerDate && selectedDates.size > 0) {
      setDateCustomizations((prev) => {
        const updated = { ...prev };
        for (const date of selectedDates) {
          if (!updated[date]) {
            updated[date] = {
              packageId: packageId || "0",
              particularQuantities: { ...particularQuantities },
              facilityIds: [...selectedFacilityIds],
              timeSlotId,
              venueRentalSlot,
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
          const cust = updated[date];
          const synced = syncVirtualPackageStateForTimeSlot(
            cust.packageId,
            particulars,
            cust.particularQuantities,
            cust.venueRentalSlot,
            value
          );
          updated[date] = {
            ...cust,
            timeSlotId: value,
            packageId: remapped(cust.packageId),
            particularQuantities: synced.particularQuantities,
            venueRentalSlot:
              cust.packageId === VIRTUAL_PACKAGE_IDS.VENUE_RENTAL
                ? synced.venueRentalSlot
                : cust.venueRentalSlot,
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
    setSelectedFacilityIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleDateFacilitySelection = (date, facilityId) => {
    const id = String(facilityId);
    if ((reservedByDate[date] || []).map(String).includes(id)) {
      toast.error("This facility is already reserved on this date.");
      return;
    }
    setDateCustomizations((prev) => {
      const current = normalizeFacilityIds(prev[date]?.facilityIds ?? prev[date]?.facilityId);
      const nextIds = current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id];
      return {
        ...prev,
        [date]: {
          ...prev[date],
          packageId: "0",
          facilityIds: nextIds,
          facilityId: undefined,
          particularQuantities: {},
          venueRentalSlot: "",
          timeSlotId: prev[date]?.timeSlotId || timeSlotId || "1",
        },
      };
    });
  };

  const handlePackageSelect = (value) => {
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
        // Sync per-date customizations when package changes and customize mode is active
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
      // Sync per-date customizations when package changes and customize mode is active
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

  // Per-date customization handlers
  const handleDatePackageSelect = (date, pkgId) => {
    const selectedPkg = packages.find((p) => String(p.packageId) === pkgId);
    let nextTimeSlotId =
      dateCustomizations[date]?.timeSlotId || timeSlotId || "1";

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
      for (const date of selectedDates) {
        initial[date] = {
          packageId: packageId || "0",
          particularQuantities: { ...particularQuantities },
          facilityIds: [...selectedFacilityIds],
          timeSlotId,
          venueRentalSlot,
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
    if (!effectiveEventDate || !effectiveTimeSlotId || !eventType) {
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

    const hasPerDateFacilities =
      hasPerDateSettings &&
      Object.values(dateCustomizations).every(
        (c) => normalizeFacilityIds(c?.facilityIds ?? c?.facilityId).length > 0
      );
    if (!hasPerDateSettings && selectedFacilityIds.length === 0) {
      toast.error("Please select at least one facility.");
      return;
    }
    if (hasPerDateSettings && !hasPerDateFacilities) {
      toast.error("Please select at least one facility for every customized date.");
      return;
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

      const hasPerDateSettings = customizePerDate && Object.keys(dateCustomizations).length > 0;

      const facilityNoteParts = [];
      if (hasPerDateSettings) {
        for (const date of sortedDates) {
          const cust = dateCustomizations[date];
          const ids = normalizeFacilityIds(cust?.facilityIds ?? cust?.facilityId);
          if (!ids.length) continue;
          const names = ids
            .map((id) => facilities.find((f) => String(f.facilityId) === String(id))?.name)
            .filter(Boolean);
          if (names.length) facilityNoteParts.push(`${date}: ${names.join(", ")}`);
        }
      } else if (selectedFacilityIds.length > 0) {
        const names = selectedFacilityIds
          .map((id) => facilities.find((f) => String(f.facilityId) === String(id))?.name)
          .filter(Boolean);
        if (names.length) facilityNoteParts.push(names.join(", "));
      }
      if (facilityNoteParts.length > 0) {
        notesStr = `${notesStr} | Facilities: ${facilityNoteParts.join(" | ")}`;
      }

      // Build particulars and package for submit
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

      // No packages or particulars for Sports Complex
      const selectedParticulars = [];
      const selectedPackageId = null;

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
          facilityIds: hasPerDateSettings ? undefined : selectedFacilityIds,
          facilityAssignments: hasPerDateSettings
            ? Object.fromEntries(
                sortedDates.map((date) => [
                  date,
                  normalizeFacilityIds(
                    dateCustomizations[date]?.facilityIds ?? dateCustomizations[date]?.facilityId
                  ),
                ])
              )
            : undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to create reservation");
      }

      const data = await res.json();
      toast.success(`Reservation ${data.id} created successfully!${isExistingUser && selectedClient ? ` Linked to ${selectedClient.fullName}.` : ''}`);

      // Reset form
      setShowOrder(false);
      setVenueId("2");
      setEventType("");
      setEventDate("");
      setTimeSlotId("1");
      setPackageId(VIRTUAL_PACKAGE_IDS.VENUE_RENTAL);
      setVenueRentalSlot(TIME_SLOT.DAY);
      setNotes("");
      setClientName("");
      setClientContact("");
      setClientEmail("");
      setSelectedClient(null);
      setSearchQuery("");
      setSearchResults([]);
      setSelectedDates(new Set());
      setSelectedFacilityIds([]);
      setParticularQuantities({});
      setCustomizePerDate(false);
      setDateCustomizations({});
      setEventDates([]);
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
    return "—";
  };

  const summaryLines = buildFacilitySummaryLines({
    facilities,
    selectedFacilityIds,
    selectedDatesCount: selectedDates.size,
    customizePerDate,
    dateCustomizations,
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
              <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                <Building2 className="size-4 text-muted-foreground shrink-0" />
                <span className="font-medium">Sports Complex</span>
              </div>
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

              {/* Customize Per Date Button - only shown when multiple dates selected */}
              {selectedDates.size > 1 && (
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
            <div className="space-y-2">
              <Label>Time Slot</Label>
              <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                <Clock className="size-4 text-muted-foreground shrink-0" />
                <span className="font-medium">Day (8:00 AM – 5:00 PM)</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Facilities</Label>
              <p className="text-xs text-muted-foreground">
                Select one or more facilities. Prices shown are day rates.
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
                <div className={`rounded-md border divide-y max-h-64 overflow-y-auto ${customizePerDate ? "opacity-60 pointer-events-none" : ""}`}>
                  {facilities.map((f) => {
                    const id = String(f.facilityId);
                    const reserved = reservedFacilityIdsGlobal.has(id);
                    const checked = selectedFacilityIds.includes(id);
                    const dayRate = getFacilityDayRate(f);
                    const disabled = customizePerDate || reserved || selectedDates.size === 0;
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
                            ₱{dayRate.toLocaleString()}/day
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
              {!customizePerDate && selectedFacilityIds.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedFacilityIds.length} facilit{selectedFacilityIds.length === 1 ? "y" : "ies"} selected
                </p>
              )}
              {customizePerDate && (
                <p className="text-xs text-muted-foreground">
                  Locked while using per-date settings. Edit each date in Per-Date Details.
                </p>
              )}
            </div>
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
              Choose different facilities (day rates) for each selected date.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {[...selectedDates].sort().map((date) => {
              const cust = dateCustomizations[date] || { facilityIds: [] };
              const dateFacilityIds = normalizeFacilityIds(cust.facilityIds ?? cust.facilityId);
              return (
                <div key={date} className="rounded-lg border p-4">
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Calendar className="size-4 text-muted-foreground" />
                    {date}
                  </h4>
                  <div className="space-y-2">
                    <Label className="text-xs">Facilities for {date}</Label>
                    {facilitiesLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                        <Loader2 className="size-4 animate-spin" />
                        Loading facilities...
                      </div>
                    ) : (
                      <div className="rounded-md border divide-y max-h-48 overflow-y-auto">
                        {facilities.map((f) => {
                          const id = String(f.facilityId);
                          const reserved = (reservedByDate[date] || []).map(String).includes(id);
                          const checked = dateFacilityIds.includes(id);
                          const dayRate = getFacilityDayRate(f);
                          return (
                            <label
                              key={id}
                              className={`flex items-center gap-3 px-3 py-2 text-sm ${
                                reserved
                                  ? "cursor-not-allowed opacity-60"
                                  : "cursor-pointer hover:bg-muted/40"
                              }`}
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() => toggleDateFacilitySelection(date, id)}
                                disabled={reserved}
                              />
                              <span className="flex-1 min-w-0 font-medium truncate">{f.name}</span>
                              {reserved ? (
                                <span className="shrink-0 text-xs text-destructive">Reserved</span>
                              ) : (
                                <span className="shrink-0 tabular-nums text-muted-foreground">
                                  ₱{dayRate.toLocaleString()}/day
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    )}
                    {dateFacilityIds.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {dateFacilityIds.length} selected
                      </p>
                    )}
                  </div>
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
