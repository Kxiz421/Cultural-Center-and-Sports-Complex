"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatPhp } from "@/lib/utils";
import { Plus, Building2, Trophy, CalendarDays } from "lucide-react";

function FacilityTable({ facilities, title, icon: Icon, color }) {
  return (
    <Card className="flex flex-col">
      <CardHeader className={`border-b pb-3 ${color}`}>
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-background">
            <Icon className="size-5" />
          </div>
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription>
              {facilities.length} venue{facilities.length !== 1 ? "s" : ""} available
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Facility</TableHead>
              <TableHead>Rate / hr</TableHead>
              <TableHead>Rate / day</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {facilities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                  No facilities in this venue
                </TableCell>
              </TableRow>
            ) : (
              facilities.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.name}</TableCell>
                  <TableCell className="tabular-nums">
                    {formatPhp(f.rateHourly)}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatPhp(f.rateDaily)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        f.availability === "Available" ? "outline" : "secondary"
                      }
                    >
                      {f.availability}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchFacilities() {
      try {
        const res = await fetch("/api/facilities");
        const data = await res.json();
        setFacilities(data);
      } catch (err) {
        console.error("Failed to load facilities:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchFacilities();
  }, []);

  const culturalFacilities = facilities.filter((f) => f.venueId === 1);
  const sportsFacilities = facilities.filter((f) => f.venueId === 2);

  const handleAddFacility = async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    try {
      const response = await fetch("/api/facilities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.get("name"),
          description: formData.get("description"),
          venueId: formData.get("venueId"),
          rateId: formData.get("rateId"),
          statusId: formData.get("statusId"),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create facility");
      }

      const newFacility = await response.json();
      setFacilities((prev) => [...prev, newFacility]);
      form.reset();
      router.refresh();
    } catch (error) {
      console.error("Error creating facility:", error);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Facility Management
          </h2>
          <p className="text-muted-foreground text-sm">
            Venue facilities across Cultural Center and Sports Complex — side by side.
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 size-4" />
              Add facility
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>New venue</DialogTitle>
              <DialogDescription>
                Capture rental profile for agency-facing calendars (demo only).
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddFacility}>
              <div className="grid gap-3 py-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Venue name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="e.g. Senator Gymnasium Annex"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    rows={3}
                    placeholder="Amenities, floor surface, AV…"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="venueId">Venue</Label>
                  <Select name="venueId" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select venue" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Cultural Center</SelectItem>
                      <SelectItem value="2">Sports Complex</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rateId">Rate</Label>
                  <Select name="rateId" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select rate" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Standard</SelectItem>
                      <SelectItem value="2">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="statusId">Status</Label>
                  <Select name="statusId" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Available</SelectItem>
                      <SelectItem value="2">Unavailable</SelectItem>
                      <SelectItem value="3">Under Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => document.querySelector("form").reset()}>
                  Cancel
                </Button>
                <Button type="submit">Save venue</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Loading facilities...</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Loading facilities...</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <FacilityTable
            facilities={culturalFacilities}
            title="Cultural Center"
            icon={Building2}
            color="border-l-4 border-l-blue-500"
          />
          <FacilityTable
            facilities={sportsFacilities}
            title="Sports Complex"
            icon={Trophy}
            color="border-l-4 border-l-orange-500"
          />
        </div>
      )}
    </div>
  );
}