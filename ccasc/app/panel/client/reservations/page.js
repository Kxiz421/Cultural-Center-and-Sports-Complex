"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Clock, Building2, Package, ChevronLeft, ChevronRight, Trash2, Printer, Layers, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import {
  isVirtualPackageId,
  isRegularPackageId,
  VIRTUAL_PACKAGE_IDS,
  filterCustomParticulars,
  getVirtualPackageParticulars,
  parseReservationPackageId,
  isConsolidatedBasketballEntry,
  buildReservationSummaryLines,
  sumReservationSummaryLines,
  syncVirtualPackageStateForTimeSlot,
  deriveTimeSlotFromVirtualPackage,
} from "@/lib/reservation-package-select";
import { readParticularQuantity } from "@/lib/particular-options";
import {
  ReservationVirtualPackagePanel,
  ReservationPackageSelectItems,
} from "@/components/reservation-virtual-package-panel";
import { ParticularQuantityStepper } from "@/components/particular-quantity-stepper";

const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

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
  const submitLockRef = React.useRef(false);

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
      }
    }
    load();
  }, []);

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

  // Initialize date customizations when dates change or customize mode is turned on
  React.useEffect(() => {
    if (customizePerDate && selectedDates.size > 0) {
      setDateCustomizations((prev) => {
        const updated = { ...prev };
        for (const date of selectedDates) {
          if (!updated[date]) {
            updated[date] = {
              packageId: form.packageId || "0",
              particularQuantities: { ...particularQuantities },
              timeSlotId: form.timeSlotId,
              venueRentalSlot: form.venueRentalSlot,
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
  };

  const handleTimeSlotChange = (value) => {
    setForm((prev) => {
      const updates = { timeSlotId: value };
      if (prev.packageId === VIRTUAL_PACKAGE_IDS.VENUE_RENTAL) {
        updates.venueRentalSlot = String(value) === "1" ? "1" : "2";
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
        setForm(prev => ({ ...prev, packageId, timeSlotId: String(selectedPkg.timeSlotId) }));
        setParticularQuantities({});
        // Sync per-date customizations when package changes and customize mode is active
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
      // Sync per-date customizations when package changes and customize mode is active
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
    if (!availability[dateStr]?.available) return;
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
      nextTimeSlotId = String(selectedPkg.timeSlotId || nextTimeSlotId);
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

  const toggleCustomizeMode = () => {
    if (!customizePerDate) {
      // Turning on: initialize customizations from current global values
      const initial = {};
      for (const date of selectedDates) {
        initial[date] = {
          packageId: form.packageId || "0",
          particularQuantities: { ...particularQuantities },
          timeSlotId: form.timeSlotId,
          venueRentalSlot: form.venueRentalSlot,
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

  const summaryLines = buildReservationSummaryLines({
    particulars,
    packages,
    packageId: form.packageId,
    particularQuantities,
    timeSlotId: form.timeSlotId,
    venueRentalSlot: form.venueRentalSlot,
    selectedDatesCount: selectedDates.size,
    customizePerDate,
    dateCustomizations,
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

    if (!form.venueId || !form.eventType || !form.timeSlotId) {
      toast.error("Please fill in all required fields");
      submitLockRef.current = false;
      return;
    }

    if (selectedDates.size === 0) {
      toast.error("Please select at least one date");
      submitLockRef.current = false;
      return;
    }

    if (isVirtualPackageId(form.packageId)) {
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

    let selectedParticulars = [];
    let selectedPackageId = form.packageId || null;

    if (customizePerDate && Object.keys(dateCustomizations).length > 0) {
      const aggregatedParticulars = {};
      const basketballDayCounts = {};
      for (const [, cust] of Object.entries(dateCustomizations)) {
        if (isVirtualPackageId(cust.packageId)) {
          const entries = getVirtualPackageParticulars(
            cust.packageId,
            particulars,
            cust.particularQuantities,
            cust.timeSlotId || form.timeSlotId,
            cust.venueRentalSlot
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
          cust.packageId === "0" ||
          cust.packageId === "custom" ||
          !cust.packageId
        ) {
          for (const [partId, qty] of Object.entries(cust.particularQuantities)) {
            if (qty > 0) {
              aggregatedParticulars[partId] = (aggregatedParticulars[partId] || 0) + qty;
            }
          }
        }
      }
      selectedParticulars = Object.entries(aggregatedParticulars)
        .filter(([, qty]) => qty > 0)
        .map(([id, qty]) => ({
          particularId: parseInt(id, 10),
          quantity: qty,
          ...(basketballDayCounts[id] ? { days: basketballDayCounts[id] } : {}),
        }));
      
      // Use the first date's package as the primary package
      const firstCust = dateCustomizations[primaryDate];
      if (firstCust && isRegularPackageId(firstCust.packageId)) {
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
          timeSlotId: form.timeSlotId,
          packageId: parseReservationPackageId(selectedPackageId),
          clientId: parseInt(clientId, 10),
          notes: form.notes || null,
          particulars: selectedParticulars,
          chargeLines: summaryLines,
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
            const isAvailable = avail?.available && !avail?.isPast;
            const isBlocked = avail?.blocked || avail?.isPast;
            const isPast = avail?.isPast || day.dt < today;

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
                  ${isBlocked || isPast ? "text-muted-foreground/30 line-through cursor-not-allowed" : ""}
                  ${!isBlocked && !isPast && !isSelected ? "text-foreground" : ""}
                `}
                title={isBlocked ? (avail?.reason || "Unavailable") : day.key}
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
          <CardTitle>Reservation Details</CardTitle>
          <CardDescription>
            Select your preferred venue, dates, and services.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
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

              <div className="space-y-2">
                <Label htmlFor="timeslot">Time Slot <span className="text-red-500">*</span></Label>
                <Select value={form.timeSlotId} onValueChange={handleTimeSlotChange}>
                  <SelectTrigger id="timeslot">
                    <SelectValue placeholder="Select time slot" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Day (8:00 AM - 5:00 PM)</SelectItem>
                    <SelectItem value="2">Night (5:00 PM - 10:00 PM)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="package">Package</Label>
                <Select value={form.packageId} onValueChange={handlePackageSelect}>
                  <SelectTrigger id="package">
                    <SelectValue placeholder={loading ? "Loading packages..." : "Select package"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">None</SelectItem>
                    <SelectItem value="custom">Custom — Pick Items</SelectItem>
                    <ReservationPackageSelectItems packages={packages} particulars={particulars} />
                  </SelectContent>
                </Select>
              </div>
            </div>
{/* Date Picker - Calendar Grid */}
            <div className="space-y-2">
              <Label>Select Dates <span className="text-red-500">*</span></Label>
              <p className="text-xs text-muted-foreground">Click on available dates to select them. Blocked dates are unavailable.</p>
              {form.venueId ? renderCalendar() : (
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

            {/* Conditional: Package Inclusions or Particulars Selector */}
            {customizePerDate ? (
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
              {isVirtualPackageId(form.packageId) ? (
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
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <Label>Additional Services / Particulars</Label>
                    {Object.keys(particularQuantities).length > 0 && (
                      <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => setParticularQuantities({})}>
                        <RotateCcw className="size-3 mr-1" />
                        Restore to Default
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Select the quantity for each service you need.</p>
                  <div className="space-y-2 border rounded-lg p-4">
                    {particulars.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No particulars available.</p>
                    ) : (
                      <div className="grid gap-3 md:grid-cols-2">
                        {filterCustomParticulars(particulars).map((p) => {
                          const qty = readParticularQuantity(
                            particularQuantities,
                            p.particularId
                          );
                          const cost = p.unitCost ? Number(p.unitCost) : 0;
                          const maxQty = p.totalQuantity || 999;
                          const isBasketball = p.particularName === "Basketball Game";
                          const isAircon = p.particularName === "Aircon Compressor";
                          const basketballOptions = [
                            { value: 2, label: "Day w/o Shot Clock", price: 1000 },
                            { value: 3, label: "Day w/ Shot Clock", price: 1500 },
                            { value: 4, label: "Night w/o Shot Clock", price: 1500 },
                            { value: 5, label: "Night w/ Shot Clock", price: 2000 },
                          ];
                          const airconTiers = [
                            { qty: 4, label: "100–1K pax", price: 3200 },
                            { qty: 6, label: "1K–3K pax", price: 4800 },
                            { qty: 8, label: "4K–6K pax", price: 6400 },
                            { qty: 10, label: "7K–10K pax", price: 8000 },
                          ];
                          return (
                            <div key={p.particularId} className="flex items-center justify-between rounded-md border p-3">
                              <div className="flex-1">
                                <p className="text-sm font-medium">{p.particularName}</p>
                                {cost > 0 && !isBasketball && <p className="text-xs text-muted-foreground">₱{cost.toLocaleString()} / unit</p>}
                                {isAircon && (
                                  <div className="text-[10px] text-muted-foreground mt-1 space-y-0.5">
                                    {airconTiers.map((t) => (
                                      <div key={t.qty}>{t.qty} units = ₱{t.price.toLocaleString()} ({t.label})</div>
                                    ))}
                                  </div>
                                )}
                                {!isBasketball && !isAircon && <p className="text-xs text-muted-foreground">Available: {maxQty}</p>}
                              </div>
                              <div className="flex items-center gap-2">
                                {isBasketball ? (
                                  <Select
                                    value={qty > 0 ? String(qty) : ""}
                                    onValueChange={(val) => {
                                      setParticularQuantities((prev) => ({ ...prev, [p.particularId]: parseInt(val, 10) }));
                                    }}
                                  >
                                    <SelectTrigger className="w-48 text-xs">
                                      <SelectValue placeholder="Select game type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {basketballOptions.map((opt) => (
                                        <SelectItem key={opt.value} value={String(opt.value)}>
                                          {opt.label} — ₱{opt.price.toLocaleString()}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <ParticularQuantityStepper
                                    value={qty}
                                    max={maxQty}
                                    buttonClassName="size-7"
                                    onChange={(val) =>
                                      setParticularQuantities((prev) => ({
                                        ...prev,
                                        [p.particularId]: val,
                                      }))
                                    }
                                  />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
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

            {/* Total Cost Summary */}
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Selected Dates</span>
                  <span className="font-medium">{selectedDates.size || 1} day(s)</span>
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
                      <div className="flex justify-between pl-2">
                        <span>{line.label}</span>
                        <span className="tabular-nums font-medium">
                          ₱{line.amount.toLocaleString()}
                        </span>
                      </div>
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
            </div>

            <Button
              type="submit"
              className="w-full md:w-auto"
              size="lg"
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Submit Reservation"}
            </Button>
          </form>
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
              Set different packages and particulars for each selected date. Changes apply only to the specific date.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {[...selectedDates].sort().map((date) => {
              const cust = dateCustomizations[date] || { packageId: "0", particularQuantities: {} };
              return (
                <div key={date} className="rounded-lg border p-4">
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Calendar className="size-4 text-muted-foreground" />
                    {date}
                  </h4>

                  {/* Package for this date */}
                  <div className="space-y-2 mb-3">
                    <Label className="text-xs">Package for {date}</Label>
                    <Select
                      value={cust.packageId}
                      onValueChange={(v) => handleDatePackageSelect(date, v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select package" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">None</SelectItem>
                        <SelectItem value="custom">Custom — Pick Items</SelectItem>
                        <ReservationPackageSelectItems packages={packages} particulars={particulars} />
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Conditional: Package Inclusions or Particulars for this date */}
                  {isVirtualPackageId(cust.packageId) ? (
                    <ReservationVirtualPackagePanel
                      packageId={cust.packageId}
                      particulars={particulars}
                      particularQuantities={cust.particularQuantities || {}}
                      onParticularQuantitiesChange={(pq) =>
                        handleDateVirtualParticularQuantitiesChange(date, pq)
                      }
                      timeSlotId={cust.timeSlotId || form.timeSlotId}
                      venueRentalSlot={cust.venueRentalSlot}
                      onVenueRentalSlotChange={(val) =>
                        handleDateVenueRentalSlotChange(date, val)
                      }
                      compact
                    />
                  ) : isRegularPackageId(cust.packageId) ? (
                    <div className="space-y-2">
                      <Label className="text-xs">Package Inclusions for {date}</Label>
                      <div className="border rounded-lg p-3 bg-muted/20">
                        {(() => {
                          const pkg = packages.find(p => String(p.packageId) === cust.packageId);
                          if (!pkg || !pkg.inclusions || pkg.inclusions.length === 0) {
                            return <p className="text-xs text-muted-foreground">No inclusions for this package.</p>;
                          }
                          return (
                            <div className="grid gap-1 md:grid-cols-2">
                              {pkg.inclusions.map((inc, idx) => (
                                <div key={idx} className="flex items-center justify-between rounded-md border p-2">
                                  <p className="text-xs font-medium truncate">{inc.itemName}</p>
                                  <span className="text-xs text-muted-foreground shrink-0 ml-2">× {inc.quantityAvailable}</span>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Particulars for {date}</Label>
                        {Object.keys(cust.particularQuantities || {}).length > 0 && (
                          <Button type="button" variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground"
                            onClick={() => {
                              setDateCustomizations((prev) => ({
                                ...prev,
                                [date]: { ...prev[date], particularQuantities: {} },
                              }));
                            }}
                          >
                            <RotateCcw className="size-3 mr-1" />
                            Restore to Default
                          </Button>
                        )}
                      </div>
                      <div className="grid gap-2 md:grid-cols-2">
                        {filterCustomParticulars(particulars).map((p) => {
                          const qty = readParticularQuantity(
                            cust.particularQuantities,
                            p.particularId
                          );
                          const cost = p.unitCost ? Number(p.unitCost) : 0;
                          const maxQty = p.totalQuantity || 999;
                          const isBasketball = p.particularName === "Basketball Game";
                          const isAircon = p.particularName === "Aircon Compressor";
                          const basketballOptions = [
                            { value: 2, label: "Day w/o Shot Clock", price: 1000 },
                            { value: 3, label: "Day w/ Shot Clock", price: 1500 },
                            { value: 4, label: "Night w/o Shot Clock", price: 1500 },
                            { value: 5, label: "Night w/ Shot Clock", price: 2000 },
                          ];
                          const airconTiers = [
                            { qty: 4, label: "100–1K pax", price: 3200 },
                            { qty: 6, label: "1K–3K pax", price: 4800 },
                            { qty: 8, label: "4K–6K pax", price: 6400 },
                            { qty: 10, label: "7K–10K pax", price: 8000 },
                          ];
                          return (
                            <div key={p.particularId} className="flex items-center justify-between rounded-md border p-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{p.particularName}</p>
                                {cost > 0 && !isBasketball && !isAircon && (
                                  <p className="text-xs text-muted-foreground">₱{cost.toLocaleString()} / unit</p>
                                )}
                                {isAircon && (
                                  <div className="text-[10px] text-muted-foreground mt-1 space-y-0.5">
                                    {airconTiers.map((t) => (
                                      <div key={t.qty}>{t.qty} units = ₱{t.price.toLocaleString()} ({t.label})</div>
                                    ))}
                                  </div>
                                )}
                                {!isBasketball && !isAircon && (
                                  <p className="text-xs text-muted-foreground">Available: {maxQty}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {isBasketball ? (
                                  <Select
                                    value={qty > 0 ? String(qty) : ""}
                                    onValueChange={(val) => {
                                      setDateCustomizations((prev) => ({
                                        ...prev,
                                        [date]: {
                                          ...prev[date],
                                          particularQuantities: {
                                            ...(prev[date]?.particularQuantities || {}),
                                            [String(p.particularId)]: parseInt(val, 10),
                                          },
                                        },
                                      }));
                                    }}
                                  >
                                    <SelectTrigger className="w-40 text-xs h-8">
                                      <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {basketballOptions.map((opt) => (
                                        <SelectItem key={opt.value} value={String(opt.value)}>
                                          {opt.label} — ₱{opt.price.toLocaleString()}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <ParticularQuantityStepper
                                    value={qty}
                                    max={maxQty}
                                    buttonClassName="size-6"
                                    inputClassName="w-12 h-7 text-xs"
                                    onChange={(val) =>
                                      setDateCustomizations((prev) => ({
                                        ...prev,
                                        [date]: {
                                          ...prev[date],
                                          particularQuantities: {
                                            ...(prev[date]?.particularQuantities || {}),
                                            [String(p.particularId)]: val,
                                          },
                                        },
                                      }))
                                    }
                                  />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
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
