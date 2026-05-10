"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
import { MOCK_FACILITIES, formatPhp } from "@/lib/data/admin-mock";
import { Plus } from "lucide-react";

export default function FacilitiesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Facility management
          </h2>
          <p className="text-muted-foreground text-sm">
            Venues under the Cultural Center and Sports Complex — demo pricing &
            capacity.
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
            <div className="grid gap-3 py-2">
              <div className="space-y-2">
                <Label>Venue name</Label>
                <Input placeholder="e.g. Senator Gymnasium Annex" />
              </div>
              <div className="space-y-2">
                <Label>Site</Label>
                <Input placeholder="Cultural Center or Sports Complex" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea rows={3} placeholder="Amenities, floor surface, AV…" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Hourly rate (PHP)</Label>
                  <Input type="number" min={0} />
                </div>
                <div className="space-y-2">
                  <Label>Daily rate (PHP)</Label>
                  <Input type="number" min={0} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Seating capacity</Label>
                <Input type="number" min={0} />
              </div>
              <div className="space-y-2">
                <Label>Photo upload</Label>
                <Input type="file" accept="image/*" disabled />
                <p className="text-muted-foreground text-xs">
                  Hook to storage — disabled in this demo.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline">Cancel</Button>
              <Button type="button">Save venue</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Venues</CardTitle>
          <CardDescription>
            Archive by marking a venue Unavailable (maintenance /
            government-exclusive hold).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Venue</TableHead>
                <TableHead>Site</TableHead>
                <TableHead>Rates</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Availability</TableHead>
                <TableHead className="text-right">Revenue YTD</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_FACILITIES.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-mono text-xs">{f.id}</TableCell>
                  <TableCell className="font-medium">{f.name}</TableCell>
                  <TableCell>{f.site}</TableCell>
                  <TableCell className="text-sm">
                    <div>{formatPhp(f.rateHourly)} / hr</div>
                    <div className="text-muted-foreground">
                      {formatPhp(f.rateDaily)} / day
                    </div>
                  </TableCell>
                  <TableCell>{f.capacity}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        f.availability === "Available" ? "outline" : "secondary"
                      }
                    >
                      {f.availability}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPhp(f.revenueYtd)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
