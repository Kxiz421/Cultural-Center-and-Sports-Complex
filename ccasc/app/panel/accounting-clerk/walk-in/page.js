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
import { Search, UserCheck, UserPlus, Loader2, Info, Layers, Calendar, Plus, Minus, RotateCcw } from "lucide-react";

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

  const handlePackageSelect = (value) => {
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

  const updateParticularQty = (particularId, delta) => {
    setParticularQuantities((prev) => {
      const current = prev[particularId] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [particularId]: next };
    });
  };

  // Per-date customization handlers
  const handleDatePackageSelect = (date, pkgId) => {
    setDateCustomizations((prev) => ({
      ...prev,
      [date]: {
        ...prev[date],
        packageId: pkgId,
        particularQuantities: (pkgId && pkgId !== "0" && pkgId !== "custom") ? {} : (prev[date]?.particularQuantities || {}),
      },
    }));
  };

  const handleDateParticularQty = (date, particularId, delta) => {
    setDateCustomizations((prev) => {
      const current = prev[date]?.particularQuantities?.[particularId] || 0;
      const next = Math.max(0, current + delta);
      return {
        ...prev,
        [date]: {
          ...prev[date],
          particularQuantities: {
            ...(prev[date]?.particularQuantities || {}),
            [particularId]: next,
          },
        },
      };
    });
  };

  const toggleCustomizeMode = () => {
    if (!customizePerDate) {
      const initial = {};
      for (const date of selectedDates) {
        initial[date] = {
          packageId: packageId || "0",
          particularQuantities: { ...particularQuantities },
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

    setShowOrder(true);
  };

  const handleSubmitReservation = async () => {
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
      let selectedParticulars = [];
      let selectedPackageId = packageId && parseInt(packageId, 10) > 0 ? parseInt(packageId, 10) : null;

      if (customizePerDate && Object.keys(dateCustomizations).length > 0) {
        const aggregatedParticulars = {};
        for (const [date, cust] of Object.entries(dateCustomizations)) {
          if ((cust.packageId === "0" || cust.packageId === "custom" || !cust.packageId) && cust.particularQuantities) {
            for (const [partId, qty] of Object.entries(cust.particularQuantities)) {
              if (qty > 0) {
                aggregatedParticulars[partId] = (aggregatedParticulars[partId] || 0) + qty;
              }
            }
          }
        }
        selectedParticulars = Object.entries(aggregatedParticulars)
          .filter(([, qty]) => qty > 0)
          .map(([id, qty]) => ({ particularId: parseInt(id, 10), quantity: qty }));
        const sortedDates = [...selectedDates].sort();
        const firstCust = dateCustomizations[sortedDates[0]];
        if (firstCust && firstCust.packageId && firstCust.packageId !== "0" && firstCust.packageId !== "custom") {
          selectedPackageId = parseInt(firstCust.packageId, 10);
        } else {
          selectedPackageId = null;
        }
      } else {
        // Only include particulars if custom or no package
        if (packageId === "custom" || packageId === "0" || !packageId) {
          selectedParticulars = Object.entries(particularQuantities)
            .filter(([, qty]) => qty > 0)
            .map(([id, qty]) => ({ particularId: parseInt(id, 10), quantity: qty }));
        } else {
          selectedPackageId = parseInt(packageId, 10) || null;
          selectedParticulars = []; // Inclusions are free, don't send as paid particulars
        }
      }

      const sortedDates = [...selectedDates].sort();
      const primaryDate = eventDate || sortedDates[0];

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
              <Select value={timeSlotId} onValueChange={setTimeSlotId}>
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
                  {packages
                    .filter(p => p.statusId === 1)
                    .map((pkg) => (
                    <SelectItem key={pkg.packageId} value={String(pkg.packageId)}>
                      {pkg.packageName} &mdash; {pkg.timeSlot} {pkg.dayRate ? `(Day: ₱${Number(pkg.dayRate).toLocaleString()})` : ""}{pkg.nightRate ? `(Night: ₱${Number(pkg.nightRate).toLocaleString()})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
{/* Conditional: Package Inclusions or Particulars Selector */}
            <div className="space-y-2">
              {packageId && packageId !== "0" && packageId !== "custom" ? (
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
            {packageId && packageId !== "0" && (
              <div className="flex items-center justify-between text-sm">
                <span>Package</span>
                <span className="font-medium">
                  {packages.find(p => String(p.packageId) === packageId)?.packageName || "&mdash;"}
                </span>
              </div>
            )}
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
              {packageId && packageId !== "0" && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Package: {packages.find(p => String(p.packageId) === packageId)?.packageName || "&mdash;"}
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
                        {packages.filter(p => p.statusId === 1).map((pkg) => (
                          <SelectItem key={pkg.packageId} value={String(pkg.packageId)}>
                            {pkg.packageName} {pkg.dayRate ? `(Day: ₱${Number(pkg.dayRate).toLocaleString()})` : ""}{pkg.nightRate ? `(Night: ₱${Number(pkg.nightRate).toLocaleString()})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {cust.packageId && cust.packageId !== "0" && cust.packageId !== "custom" ? (
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
                        {particulars.map((p) => {
                          const qty = cust.particularQuantities?.[p.particularId] || 0;
                          const cost = p.unitCost ? Number(p.unitCost) : 0;
                          const maxQty = p.totalQuantity || 999;
                          const isBasketball = p.particularName === "Basketball Game";
                          const isAircon = p.particularName === "Aircon Compressor";
                          const basketballOptions = [
                            { value: 2, label: "Day w/o SC", price: 1000 },
                            { value: 3, label: "Day w/ SC", price: 1500 },
                            { value: 4, label: "Night w/o SC", price: 1500 },
                            { value: 5, label: "Night w/ SC", price: 2000 },
                          ];
                          return (
                            <div key={p.particularId} className="flex items-center justify-between rounded-md border p-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{p.particularName}</p>
                                {isAircon && <p className="text-[10px] text-muted-foreground">₱800 / unit</p>}
                                {!isBasketball && !isAircon && cost > 0 && <p className="text-xs text-muted-foreground">₱{cost.toLocaleString()}</p>}
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
                                          particularQuantities: { ...(prev[date]?.particularQuantities || {}), [p.particularId]: parseInt(val, 10) },
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
                                  <>
                                    <Button type="button" variant="outline" size="icon" className="size-6"
                                      onClick={() => handleDateParticularQty(date, p.particularId, -1)}
                                      disabled={qty <= 0}>
                                      <Minus className="size-3" />
                                    </Button>
                                    <span className="w-8 text-center text-xs tabular-nums">{qty}</span>
                                    <Button type="button" variant="outline" size="icon" className="size-6"
                                      onClick={() => handleDateParticularQty(date, p.particularId, 1)}
                                      disabled={qty >= maxQty}>
                                      <Plus className="size-3" />
                                    </Button>
                                  </>
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
    </div>
  );
}
