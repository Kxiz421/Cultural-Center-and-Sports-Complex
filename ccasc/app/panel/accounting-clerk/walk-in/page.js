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
import { toast } from "sonner";
import { Search, UserCheck, UserPlus, Loader2, Info, Layers, Calendar, Plus, RotateCcw } from "lucide-react";
import {
  isVirtualPackageId,
  isRegularPackageId,
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
} from "@/lib/reservation-package-select";
import { readParticularQuantity } from "@/lib/particular-options";
import {
  ReservationVirtualPackagePanel,
  ReservationPackageSelectItems,
} from "@/components/reservation-virtual-package-panel";
import { ParticularQuantityStepper } from "@/components/particular-quantity-stepper";

const VENUES = [
  { id: 1, name: "Cultural Center" },
  { id: 2, name: "Sports Complex" },
];

const TIME_SLOTS = [
  { id: 1, name: "Day (8:00 AM - 5:00 PM)" },
  { id: 2, name: "Night (5:00 PM - 10:00 PM)" },
];

export default function WalkInReservationPage() {
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

  // Per-date customization for multi-day
  const [customizePerDate, setCustomizePerDate] = React.useState(false);
  const [dateCustomizations, setDateCustomizations] = React.useState({});
  const [showCustomizeDialog, setShowCustomizeDialog] = React.useState(false);

  // Dialog and submission
  const [showOrder, setShowOrder] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [eventDates, setEventDates] = React.useState([]);
  const [selectedDates, setSelectedDates] = React.useState(new Set());

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

    if (packageId === VIRTUAL_PACKAGE_IDS.VENUE_RENTAL) {
      setVenueRentalSlot(String(value) === "1" ? "1" : "2");
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
        setTimeSlotId(String(selectedPkg.timeSlotId));
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
      nextTimeSlotId = String(selectedPkg.timeSlotId || nextTimeSlotId);
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

  const toggleCustomizeMode = () => {
    if (!customizePerDate) {
      const initial = {};
      for (const date of selectedDates) {
        initial[date] = {
          packageId: packageId || "0",
          particularQuantities: { ...particularQuantities },
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
    if (!venueId || !eventDate || !timeSlotId || !eventType) {
      toast.error("Please fill in all required fields.");
      return;
    }

    // Validate 7-day advance booking
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 7);
    const minDateStr = minDate.toISOString().split("T")[0];
    if (eventDate < minDateStr) {
      toast.error(`Reservations must be filed at least 7 days before the event. The earliest available date is ${minDateStr}.`);
      return;
    }

    // Also validate multi-day dates
    for (const date of selectedDates) {
      if (date < minDateStr) {
        toast.error(`All selected dates must be at least 7 days from today.`);
        return;
      }
    }

    if (isExistingUser && !selectedClient) {
      toast.error("Please search and select an existing user.");
      return;
    }

    if (!isExistingUser && !clientName) {
      toast.error("Please enter the walk-in client's name.");
      return;
    }

    if (isVirtualPackageId(packageId)) {
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
      const sortedDates = [...selectedDates].sort();
      const primaryDate = eventDate || sortedDates[0];

      let selectedParticulars = [];
      let selectedPackageId = parseReservationPackageId(packageId);

      if (customizePerDate && Object.keys(dateCustomizations).length > 0) {
        const aggregatedParticulars = {};
        const basketballDayCounts = {};
        for (const [, cust] of Object.entries(dateCustomizations)) {
          if (isVirtualPackageId(cust.packageId)) {
            const entries = getVirtualPackageParticulars(
              cust.packageId,
              particulars,
              cust.particularQuantities,
              cust.timeSlotId || timeSlotId,
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
        const firstCust = dateCustomizations[sortedDates[0]];
        if (firstCust && isRegularPackageId(firstCust.packageId)) {
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
          eventDates: sortedDates.length > 0 ? sortedDates : [eventDate],
          timeSlotId: parseInt(timeSlotId, 10),
          packageId: selectedPackageId,
          clientId: actualClientId,
          notes: notesStr,
          clientName: isExistingUser && selectedClient ? selectedClient.fullName : clientName,
          clientContact: isExistingUser && selectedClient ? selectedClient.contact : clientContact,
          clientEmail: isExistingUser && selectedClient ? selectedClient.email : clientEmail,
          particulars: selectedParticulars.length > 0 ? selectedParticulars : undefined,
          chargeLines: summaryLines,
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

  const summaryLines = buildReservationSummaryLines({
    particulars,
    packages,
    packageId,
    particularQuantities,
    timeSlotId,
    venueRentalSlot,
    selectedDatesCount: selectedDates.size,
    customizePerDate,
    dateCustomizations,
  });
  const total = sumReservationSummaryLines(summaryLines);

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
          </CardContent>
        </Card>

        {/* Reservation Setup */}
        <Card>
          <CardHeader>
            <CardTitle>Reservation Details</CardTitle>
            <CardDescription>
              Select venue, date, and time slot.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
              <Label>Event Date *</Label>
              <Input
                type="date"
                value={eventDate}
                min={new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Time Slot *</Label>
              <Select value={timeSlotId} onValueChange={handleTimeSlotChange}>
                <SelectTrigger>
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
            </div>
            <div className="space-y-2">
              <Label>Package</Label>
              <Select value={packageId} onValueChange={handlePackageSelect}>
                <SelectTrigger>
                  <SelectValue placeholder={packagesLoading ? "Loading packages..." : "Select package"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">None</SelectItem>
                  <SelectItem value="custom">Custom — Pick Items</SelectItem>
                  <ReservationPackageSelectItems packages={packages} particulars={particulars} />
                </SelectContent>
              </Select>
            </div>
{/* Conditional: Package Inclusions, virtual packages, or particulars */}
            <div className="space-y-2">
              {isVirtualPackageId(packageId) ? (
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
              ) : (packageId === "custom" || packageId === "0" || !packageId) ? (
                <>
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
                          const maxQty = p.totalQuantity || 999;
                          const isAircon = p.particularName === "Aircon Compressor";
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
                                {cost > 0 && <p className="text-xs text-muted-foreground">₱{cost.toLocaleString()} / unit</p>}
                                {isAircon && (
                                  <div className="text-[10px] text-muted-foreground mt-1 space-y-0.5">
                                    {airconTiers.map((t) => (
                                      <div key={t.qty}>{t.qty} units = ₱{t.price.toLocaleString()} ({t.label})</div>
                                    ))}
                                  </div>
                                )}
                                {!isAircon && <p className="text-xs text-muted-foreground">Available: {maxQty}</p>}
                              </div>
                              <div className="flex items-center gap-2">
                                <ParticularQuantityStepper
                                  value={qty}
                                  max={maxQty}
                                  onChange={(val) =>
                                    setParticularQuantities((prev) => ({
                                      ...prev,
                                      [p.particularId]: val,
                                    }))
                                  }
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>Additional Dates</Label>
              <p className="text-xs text-muted-foreground">Add multiple dates for multi-day events.</p>
              <div className="flex gap-2">
                <Input
                  type="date"
                  min={new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]}
                  value={eventDates.length > 0 ? eventDates[eventDates.length - 1] : ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val && !selectedDates.has(val) && val !== eventDate) {
                      setSelectedDates((prev) => new Set(prev).add(val));
                      setEventDates((prev) => [...prev, val]);
                      e.target.value = "";
                    }
                  }}
                  className="flex-1"
                />
                <Button type="button" variant="outline" size="sm" onClick={() => {
                  const d = new Date();
                  const key = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
                  // Add a date helper - just show the date input field
                }}>
                  <Plus className="size-4" />
                </Button>
              </div>
              {selectedDates.size > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {[...selectedDates].sort().map((d) => (
                    <Badge key={d} variant="secondary" className="text-xs">
                      {d} <button onClick={() => {
                        const next = new Set(selectedDates);
                        next.delete(d);
                        setSelectedDates(next);
                        setEventDates((prev) => prev.filter((ed) => ed !== d));
                      }} className="ml-1 hover:text-red-500">×</button>
                    </Badge>
                  ))}
                </div>
              )}
              {selectedDates.size > 0 && (
                <div className="flex items-center gap-2 pt-1">
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
                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowCustomizeDialog(true)}>
                      Edit Per-Date Details
                    </Button>
                  )}
                </div>
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
              <span>Date</span>
              <span className="font-medium">{eventDate || "&mdash;"}</span>
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
              Set different packages and particulars for each selected date.
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
                  <div className="space-y-2 mb-3">
                    <Label className="text-xs">Package for {date}</Label>
                    <Select value={cust.packageId} onValueChange={(v) => handleDatePackageSelect(date, v)}>
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

                  {isVirtualPackageId(cust.packageId) ? (
                    <ReservationVirtualPackagePanel
                      packageId={cust.packageId}
                      particulars={particulars}
                      particularQuantities={cust.particularQuantities || {}}
                      onParticularQuantitiesChange={(pq) =>
                        handleDateVirtualParticularQuantitiesChange(date, pq)
                      }
                      timeSlotId={cust.timeSlotId || timeSlotId}
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
                          const isAircon = p.particularName === "Aircon Compressor";
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
                                {cost > 0 && !isAircon && (
                                  <p className="text-xs text-muted-foreground">₱{cost.toLocaleString()} / unit</p>
                                )}
                                {isAircon && (
                                  <div className="text-[10px] text-muted-foreground mt-1 space-y-0.5">
                                    {airconTiers.map((t) => (
                                      <div key={t.qty}>{t.qty} units = ₱{t.price.toLocaleString()} ({t.label})</div>
                                    ))}
                                  </div>
                                )}
                                {!isAircon && (
                                  <p className="text-xs text-muted-foreground">Available: {maxQty}</p>
                                )}
                              </div>
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
    </div>
  );
}
