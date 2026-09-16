"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Clock, Building2, Package, ChevronLeft, ChevronRight, Trash2, Printer, Layers, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import {
  isVirtualPackageId,
  isRegularPackageId,
  isFacilityPackageId,
  VIRTUAL_PACKAGE_IDS,
  filterCustomParticulars,
  getVirtualPackageParticulars,
  parseReservationPackageId,
  isConsolidatedBasketballEntry,
  buildReservationSummaryLines,
  sumReservationSummaryLines,
  syncVirtualPackageStateForTimeSlot,
  deriveTimeSlotFromVirtualPackage,
  resolveVenueRentalSlot,
} from "@/lib/reservation-package-select";
import { readParticularQuantity } from "@/lib/particular-options";
import { TIME_SLOT, TIME_SLOT_OPTIONS, timeSlotAfterPackageChange, isWholeDaySlot } from "@/lib/time-slots";
import {
  ReservationVirtualPackagePanel,
  ReservationPackageSelectItems,
} from "@/components/reservation-virtual-package-panel";
import { ParticularQuantityStepper } from "@/components/particular-quantity-stepper";
import {
  getMinEventDate,
  getMinEventDateKey,
  isEventDateTooSoon,
  validateAdvanceBookingDates,
  MIN_ADVANCE_BOOKING_DAYS,
} from "@/lib/reservation-advance-booking";

const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

/**
 * Get the correct facility rate based on the selected time slot.
 */
function getFacilityRateBySlot(facility, timeSlotId) {
  const dayRate = Number(facility?.rateDay ?? facility?.rateHourly ?? 0);
  const nightRate = Number(facility?.rateNight ?? facility?.rateDaily ?? 0);
  const slot = String(timeSlotId || "1");
  if (slot === "2") return nightRate > 0 ? nightRate : dayRate;       // Night
  if (slot === "3") return dayRate + nightRate;                        // Whole Day = Day + Night
  return dayRate > 0 ? dayRate : nightRate;                            // Day (default)
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

export default function ClientReservationsPage() {
  const [form, setForm] = React.useState({
    venueId: "",
    eventType: "",
    timeSlotId: "",
    packageId: "",
    venueRentalSlot: "",
    notes: "",
  });
  const [packages, setPackages] = React.useState([]);
  const [particulars, setParticulars] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedDates, setSelectedDates] = React.useState(new Set());
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const [availability, setAvailability] = React.useState({});
  const [availLoading, setAvailLoading] = React.useState(false);
  const [particularQuantities, setParticularQuantities] = React.useState({});
  const [lastReservationId, setLastReservationId] = React.useState(null);
  const [lastTotalAmount, setLastTotalAmount] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);
  const [particularsLoading, setParticularsLoading] = React.useState(true);
  const submitLockRef = React.useRef(false);

  // Sports Complex facilities
  const [facilities, setFacilities] = React.useState([]);
  const [selectedFacilityIds, setSelectedFacilityIds] = React.useState([]);
  const [facilityQuantities, setFacilityQuantities] = React.useState({});
  const [facilitiesLoading, setFacilitiesLoading] = React.useState(false);
  /** dateKey → facilityId[] already reserved by other reservations */
  const [reservedByDate, setReservedByDate] = React.useState({});
  const [facilityAvailLoading, setFacilityAvailLoading] = React.useState(false);

  // Logged-in user info
  const [clientInfo, setClientInfo] = React.useState({ name: "", email: "" });

  React.useEffect(() => {
    const name = localStorage.getItem("userName") || localStorage.getItem("name") || "";
    const email = localStorage.getItem("userEmail") || localStorage.getItem("email") || "";
    setClientInfo({ name, email });
  }, []);

  // Per-date customization state
  const [customizePerDate, setCustomizePerDate] = React.useState(false);
  const [dateCustomizations, setDateCustomizations] = React.useState({});
  const [showCustomizeDialog, setShowCustomizeDialog] = React.useState(false);

  // Load packages and particulars
  React.useEffect(() => {
    async function load() {
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
        setLoading(false);
        setParticularsLoading(false);
      }
    }
    load();
  }, []);

  // Load facilities based on venue selection
  React.useEffect(() => {
    if (form.venueId === "2" || form.venueId === "1") {
      setFacilitiesLoading(true);
      fetch("/api/facilities")
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) {
            const matchingFacilities = data.filter((item) => item.venueId === parseInt(form.venueId, 10));
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
      setFacilityQuantities({});
      setReservedByDate({});
    }
  }, [form.venueId]);

  // Fetch availability when venue or month changes
  React.useEffect(() => {
    if (!form.venueId) return;
    const monthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}`;
    setAvailLoading(true);
    fetch(`/api/availability?venueId=${form.venueId}&month=${monthStr}`)
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
  }, [form.venueId, currentMonth]);

  // Load facility availability when dates are selected for Sports Complex
  React.useEffect(() => {
    if (form.venueId !== "2") {
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
  }, [form.venueId, selectedDates]);

  // Drop facility selections that conflict with newly loaded reserved facilities
  React.useEffect(() => {
    if (Object.keys(reservedByDate).length === 0) return;
    if (!form.venueId || form.venueId !== "2") return;
    const reservedOnAny = new Set();
    for (const date of selectedDates) {
      for (const id of reservedByDate[date] || []) reservedOnAny.add(String(id));
    }
    setSelectedFacilityIds((prev) => {
      const next = prev.filter((id) => !reservedOnAny.has(String(id)));
      return next.length === prev.length ? prev : next;
    });
  }, [reservedByDate, selectedDates, form.venueId]);

  // Initialize date customizations when dates change or customize mode is turned on
  React.useEffect(() => {
    if (customizePerDate && selectedDates.size > 0) {
      setDateCustomizations((prev) => {
        const updated = { ...prev };
        for (const date of selectedDates) {
          if (!updated[date]) {
            updated[date] = {
              morning: {
                enabled: true,
                packageId: form.packageId || "0",
                particularQuantities: { ...particularQuantities },
                timeSlotId: TIME_SLOT.DAY,
                venueRentalSlot: form.venueRentalSlot || "",
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
        // Remove customizations for dates no longer selected
        for (const date of Object.keys(updated)) {
          if (!selectedDates.has(date)) {
            delete updated[date];
          }
        }
        return updated;
      });
    }
  }, [customizePerDate, selectedDates]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    // For Sports Complex, default timeSlotId to Day (1)
    if (field === "venueId" && value === "2") {
      setForm((prev) => ({ ...prev, timeSlotId: prev.timeSlotId || "1" }));
    }
  };

  const handleTimeSlotChange = (value) => {
    setForm((prev) => {
      const isWholeDay = isWholeDaySlot(value);
      const remapped = (currentPkgId) => {
        if (!currentPkgId || currentPkgId === "0" || currentPkgId === "custom" || isVirtualPackageId(currentPkgId)) return currentPkgId;
        const currentNum = Number(currentPkgId);
        // Night → Day when switching to Whole Day: 3→1 (Standard), 4→2 (LED)
        if (isWholeDay && (currentNum === 3 || currentNum === 4)) {
          return String(currentNum - 2);
        }
        return currentPkgId;
      };
      const updates = { timeSlotId: value, packageId: remapped(prev.packageId) };
      if (prev.packageId === VIRTUAL_PACKAGE_IDS.VENUE_RENTAL) {
        updates.venueRentalSlot = resolveVenueRentalSlot(value, value);
      }
      return { ...prev, ...updates };
    });

    if (form.packageId === VIRTUAL_PACKAGE_IDS.BASKETBALL) {
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
        const isWholeDay = isWholeDaySlot(value);
        const remapped = (currentPkgId) => {
          if (!currentPkgId || currentPkgId === "0" || currentPkgId === "custom" || isVirtualPackageId(currentPkgId)) return currentPkgId;
          const currentNum = Number(currentPkgId);
          if (isWholeDay && (currentNum === 3 || currentNum === 4)) {
            return String(currentNum - 2);
          }
          return currentPkgId;
        };
        const updated = { ...prev };
        for (const date of Object.keys(updated)) {
          const cust = updated[date];
          // Update both morning and night sessions if they exist
          if (cust.morning || cust.night) {
            const morningSynced = syncVirtualPackageStateForTimeSlot(
              cust.morning?.packageId,
              particulars,
              cust.morning?.particularQuantities || {},
              cust.morning?.venueRentalSlot,
              value
            );
            const nightSynced = syncVirtualPackageStateForTimeSlot(
              cust.night?.packageId,
              particulars,
              cust.night?.particularQuantities || {},
              cust.night?.venueRentalSlot,
              value
            );
            updated[date] = {
              morning: {
                ...(cust.morning || {}),
                timeSlotId: value,
                packageId: remapped(cust.morning?.packageId),
                particularQuantities: morningSynced.particularQuantities,
                venueRentalSlot: cust.morning?.packageId === VIRTUAL_PACKAGE_IDS.VENUE_RENTAL ? morningSynced.venueRentalSlot : cust.morning?.venueRentalSlot,
              },
              night: {
                ...(cust.night || {}),
                timeSlotId: value,
                packageId: remapped(cust.night?.packageId),
                particularQuantities: nightSynced.particularQuantities,
                venueRentalSlot: cust.night?.packageId === VIRTUAL_PACKAGE_IDS.VENUE_RENTAL ? nightSynced.venueRentalSlot : cust.night?.venueRentalSlot,
              },
            };
          } else {
            // Legacy flat model
            const syncd = syncVirtualPackageStateForTimeSlot(
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
              particularQuantities: syncd.particularQuantities,
              venueRentalSlot:
                cust.packageId === VIRTUAL_PACKAGE_IDS.VENUE_RENTAL
                  ? syncd.venueRentalSlot
                  : cust.venueRentalSlot,
            };
          }
        }
        return updated;
      });
    }
  };

  const handleVirtualParticularQuantitiesChange = (pq) => {
    setParticularQuantities(pq);
    if (form.packageId === VIRTUAL_PACKAGE_IDS.BASKETBALL) {
      const slot = deriveTimeSlotFromVirtualPackage(
        form.packageId,
        particulars,
        pq,
        form.venueRentalSlot,
        form.timeSlotId
      );
      if (slot && slot !== form.timeSlotId) {
        setForm((prev) => ({ ...prev, timeSlotId: slot }));
      }
    }
  };

  const handleVenueRentalSlotChange = (val) => {
    setForm((prev) => ({ ...prev, venueRentalSlot: val, timeSlotId: val }));
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
    setSelectedFacilityIds((prev) => {
      if (prev.includes(id)) {
        // Remove facility and its quantity
        setFacilityQuantities((qPrev) => {
          const next = { ...qPrev };
          delete next[id];
          return next;
        });
        return prev.filter((x) => x !== id);
      } else {
        // Add facility and set default quantity = 1
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
      cust.timeSlotId || form.timeSlotId
    );
    setDateCustomizations((prev) => ({
      ...prev,
      [date]: {
        ...prev[date],
        particularQuantities: pq,
        timeSlotId: slot || prev[date]?.timeSlotId || form.timeSlotId,
      },
    }));
  };

  const handleDateVenueRentalSlotChange = (date, val) => {
    setDateCustomizations((prev) => ({
      ...prev,
      [date]: { ...prev[date], venueRentalSlot: val, timeSlotId: val },
    }));
  };

  const handlePackageSelect = (packageId) => {
    // Cultural Center facility rental selected from the packages dropdown.
    // Priced from the facility's own rate — see buildReservationSummaryLines.
    if (isFacilityPackageId(packageId)) {
      setForm((prev) => ({ ...prev, packageId, venueRentalSlot: "" }));
      setParticularQuantities({});
      if (customizePerDate && Object.keys(dateCustomizations).length > 0) {
        setDateCustomizations((prev) => {
          const updated = { ...prev };
          for (const date of Object.keys(updated)) {
            updated[date] = {
              ...updated[date],
              packageId,
              particularQuantities: {},
              venueRentalSlot: "",
              timeSlotId: updated[date]?.timeSlotId || form.timeSlotId,
            };
          }
          return updated;
        });
      }
      return;
    }
    if (isVirtualPackageId(packageId)) {
      setForm((prev) => ({
        ...prev,
        packageId,
        venueRentalSlot:
          packageId === VIRTUAL_PACKAGE_IDS.VENUE_RENTAL
            ? prev.venueRentalSlot || prev.timeSlotId || "1"
            : "",
      }));
      setParticularQuantities({});
      if (customizePerDate && Object.keys(dateCustomizations).length > 0) {
        setDateCustomizations((prev) => {
          const updated = { ...prev };
          for (const date of Object.keys(updated)) {
            updated[date] = {
              ...updated[date],
              packageId,
              particularQuantities: {},
              timeSlotId: updated[date]?.timeSlotId || form.timeSlotId,
              venueRentalSlot:
                packageId === VIRTUAL_PACKAGE_IDS.VENUE_RENTAL
                  ? form.venueRentalSlot || form.timeSlotId || "1"
                  : "",
            };
          }
          return updated;
        });
      }
      return;
    }
    if (packageId && packageId !== "0" && packageId !== "custom") {
      const selectedPkg = packages.find(p => String(p.packageId) === packageId);
      if (selectedPkg) {
        setForm((prev) => ({
          ...prev,
          packageId,
          timeSlotId: timeSlotAfterPackageChange(prev.timeSlotId, selectedPkg.timeSlotId),
        }));
        setParticularQuantities({});
        if (customizePerDate && Object.keys(dateCustomizations).length > 0) {
          setDateCustomizations((prev) => {
            const updated = { ...prev };
            for (const date of Object.keys(updated)) {
              updated[date] = { ...updated[date], packageId, particularQuantities: {} };
            }
            return updated;
          });
        }
        return;
      }
    }
    setForm(prev => ({ ...prev, packageId }));
    if (packageId === "custom" || packageId === "0") {
      setParticularQuantities({});
      if (customizePerDate && Object.keys(dateCustomizations).length > 0) {
        setDateCustomizations((prev) => {
          const updated = { ...prev };
          for (const date of Object.keys(updated)) {
            updated[date] = { ...updated[date], packageId, particularQuantities: {} };
          }
          return updated;
        });
      }
    }
  };

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

  // Per-date customization handlers
  const handleDatePackageSelect = (date, pkgId) => {
    const selectedPkg = packages.find((p) => String(p.packageId) === pkgId);
    let nextTimeSlotId =
      dateCustomizations[date]?.timeSlotId || form.timeSlotId || "1";

    if (selectedPkg && isRegularPackageId(pkgId)) {
      nextTimeSlotId = timeSlotAfterPackageChange(
        nextTimeSlotId,
        selectedPkg.timeSlotId
      );
    } else if (pkgId === VIRTUAL_PACKAGE_IDS.VENUE_RENTAL) {
      nextTimeSlotId =
        dateCustomizations[date]?.venueRentalSlot ||
        form.venueRentalSlot ||
        form.timeSlotId ||
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
            ? prev[date]?.venueRentalSlot || form.venueRentalSlot || nextTimeSlotId
            : "",
        particularQuantities:
          isVirtualPackageId(pkgId) || (pkgId && pkgId !== "0" && pkgId !== "custom")
            ? {}
            : (prev[date]?.particularQuantities || {}),
      },
    }));
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
        form.venueRentalSlot ||
        form.timeSlotId ||
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
              ? prev[date]?.[session]?.venueRentalSlot || form.venueRentalSlot || nextTimeSlotId
              : "",
          particularQuantities:
            isVirtualPackageId(pkgId) || (pkgId && pkgId !== "0" && pkgId !== "custom")
              ? (prev[date]?.[session]?.particularQuantities || {})
              : (prev[date]?.[session]?.particularQuantities || {}),
        },
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

  const handleDateSessionParticularQuantitiesChange = (date, session, pq) => {
    const cust = dateCustomizations[date]?.[session] || {};
    const slot = deriveTimeSlotFromVirtualPackage(
      cust.packageId,
      particulars,
      pq,
      cust.venueRentalSlot,
      cust.timeSlotId || form.timeSlotId
    );
    setDateCustomizations((prev) => ({
      ...prev,
      [date]: {
        ...prev[date],
        [session]: {
          ...prev[date]?.[session],
          particularQuantities: pq,
          timeSlotId: slot || prev[date]?.[session]?.timeSlotId || form.timeSlotId,
        },
      },
    }));
  };

  const toggleCustomizeMode = () => {
    if (!customizePerDate) {
      // Turning on: initialize customizations from current global values
      const initial = {};
      const isSports = form.venueId === "2";
      for (const date of selectedDates) {
        initial[date] = {
          morning: {
            enabled: true,
            packageId: form.packageId || "0",
            particularQuantities: { ...particularQuantities },
            timeSlotId: TIME_SLOT.DAY,
            venueRentalSlot: form.venueRentalSlot || "",
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
      // Turning off: clear customizations
      setDateCustomizations({});
      setShowCustomizeDialog(false);
    }
    setCustomizePerDate(!customizePerDate);
  };

  const isSportsComplex = form.venueId === "2";

  const summaryLines = isSportsComplex
    ? buildFacilitySummaryLines({
        facilities,
        facilityQuantities,
        selectedDatesCount: selectedDates.size,
        timeSlotId: form.timeSlotId,
      })
    : buildReservationSummaryLines({
        particulars,
        packages,
        packageId: form.packageId,
        particularQuantities,
        timeSlotId: form.timeSlotId,
        venueRentalSlot: form.venueRentalSlot,
        selectedDatesCount: selectedDates.size,
        customizePerDate,
        dateCustomizations,
        facilities,
      });
  const total = sumReservationSummaryLines(summaryLines);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || submitLockRef.current) return;
    submitLockRef.current = true;

    const clientId = localStorage.getItem("user_id")?.replace("CLT-", "");
    if (!clientId) {
      toast.error("Please log in first");
      submitLockRef.current = false;
      return;
    }

    if (!form.venueId || !form.eventType) {
      toast.error("Please fill in all required fields");
      submitLockRef.current = false;
      return;
    }

    if (!form.timeSlotId && !(customizePerDate && Object.keys(dateCustomizations).length > 0)) {
      toast.error("Please select a time slot");
      submitLockRef.current = false;
      return;
    }

    if (selectedDates.size === 0) {
      toast.error("Please select at least one date");
      submitLockRef.current = false;
      return;
    }

    // Sports Complex validation: require at least one facility
    if (isSportsComplex && selectedFacilityIds.length === 0) {
      toast.error("Please select at least one facility.");
      submitLockRef.current = false;
      return;
    }

    // Cultural Center validation: virtual package entries
    if (!isSportsComplex && !customizePerDate && isVirtualPackageId(form.packageId)) {
      const entries = getVirtualPackageParticulars(
        form.packageId,
        particulars,
        particularQuantities,
        form.timeSlotId,
        form.venueRentalSlot
      );
      if (!entries.length) {
        toast.error("Please complete your Basketball Game or Venue Rental selection.");
        submitLockRef.current = false;
        return;
      }
    }

    const sortedDates = [...selectedDates].sort();
    const primaryDate = sortedDates[0];

    const hasPerDateSettings = customizePerDate && Object.keys(dateCustomizations).length > 0;
    // While per-date settings lock the time slot/package selects, the time slot
    // lives on each date's customization instead of the global form value.
    let payloadTimeSlotId = form.timeSlotId;
    if (hasPerDateSettings) {
      const primaryCust = dateCustomizations[primaryDate];
      payloadTimeSlotId =
        primaryCust?.timeSlotId ||
        Object.values(dateCustomizations).find((c) => c && c.timeSlotId)?.timeSlotId ||
        form.timeSlotId ||
        TIME_SLOT.DAY;
    }

    const advanceCheck = validateAdvanceBookingDates(sortedDates);
    if (!advanceCheck.valid) {
      toast.error(advanceCheck.error);
      submitLockRef.current = false;
      return;
    }

    let selectedParticulars = [];
    let selectedPackageId = form.packageId || null;

    if (customizePerDate && Object.keys(dateCustomizations).length > 0) {
      const aggregatedParticulars = {};
      const basketballDayCounts = {};
      const collectSession = (session) => {
        if (!session || !session.enabled) return;
        if (isVirtualPackageId(session.packageId)) {
          const entries = getVirtualPackageParticulars(
            session.packageId,
            particulars,
            session.particularQuantities,
            session.timeSlotId || form.timeSlotId,
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
        if (cust.morning || cust.night) {
          collectSession(cust.morning);
          collectSession(cust.night);
        } else {
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
      
      // Use the first date's morning or night package as the primary package
      const firstCust = dateCustomizations[primaryDate];
      const firstMorningPkg = firstCust?.morning?.packageId;
      const firstNightPkg = firstCust?.night?.packageId;
      if (firstMorningPkg && isRegularPackageId(firstMorningPkg)) {
        selectedPackageId = firstMorningPkg;
      } else if (firstNightPkg && isRegularPackageId(firstNightPkg)) {
        selectedPackageId = firstNightPkg;
      } else if (firstCust && isRegularPackageId(firstCust.packageId)) {
        selectedPackageId = firstCust.packageId;
      } else {
        selectedPackageId = null;
      }
    } else if (isVirtualPackageId(form.packageId)) {
      const numDays = sortedDates.length || 1;
      selectedParticulars = getVirtualPackageParticulars(
        form.packageId,
        particulars,
        particularQuantities,
        form.timeSlotId,
        form.venueRentalSlot
      ).map((p) => {
        if (form.packageId === VIRTUAL_PACKAGE_IDS.VENUE_RENTAL) {
          return { ...p, quantity: p.quantity * numDays };
        }
        if (isConsolidatedBasketballEntry(particulars, p)) {
          return { ...p, days: numDays };
        }
        if (form.packageId === VIRTUAL_PACKAGE_IDS.BASKETBALL) {
          return { ...p, quantity: p.quantity * numDays };
        }
        return p;
      });
      selectedPackageId = null;
    } else {
      // Only include particulars if custom or no package
      if (form.packageId === "custom" || form.packageId === "0" || !form.packageId) {
        selectedParticulars = Object.entries(particularQuantities)
          .filter(([, qty]) => qty > 0)
          .map(([id, qty]) => ({ particularId: parseInt(id, 10), quantity: qty }));
      } else {
        selectedPackageId = form.packageId || null;
        selectedParticulars = []; // Inclusions are free, don't send as paid particulars
      }
    }

    // For Sports Complex, override with facility IDs and no packages/particulars
    if (isSportsComplex) {
      selectedPackageId = null;
      selectedParticulars = [];
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venueId: form.venueId,
          eventType: form.eventType,
          eventDate: primaryDate,
          eventDates: sortedDates,
          timeSlotId: payloadTimeSlotId,
          packageId: parseReservationPackageId(selectedPackageId),
          clientId: parseInt(clientId, 10),
          notes: form.notes || null,
          particulars: selectedParticulars,
          chargeLines: summaryLines,
          ...(isSportsComplex
            ? customizePerDate
              ? {
                  facilityAssignments: Object.fromEntries(
                    sortedDates.map((date) => [
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
        if (res.status === 409) {
          toast.error(`Date conflict: ${errData.error}`);
          return;
        }
        throw new Error(errData.error || "Failed to create reservation");
      }

      const data = await res.json();
      setLastReservationId(data.id);
      setLastTotalAmount(data.totalAmount || 0);
      toast.success(`Reservation ${data.id} created! Total: ₱${Number(data.totalAmount || 0).toLocaleString()}`);
      setForm({
        venueId: "",
        eventType: "",
        timeSlotId: "",
        packageId: "",
        venueRentalSlot: "",
        notes: "",
      });
      setSelectedDates(new Set());
      setParticularQuantities({});
      setCustomizePerDate(false);
      setDateCustomizations({});
      setSelectedFacilityIds([]);
      setFacilityQuantities({});
      setReservedByDate({});
    } catch (err) {
      toast.error(err.message);
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
    }
  };

  // Render calendar grid
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
          <div className="flex flex-wrap gap-1">
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
              const rate = getFacilityRateBySlot(f, cust.morning?.timeSlotId || form.timeSlotId);
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
        <h2 className="text-2xl font-semibold tracking-tight">New Reservation</h2>
        <p className="text-muted-foreground text-sm">
          Fill in the details below to create a new reservation request. Select multiple dates if needed.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Client Information</CardTitle>
          <CardDescription>
            Your account details and reservation preferences.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Logged-in User Info */}
          <div className="rounded-lg border bg-muted/30 p-4 mb-4">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="size-4 text-primary" />
              <span className="text-sm font-medium">Logged-in User</span>
              <Badge variant="secondary" className="ml-auto">Client</Badge>
            </div>
            <p className="text-sm font-medium">{clientInfo.name || "Client"}</p>
            <p className="text-xs text-muted-foreground">{clientInfo.email || ""}</p>
          </div>

          <Separator className="mb-6" />

          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="venue">Venue <span className="text-red-500">*</span></Label>
                <Select value={form.venueId} onValueChange={(v) => handleChange("venueId", v)}>
                  <SelectTrigger id="venue">
                    <SelectValue placeholder="Select venue" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Cultural Center</SelectItem>
                    <SelectItem value="2">Sports Complex</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="event-type">Event Type <span className="text-red-500">*</span></Label>
                <Input
                  id="event-type"
                  placeholder="e.g. Seminar, Conference, Sports Event"
                  value={form.eventType}
                  onChange={(e) => handleChange("eventType", e.target.value)}
                />
              </div>

              {isSportsComplex ? (
                <div className="space-y-2">
                  <Label>Time Slot</Label>
                  <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                    <Clock className="size-4 text-muted-foreground shrink-0" />
                    <span className="font-medium">
                      {TIME_SLOT_OPTIONS.find((s) => s.value === form.timeSlotId)?.label || "Day (8:00 AM – 5:00 PM)"}
                    </span>
                  </div>
                </div>
              ) : (
              <div className="space-y-2">
                <Label htmlFor="timeslot">Time Slot <span className="text-red-500">*</span></Label>
                <Select
                  value={form.timeSlotId}
                  onValueChange={handleTimeSlotChange}
                  disabled={customizePerDate}
                >
                  <SelectTrigger id="timeslot" className="w-full min-w-0">
                    <SelectValue placeholder="Select time slot" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOT_OPTIONS.map((slot) => (
                      <SelectItem key={slot.id} value={slot.value}>
                        {slot.label}
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
                <Label htmlFor="package">Package</Label>
                <Select
                  value={form.packageId}
                  onValueChange={handlePackageSelect}
                  disabled={customizePerDate}
                >
                  <SelectTrigger id="package" className="w-full min-w-0">
                    <SelectValue placeholder={loading ? "Loading packages..." : "Select package"} />
                  </SelectTrigger>
                  <SelectContent position="popper" className="w-(--radix-select-trigger-width)">
                    <SelectItem value="0">None</SelectItem>
                    <ReservationPackageSelectItems packages={packages} particulars={particulars} timeSlotId={form.timeSlotId} facilities={facilities} venueId={form.venueId} />
                  </SelectContent>
                </Select>
                {customizePerDate && (
                  <p className="text-xs text-muted-foreground">
                    Locked while using per-date settings. Edit each date in Per-Date Details.
                  </p>
                )}
              </div>
              )}
            </div>
{/* Date Picker - Calendar Grid */}
            <div className="space-y-2">
              <Label>Select Dates <span className="text-red-500">*</span></Label>
              <p className="text-xs text-muted-foreground">
                Events must be at least {MIN_ADVANCE_BOOKING_DAYS} days from today. Earliest date:{" "}
                <span className="font-medium">{getMinEventDateKey()}</span>. Blocked dates are unavailable.
              </p>
              {form.venueId ? renderCalendar() : (
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

            {/* Conditional: Package Inclusions, Particulars Selector, or Facilities */}
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
                      const rate = getFacilityRateBySlot(f, form.timeSlotId);
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
                  use one package and service list for all dates.
                </p>
              </div>
            ) : (
            <div className="space-y-2">
              {form.packageId === VIRTUAL_PACKAGE_IDS.VENUE_RENTAL ? (
                <>
                  <ReservationVirtualPackagePanel
                    packageId={form.packageId}
                    particulars={particulars}
                    particularQuantities={particularQuantities}
                    onParticularQuantitiesChange={handleVirtualParticularQuantitiesChange}
                    timeSlotId={form.timeSlotId}
                    venueRentalSlot={form.venueRentalSlot}
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
                            const isBasketball = p.particularName === "Basketball Game";
                            const isAircon = p.particularName === "Aircon Compressor";
                            const basketballOptions = [
                              { value: 2, label: "Day w/o Shot Clock", price: 1000 },
                              { value: 3, label: "Day w/ Shot Clock", price: 1500 },
                              { value: 4, label: "Night w/o Shot Clock", price: 1500 },
                              { value: 5, label: "Night w/ Shot Clock", price: 2000 },
                            ];
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
                                  {cost > 0 && !isBasketball && !isAircon && (
                                    <p className="text-xs text-muted-foreground">P{cost.toLocaleString()} / unit</p>
                                  )}
                                  {isBasketball && (
                                    <div className="text-[10px] text-muted-foreground mt-1 space-y-0.5">
                                      {basketballOptions.map((o) => (
                                        <div key={o.value}>{o.label} = P{o.price.toLocaleString()}</div>
                                      ))}
                                    </div>
                                  )}
                                  {isAircon && (
                                    <div className="text-[10px] text-muted-foreground mt-1 space-y-0.5">
                                      {airconTiers.map((t) => (
                                        <div key={t.qty}>{t.qty} units = P{t.price.toLocaleString()} ({t.label})</div>
                                      ))}
                                    </div>
                                  )}
                                  {!isBasketball && !isAircon && (
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
              ) : isVirtualPackageId(form.packageId) ? (
                <ReservationVirtualPackagePanel
                  packageId={form.packageId}
                  particulars={particulars}
                  particularQuantities={particularQuantities}
                  onParticularQuantitiesChange={handleVirtualParticularQuantitiesChange}
                  timeSlotId={form.timeSlotId}
                  venueRentalSlot={form.venueRentalSlot}
                  onVenueRentalSlotChange={handleVenueRentalSlotChange}
                />
              ) : isRegularPackageId(form.packageId) ? (
                <>
                  <Label>Package Inclusions</Label>
                  <p className="text-xs text-muted-foreground">This package includes the following items at no additional cost.</p>
                  <div className="border rounded-lg p-4">
                    {(() => {
                      const pkg = packages.find(p => String(p.packageId) === form.packageId);
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
              ) : null}
            </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any special requests or requirements..."
                value={form.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                rows={3}
              />
            </div>

            </div>{/* end space-y-6 */}
        </CardContent>
      </Card>

      {/* Reservation Summary */}
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
              <span>Client</span>
              <span className="font-medium">{clientInfo.name || "Client"}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Venue</span>
              <span className="font-medium">
                {form.venueId ? (form.venueId === "1" ? "Cultural Center" : "Sports Complex") : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Event Type</span>
              <span className="font-medium">{form.eventType || "—"}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Date(s)</span>
              <span className="font-medium text-right">
                {selectedDates.size > 0
                  ? `${[...selectedDates].sort().join(", ")}`
                  : "—"}
                {selectedDates.size > 1 && (
                  <span className="text-xs text-muted-foreground ml-1">({selectedDates.size} days)</span>
                )}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Package</span>
              <span className="font-medium">
                {form.packageId && form.packageId !== "0"
                  ? packages.find(p => String(p.packageId) === form.packageId)?.packageName || "Custom"
                  : "None"}
              </span>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2 text-sm">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Charge Breakdown</p>
              {summaryLines.length > 0 ? (
                summaryLines.map((line, i) => (
                  <div key={`${line.date || "line"}-${i}`} className="flex items-start justify-between gap-3 pl-2">
                    <span className="min-w-0 wrap-break-word">{line.label}</span>
                    <span className="shrink-0 tabular-nums font-medium">
                      ₱{line.amount.toLocaleString()}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">No charges selected yet.</p>
              )}
              <Separator />
              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span className="tabular-nums">₱{total.toLocaleString()}</span>
              </div>
            </div>
            <Button
              type="button"
              className="w-full"
              size="lg"
              disabled={submitting || !form.venueId || !form.eventType || selectedDates.size === 0}
              onClick={handleSubmit}
            >
              {submitting ? "Submitting..." : "Generate Order of Payment"}
            </Button>
          </div>
        </CardContent>
      </Card>

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
                              <ReservationPackageSelectItems packages={packages} particulars={particulars} timeSlotId={timeSlotForSession} sessionType={sessionKey} facilities={facilities} venueId={form.venueId} />
                            </SelectContent>
                          </Select>
                        </div>
                        {s.packageId === VIRTUAL_PACKAGE_IDS.VENUE_RENTAL && (
                          <>
                            <ReservationVirtualPackagePanel
                              packageId={s.packageId}
                              particulars={particulars}
                              particularQuantities={s.particularQuantities || {}}
                              onParticularQuantitiesChange={(pq) => handleDateSessionParticularQuantitiesChange(date, sessionKey, pq)}
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
                                      const isBasketball = p.particularName === "Basketball Game";
                                      const isAircon = p.particularName === "Aircon Compressor";
                                      return (
                                        <div key={p.particularId} className="flex items-center justify-between rounded-md border p-2">
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium truncate">{p.particularName}</p>
                                            {cost > 0 && !isBasketball && !isAircon && (
                                              <p className="text-xs text-muted-foreground">₱{cost.toLocaleString()} / unit</p>
                                            )}
                                            {!isBasketball && !isAircon && (
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
                                              handleDateSessionParticularQuantitiesChange(date, sessionKey, newPq);
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
                  {renderSessionControls(cust, "morning", "Morning Session", TIME_SLOT.DAY)}
                  {renderSessionControls(cust, "night", "Night Session", TIME_SLOT.NIGHT)}
                    </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomizeDialog(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog with Order of Payment */}
      <Dialog open={!!lastReservationId} onOpenChange={() => setLastReservationId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reservation Submitted!</DialogTitle>
            <DialogDescription>
              Your reservation has been created successfully. You can view and print your Order of Payment below.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <p className="text-sm text-muted-foreground">
              Reference: <span className="font-medium text-foreground">{lastReservationId}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Total Amount: <span className="font-bold text-foreground">₱{lastTotalAmount.toLocaleString()}</span>
            </p>
          </div>
          <DialogFooter className="flex gap-2 sm:justify-between">
            <Button variant="outline" onClick={() => setLastReservationId(null)}>
              Close
            </Button>
            <Link href={`/panel/client/order-of-payment?id=${lastReservationId}`}>
              <Button>
                <Printer className="size-4 mr-2" />
                View Order of Payment
              </Button>
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
