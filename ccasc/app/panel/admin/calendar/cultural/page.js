"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MOCK_CALENDAR_EVENTS_CULTURAL } from "@/lib/data/admin-mock";
import { CalendarClock } from "lucide-react";

function typeVariant(type) {
  if (type === "maintenance") return "secondary";
  if (type === "holiday") return "outline";
  return "default";
}

export default function CulturalCalendarPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Cultural calendar
          </h2>
          <p className="text-muted-foreground text-sm">
            Confirmed programs, maintenance blocks, and holidays — color-coded
            labels (demo).
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">
              <CalendarClock className="mr-2 size-4" />
              Add maintenance / holiday
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule block</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input placeholder="e.g. Lighting maintenance" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Input placeholder="maintenance | holiday" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button">Save block</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Legend label="Confirmed event" variant="default" />
        <Legend label="Maintenance" variant="secondary" />
        <Legend label="Holiday / blackout" variant="outline" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>March 2026 — Cultural Center</CardTitle>
          <CardDescription>
            Example agenda rows; integrate with your scheduling API for conflict
            detection.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {MOCK_CALENDAR_EVENTS_CULTURAL.sort((a, b) =>
            a.date.localeCompare(b.date)
          ).map((ev) => (
            <div
              key={ev.id}
              className="flex flex-col gap-2 rounded-lg border p-3 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={typeVariant(ev.type)}>{ev.type}</Badge>
                  <span className="font-medium">{ev.title}</span>
                </div>
                <p className="text-muted-foreground text-sm">{ev.venue}</p>
              </div>
              <div className="text-muted-foreground text-sm md:text-right">
                <div>{ev.date}</div>
                <div>
                  {ev.start} – {ev.end}
                </div>
                <Badge variant="outline" className="mt-1">
                  {ev.status}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Legend({ label, variant }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Badge variant={variant}>Sample</Badge>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}
