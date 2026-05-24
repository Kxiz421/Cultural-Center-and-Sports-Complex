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
import {
  MOCK_PARTICULARS,
  MOCK_PACKAGES,
  formatPhp,
} from "@/lib/data/accounting-mock";

const VENUES = [
  { id: 1, name: "Cultural Center" },
  { id: 2, name: "Sports Complex" },
];

const RATE_TYPES = [
  { id: "day", name: "Day Rate (8:00 AM – 5:00 PM)" },
  { id: "night", name: "Night Rate (6:00 PM – 10:00 PM)" },
];

export default function WalkInReservationPage() {
  const [step, setStep] = React.useState(1);
  const [venue, setVenue] = React.useState("");
  const [eventDate, setEventDate] = React.useState("");
  const [rateType, setRateType] = React.useState("");
  const [selectedPackage, setSelectedPackage] = React.useState("");
  const [selectedParticulars, setSelectedParticulars] = React.useState([]);
  const [clientName, setClientName] = React.useState("");
  const [clientContact, setClientContact] = React.useState("");
  const [clientEmail, setClientEmail] = React.useState("");
  const [showOrder, setShowOrder] = React.useState(false);

  const handleAddParticular = (id) => {
    if (!selectedParticulars.find((p) => p.id === id)) {
      const particular = MOCK_PARTICULARS.find((p) => p.id === id);
      if (particular) {
        setSelectedParticulars([...selectedParticulars, { ...particular, quantity: 1 }]);
      }
    }
  };

  const handleRemoveParticular = (id) => {
    setSelectedParticulars(selectedParticulars.filter((p) => p.id !== id));
  };

  const handleQuantityChange = (id, qty) => {
    setSelectedParticulars(
      selectedParticulars.map((p) =>
        p.id === id ? { ...p, quantity: Math.max(1, parseInt(qty) || 1) } : p
      )
    );
  };

  const computeParticularsTotal = () => {
    return selectedParticulars.reduce(
      (sum, p) => sum + p.unitPrice * p.quantity,
      0
    );
  };

  const getPackageRate = () => {
    if (!selectedPackage) return 0;
    const pkg = MOCK_PACKAGES.find((p) => p.id === selectedPackage);
    if (!pkg) return 0;
    return rateType === "night" ? pkg.nightRate : pkg.dayRate;
  };

  const computeTotal = () => {
    return getPackageRate() + computeParticularsTotal();
  };

  const handleGenerateOrder = () => {
    if (!venue || !eventDate || !rateType || !clientName) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setShowOrder(true);
  };

  const handlePrintOrder = () => {
    toast.success("Order of Payment generated. Ready for printing.");
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Walk-In Reservation
        </h2>
        <p className="text-muted-foreground text-sm">
          Create reservations on behalf of walk-in clients — select dates, rates,
          particulars or packages, and generate the Order of Payment.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Client Information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Client Information</CardTitle>
            <CardDescription>
              Enter the walk-in clients details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
          </CardContent>
        </Card>

        {/* Reservation Setup */}
        <Card>
          <CardHeader>
            <CardTitle>Reservation Details</CardTitle>
            <CardDescription>
              Select venue, date, and rate type.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Venue *</Label>
              <Select value={venue} onValueChange={setVenue}>
                <SelectTrigger>
                  <SelectValue placeholder="Select venue" />
                </SelectTrigger>
                <SelectContent>
                  {VENUES.map((v) => (
                    <SelectItem key={v.id} value={v.name}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Event Date *</Label>
              <Input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Rate Type *</Label>
              <Select value={rateType} onValueChange={setRateType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select rate" />
                </SelectTrigger>
                <SelectContent>
                  {RATE_TYPES.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Package Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Event Package</CardTitle>
          <CardDescription>
            Select an optional package or customize with individual items.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Package</Label>
            <Select value={selectedPackage || "none"} onValueChange={(val) => setSelectedPackage(val === "none" ? "" : val)}>
              <SelectTrigger>
                <SelectValue placeholder="No package (custom)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No package (custom items only)</SelectItem>
                {MOCK_PACKAGES.map((pkg) => (
                  <SelectItem key={pkg.id} value={pkg.id}>
                    {pkg.name} —{" "}
                    {formatPhp(
                      rateType === "night" ? pkg.nightRate : pkg.dayRate
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedPackage && (
            <div>
              <p className="text-muted-foreground mb-2 text-xs font-medium">
                PACKAGE INCLUDES
              </p>
              <div className="flex flex-wrap gap-2">
                {MOCK_PACKAGES.find((p) => p.id === selectedPackage)?.inclusions.map(
                  (inc, i) => (
                    <Badge key={i} variant="secondary">
                      {inc}
                    </Badge>
                  )
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Particulars / Items Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Items / Particulars</CardTitle>
          <CardDescription>
            Add individual items or resources for the event.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {MOCK_PARTICULARS.map((p) => (
              <div
                key={p.id}
                className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors ${
                  selectedParticulars.find((sp) => sp.id === p.id)
                    ? "border-primary bg-primary/5"
                    : "hover:bg-accent"
                }`}
                onClick={() => {
                  selectedParticulars.find((sp) => sp.id === p.id)
                    ? handleRemoveParticular(p.id)
                    : handleAddParticular(p.id);
                }}
              >
                <div>
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {formatPhp(p.unitPrice)}/pc · {p.available} available
                  </p>
                </div>
                <Badge variant="outline">{formatPhp(p.unitPrice)}</Badge>
              </div>
            ))}
          </div>

          {selectedParticulars.length > 0 && (
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs font-medium">
                SELECTED ITEMS — SET QUANTITIES
              </p>
              {selectedParticulars.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-lg border p-2"
                >
                  <span className="flex-1 text-sm">{p.name}</span>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Qty:</Label>
                    <Input
                      type="number"
                      min={1}
                      max={p.available}
                      value={p.quantity}
                      onChange={(e) =>
                        handleQuantityChange(p.id, e.target.value)
                      }
                      className="h-8 w-20"
                    />
                  </div>
                  <span className="w-24 text-right text-sm tabular-nums">
                    {formatPhp(p.unitPrice * p.quantity)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive h-8"
                    onClick={() => handleRemoveParticular(p.id)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary & Generate */}
      <Card>
        <CardHeader>
          <CardTitle>Fee Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {selectedPackage && (
              <div className="flex items-center justify-between text-sm">
                <span>
                  Package:{" "}
                  {MOCK_PACKAGES.find((p) => p.id === selectedPackage)?.name}
                </span>
                <span className="font-medium tabular-nums">
                  {formatPhp(getPackageRate())}
                </span>
              </div>
            )}
            {selectedParticulars.length > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span>Additional Items ({selectedParticulars.length})</span>
                <span className="font-medium tabular-nums">
                  {formatPhp(computeParticularsTotal())}
                </span>
              </div>
            )}
            <Separator />
            <div className="flex items-center justify-between">
              <span className="font-semibold">Total Fee</span>
              <span className="text-xl font-bold tabular-nums text-primary">
                {formatPhp(computeTotal())}
              </span>
            </div>
          </div>

          <Button
            className="mt-6 w-full"
            size="lg"
            onClick={handleGenerateOrder}
          >
            Generate Order of Payment
          </Button>
        </CardContent>
      </Card>

      {/* Order of Payment Dialog */}
      <Dialog open={showOrder} onOpenChange={setShowOrder}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order of Payment</DialogTitle>
            <DialogDescription>
              Provincial Government of South Cotabato — Cultural Center & Sports
              Complex
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">CLIENT</p>
                  <p className="font-medium">{clientName || "Walk-in Client"}</p>
                  <p className="text-muted-foreground">
                    {clientContact || "No contact"}
                  </p>
                  <p className="text-muted-foreground">
                    {clientEmail || "No email"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground text-xs">DATE</p>
                  <p className="font-medium">{eventDate || "TBD"}</p>
                  <p className="text-muted-foreground text-xs">VENUE</p>
                  <p className="font-medium">{venue || "TBD"}</p>
                </div>
              </div>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium">Item</th>
                  <th className="pb-2 text-right font-medium">Qty</th>
                  <th className="pb-2 text-right font-medium">Rate</th>
                  <th className="pb-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {selectedPackage && (
                  <tr className="border-b">
                    <td className="py-2">
                      {MOCK_PACKAGES.find((p) => p.id === selectedPackage)?.name}{" "}
                      ({rateType === "night" ? "Night" : "Day"} Rate)
                    </td>
                    <td className="py-2 text-right">1</td>
                    <td className="py-2 text-right tabular-nums">
                      {formatPhp(getPackageRate())}
                    </td>
                    <td className="py-2 text-right tabular-nums font-medium">
                      {formatPhp(getPackageRate())}
                    </td>
                  </tr>
                )}
                {selectedParticulars.map((p) => (
                  <tr key={p.id} className="border-b">
                    <td className="py-2">{p.name}</td>
                    <td className="py-2 text-right">{p.quantity}</td>
                    <td className="py-2 text-right tabular-nums">
                      {formatPhp(p.unitPrice)}
                    </td>
                    <td className="py-2 text-right tabular-nums font-medium">
                      {formatPhp(p.unitPrice * p.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="pt-4 text-right font-semibold">
                    Total Amount Due:
                  </td>
                  <td className="pt-4 text-right text-lg font-bold tabular-nums text-primary">
                    {formatPhp(computeTotal())}
                  </td>
                </tr>
              </tfoot>
            </table>

            <div className="text-muted-foreground text-xs">
              <p>
                This Order of Payment is valid for the selected date and rate
                type. Please settle the amount at the Accounting Office.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOrder(false)}>
              Close
            </Button>
            <Button onClick={handlePrintOrder}>
              Print Order of Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}