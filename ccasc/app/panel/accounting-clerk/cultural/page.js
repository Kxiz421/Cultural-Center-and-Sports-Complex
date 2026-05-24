"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MOCK_CALENDAR_EVENTS_CULTURAL } from "@/lib/data/admin-mock";

function typeVariant(type) {
  if (type === "maintenance") return "secondary";
  if (type === "holiday") return "outline";
  return "default";
}

export default function AccountingCulturalCalendarPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Cultural Calendar
        </h2>
        <p className="text-muted-foreground text-sm">
          View scheduled events, upcoming and completed activities, available
          time slots, and color-coded maintenance periods and holidays.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="default">Sample</Badge>
          <span className="text-muted-foreground">Confirmed event</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="secondary">Sample</Badge>
          <span className="text-muted-foreground">Maintenance</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="outline">Sample</Badge>
          <span className="text-muted-foreground">Holiday / blackout</span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>March 2026 — Cultural Center</CardTitle>
          <CardDescription>
            Upcoming and completed activities with available time slots.
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