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
import { Calendar, Clock, Building2, Package, ChevronLeft, ChevronRight, Plus, Minus, Trash2, Printer, Info } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

// Helper to get min date (7 days from today)
function getMinDate() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split("T")[0];
}

export default function ClientReservationsPage() {
  const [form, setForm] = React.useState({
    venueId: "",
    eventType: "",
    timeSlotId: "",
    packageId: "",
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
  const [lastDownPayment, setLastDownPayment] = React.useState(0);
  const [lastDeposit, setLastDeposit] = React.useState(0);
  const [lastDownPaymentDeadline, setLastDownPaymentDeadline] = React.useState("");
  const [lastBalanceDeadline, setLastBalanceDeadline] = React.useState("");

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

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handlePackageSelect = (packageId) => {
    if (packageId && packageId !== "0") {
      const selectedPkg = packages.find(p => String(p.packageId) === packageId);
      if (selectedPkg) {
        setForm(prev => ({ ...prev, packageId, timeSlotId: String(selectedPkg.timeSlotId) }));
        return;
      }
    }
    setForm(prev => ({ ...prev, packageId }));
  };

  const toggleDate = (dateStr) => {
    if (!availability[dateStr]?.available) return;
    // Also check 7-day minimum
    const minDate = getMinDate();
    if (dateStr < minDate) {
      toast.error(`Reservations must be at least 7 days in advance. Earliest available date is ${minDate}.`);
      return;
    }
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

  const updateParticularQty = (particularId, delta) => {
    setParticularQuantities((prev) => {
      const current = prev[particularId] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [particularId]: next };
    });
  };

  // Calculate total
  const calculateTotal = () => {
    let total = 0;
    const numDays = selectedDates.size || 1;

    // Package rate
    if (form.packageId && form.packageId !== "0") {
      const pkg = packages.find((p) => String(p.packageId) === form.packageId);
      if (pkg) {
        const rate = form.timeSlotId === "1"
          ? Number(pkg.dayRate || 0)
          : Number(pkg.nightRate || 0);
        total += rate * numDays;
      }
    }

    // Particulars
    for (const [partId, qty] of Object.entries(particularQuantities)) {
      if (qty > 0) {
        const part = particulars.find((p) => String(p.particularId) === partId);
        if (part && part.unitCost) {
          total += Number(part.unitCost) * qty;
        }
      }
    }

    return total;
  };

  const calculatePayments = () => {
    const total = calculateTotal();
    return {
      total,
      downPayment: total * 0.5,
      deposit: total * 0.1,
      balance: total * 0.4,
    };
  };

  const payments = calculatePayments();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const clientId = localStorage.getItem("user_id")?.replace("CLT-", "");
    if (!clientId) {
      toast.error("Please log in first");
      return;
    }

    if (!form.venueId || !form.eventType || !form.timeSlotId) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (selectedDates.size === 0) {
      toast.error("Please select at least one date");
      return;
    }

    // Validate all selected dates against 7-day rule
    const minDate = getMinDate();
    for (const dateStr of selectedDates) {
      if (dateStr < minDate) {
        toast.error(`All selected dates must be at least 7 days from today. Earliest available date is ${minDate}.`);
        return;
      }
    }

    const sortedDates = [...selectedDates].sort();
    const primaryDate = sortedDates[0];

    const selectedParticulars = Object.entries(particularQuantities)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => ({ particularId: parseInt(id, 10), quantity: qty }));

    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venueId: form.venueId,
          eventType: form.eventType,
          eventDate: primaryDate,
          eventDates: sortedDates,
          timeSlotId: form.timeSlotId,
          packageId: form.packageId || null,
          clientId: parseInt(clientId, 10),
          notes: form.notes || null,
          particulars: selectedParticulars,
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
      setLastDownPayment(data.requiredDownPayment || (data.totalAmount * 0.5) || 0);
      setLastDeposit(data.requiredDeposit || (data.totalAmount * 0.1) || 0);
      setLastDownPaymentDeadline(data.downPaymentDeadline || "");
      setLastBalanceDeadline(data.balanceDeadline || "");
      toast.success(`Reservation ${data.id} created! Total: ₱${Number(data.totalAmount || 0).toLocaleString()}`);
      setForm({
        venueId: "",
        eventType: "",
        timeSlotId: "",
        packageId: "",
        notes: "",
      });
      setSelectedDates(new Set());
      setParticularQuantities({});
    } catch (err) {
      toast.error(err.message);
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
    const minDate = getMinDate();

    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(year, month, d);
      const key = dt.toISOString().split("T")[0];
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
            // Also block dates within 7-day window
            const withinSevenDays = day.key < minDate;

            return (
              <button
                key={day.key}
                type="button"
                disabled={!isAvailable || withinSevenDays}
                onClick={() => toggleDate(day.key)}
                className={`
                  py-2 rounded-md text-sm transition-colors
                  ${isSelected ? "bg-primary text-white font-semibold" : ""}
                  ${isAvailable && !isSelected && !withinSevenDays ? "hover:bg-primary/10 cursor-pointer" : ""}
                  ${isBlocked || isPast || withinSevenDays ? "text-muted-foreground/30 line-through cursor-not-allowed" : ""}
                  ${!isBlocked && !isPast && !isSelected && !withinSevenDays ? "text-foreground" : ""}
                `}
                title={
                  withinSevenDays ? "Must be at least 7 days from today" :
                  isBlocked ? (avail?.reason || "Unavailable") : day.key
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

  const total = calculateTotal();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">New Reservation</h2>
        <p className="text-muted-foreground text-sm">
          Fill in the details below to create a new reservation request. Reservations must be at least 7 days in advance.
        </p>
      </div>

      {/* Payment Policy Notice */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="size-5 text-amber-600 mt-0.5 shrink-0" />
            <div className="text-sm text-amber-800">
              <p className="font-semibold mb-1">Payment Policy</p>
              <ul className="list-disc pl-4 space-y-1">
                <li><strong>7-day advance booking</strong> required</li>
                <li><strong>50% Down Payment</strong> + <strong>10% Deposit</strong> (total 60%) due within the 7-day window</li>
                <li>10% deposit covers damages and extended time</li>
                <li>Remaining <strong>40% balance</strong> due <strong>2 days before</strong> the event</li>
                <li>Reservation appears on calendar only after down payment + deposit are received</li>
                <li>Cancellations <strong>30+ days</strong> before event = refundable. Less than 30 days = forfeiture of payments</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

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
                <Select value={form.timeSlotId} onValueChange={(v) => handleChange("timeSlotId", v)}>
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
                    {packages
                      .filter(p => p.statusId === 1)
                      .map((pkg) => (
                      <SelectItem key={pkg.packageId} value={String(pkg.packageId)}>
                        {pkg.packageName} — {pkg.timeSlot} {pkg.dayRate ? `(Day: ₱${Number(pkg.dayRate).toLocaleString()})` : ""}{pkg.nightRate ? `(Night: ₱${Number(pkg.nightRate).toLocaleString()})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date Picker - Calendar Grid */}
            <div className="space-y-2">
              <Label>Select Dates <span className="text-red-500">*</span></Label>
              <p className="text-xs text-muted-foreground">Dates must be at least 7 days from today. Click on available dates to select them.</p>
              {form.venueId ? renderCalendar() : (
                <p className="text-sm text-muted-foreground py-4">Please select a venue first to see available dates.</p>
              )}
            </div>

            {/* Particulars Selector */}
            <div className="space-y-2">
              <Label>Additional Services / Particulars</Label>
              <p className="text-xs text-muted-foreground">Select the quantity for each service you need.</p>
              <div className="space-y-2 border rounded-lg p-4">
                {particulars.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No particulars available.</p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                      {particulars.map((p) => {
                      const qty = particularQuantities[p.particularId] || 0;
                      const cost = p.unitCost ? Number(p.unitCost) : 0;
                      const maxQty = p.totalQuantity || 999;
                      return (
                        <div key={p.particularId} className="flex items-center justify-between rounded-md border p-3">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{p.particularName}</p>
                            {cost > 0 && (
                              <p className="text-xs text-muted-foreground">₱{cost.toLocaleString()} / unit</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Available: {maxQty}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="size-7"
                              onClick={() => updateParticularQty(p.particularId, -1)}
                              disabled={qty <= 0}
                            >
                              <Minus className="size-3" />
                            </Button>
                            <input
                              type="number"
                              min={0}
                              max={maxQty}
                              value={qty}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (isNaN(val) || val < 0) {
                                  setParticularQuantities((prev) => ({ ...prev, [p.particularId]: 0 }));
                                } else if (val > maxQty) {
                                  setParticularQuantities((prev) => ({ ...prev, [p.particularId]: maxQty }));
                                } else {
                                  setParticularQuantities((prev) => ({ ...prev, [p.particularId]: val }));
                                }
                              }}
                              className="w-14 text-center text-sm border rounded-md py-1 px-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="size-7"
                              onClick={() => updateParticularQty(p.particularId, 1)}
                              disabled={qty >= maxQty}
                            >
                              <Plus className="size-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

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
                {form.packageId && form.packageId !== "0" && (
                  <div className="flex justify-between">
                    <span>Package Rate × {selectedDates.size || 1} day(s)</span>
                    <span className="font-medium tabular-nums">
                      ₱{(
                        (form.timeSlotId === "1"
                          ? Number(packages.find(p => String(p.packageId) === form.packageId)?.dayRate || 0)
                          : Number(packages.find(p => String(p.packageId) === form.packageId)?.nightRate || 0))
                        * (selectedDates.size || 1)
                      ).toLocaleString()}
                    </span>
                  </div>
                )}
                {Object.entries(particularQuantities).filter(([, q]) => q > 0).map(([id, qty]) => {
                  const p = particulars.find(pp => String(pp.particularId) === id);
                  if (!p) return null;
                  return (
                    <div key={id} className="flex justify-between">
                      <span>{p.particularName} × {qty}</span>
                      <span className="font-medium tabular-nums">
                        ₱{(Number(p.unitCost || 0) * qty).toLocaleString()}
                      </span>
                    </div>
                  );
                })}
                <Separator />
                <div className="flex justify-between text-base font-bold">
                  <span>Total</span>
                  <span className="tabular-nums">₱{total.toLocaleString()}</span>
                </div>

                {/* Payment Schedule */}
                {total > 0 && (
                  <>
                    <Separator className="border-amber-200" />
                    <div className="bg-amber-50 rounded-md p-3 space-y-1">
                      <p className="font-semibold text-amber-800 text-xs">Required Payment Schedule</p>
                      <div className="flex justify-between text-amber-700">
                        <span>50% Down Payment</span>
                        <span className="font-medium">₱{payments.downPayment.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-amber-700">
                        <span>10% Deposit (Damages/Extension)</span>
                        <span className="font-medium">₱{payments.deposit.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-amber-700">
                        <span>40% Balance (due 2 days before event)</span>
                        <span className="font-medium">₱{payments.balance.toLocaleString()}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <Button type="submit" className="w-full md:w-auto" size="lg">
              Submit Reservation
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Success Dialog with Order of Payment */}
      <Dialog open={!!lastReservationId} onOpenChange={() => setLastReservationId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reservation Submitted!</DialogTitle>
            <DialogDescription>
              Your reservation has been created successfully. Review the payment schedule below.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <p className="text-sm text-muted-foreground">
              Reference: <span className="font-medium text-foreground">{lastReservationId}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Total Amount: <span className="font-bold text-foreground">₱{lastTotalAmount.toLocaleString()}</span>
            </p>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="font-semibold text-amber-800 text-sm mb-2">Payment Deadlines</p>
              <div className="space-y-1 text-sm text-amber-700">
                <div className="flex justify-between">
                  <span>50% Down Payment (₱{(lastTotalAmount * 0.5).toLocaleString()})</span>
                </div>
                <div className="flex justify-between">
                  <span>10% Deposit (₱{(lastTotalAmount * 0.1).toLocaleString()})</span>
                </div>
                <div className="flex justify-between text-amber-800 font-medium">
                  <span>Total Due: ₱{(lastTotalAmount * 0.6).toLocaleString()}</span>
                </div>
                {lastDownPaymentDeadline && (
                  <p className="text-xs text-amber-600 mt-1">Due by: {lastDownPaymentDeadline}</p>
                )}
                {lastBalanceDeadline && (
                  <p className="text-xs text-amber-600">Balance due by: {lastBalanceDeadline}</p>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Your reservation will be visible on the calendar once the 50% down payment and 10% deposit are received.
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