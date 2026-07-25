"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, CalendarDays, CheckCircle2 } from "lucide-react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getEventColor(status) {
  if (status === "Approved" || status === "Confirmed")
    return { bg: "bg-green-100 dark:bg-green-900/40", text: "text-green-800 dark:text-green-300" };
  if (status === "Pending")
    return { bg: "bg-yellow-100 dark:bg-yellow-900/40", text: "text-yellow-800 dark:text-yellow-300" };
  if (status === "Declined" || status === "Cancelled")
    return { bg: "bg-red-100 dark:bg-red-900/40", text: "text-red-800 dark:text-red-300" };
  if (status === "Ongoing")
    return { bg: "bg-blue-100 dark:bg-blue-900/40", text: "text-blue-800 dark:text-blue-300" };
  if (status === "Completed")
    return { bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-700 dark:text-slate-300" };
  return { bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-700 dark:text-slate-300" };
}

function MonthGrid({ events, onEventClick }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const lastDayOfPrevMonth = new Date(year, month, 0).getDate();

  const eventsByDate = {};
  events.forEach((event) => {
    const datePart = event.date.split("T")[0];
    if (!eventsByDate[datePart]) eventsByDate[datePart] = [];
    eventsByDate[datePart].push(event);
  });

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const weeks = [];
  let day = 1;
  let nextMonthDay = 1;

  for (let w = 0; w < 6; w++) {
    const days = [];
    for (let d = 0; d < 7; d++) {
      if (w === 0 && d < firstDayOfWeek) {
        const prevDate = lastDayOfPrevMonth - firstDayOfWeek + d + 1;
        const prevMonth = month === 0 ? 11 : month - 1;
        const prevYear = month === 0 ? year - 1 : year;
        days.push({
          day: prevDate,
          currentMonth: false,
          dateStr: `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(prevDate).padStart(2, "0")}`,
        });
      } else if (day > daysInMonth) {
        const nextMonth = month === 11 ? 0 : month + 1;
        const nextYear = month === 11 ? year + 1 : year;
        days.push({
          day: nextMonthDay++,
          currentMonth: false,
          dateStr: `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(nextMonthDay - 1).padStart(2, "0")}`,
        });
      } else {
        days.push({
          day: day,
          currentMonth: true,
          dateStr: `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        });
        day++;
      }
    }
    weeks.push(days);
    if (day > daysInMonth && nextMonthDay > 7) break;
  }

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  return (
    <Card className="flex flex-col">
      <CardHeader className="border-b border-l-4 border-l-blue-500 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-background">
            <CalendarDays className="size-5" />
          </div>
          <div>
            <CardTitle className="text-lg">Cultural Center</CardTitle>
            <CardDescription>
              {events.length} event{events.length !== 1 ? "s" : ""} scheduled
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={prevMonth}
            className="flex size-8 items-center justify-center rounded-md border border-border hover:bg-accent transition-colors"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="text-sm font-semibold">
            {MONTHS[month]} {year}
          </span>
          <button
            onClick={nextMonth}
            className="flex size-8 items-center justify-center rounded-md border border-border hover:bg-accent transition-colors"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div className="mb-2 grid grid-cols-7 gap-1">
          {DAYS_OF_WEEK.map((day) => (
            <div
              key={day}
              className="text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="space-y-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 gap-1">
              {week.map((cell, di) => {
                const dayEvents = cell.currentMonth
                  ? eventsByDate[cell.dateStr] || []
                  : [];
                const isToday = cell.dateStr === todayStr;

                return (
                  <div
                    key={di}
                    className={`relative min-h-[75px] rounded-md border p-1 text-xs transition-colors ${
                      cell.currentMonth
                        ? "bg-background hover:border-foreground/20"
                        : "bg-muted/20 text-muted-foreground/60"
                    } ${isToday ? "border-blue-500 ring-1 ring-blue-500" : "border-border"}`}
                  >
                    <div
                      className={`mb-1 flex size-5 items-center justify-center rounded-full text-[11px] font-medium ${
                        isToday
                          ? "bg-blue-500 text-white"
                          : cell.currentMonth
                            ? "text-foreground"
                            : "text-muted-foreground/60"
                      }`}
                    >
                      {cell.day}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 2).map((ev) => {
                        const colors = getEventColor(ev.status);
                        return (
                          <div
                            key={ev.id}
                            className={`truncate rounded-sm px-1 py-0.5 text-[10px] font-medium leading-tight cursor-pointer ${colors.bg} ${colors.text}`}
                            onClick={() => onEventClick?.(ev)}
                            title={`${ev.title}${ev.clientName ? ` - ${ev.clientName}` : ""}`}
                          >
                            {ev.title}
                          </div>
                        );
                      })}
                      {dayEvents.length > 2 && (
                        <div className="text-[10px] font-medium text-muted-foreground">
                          +{dayEvents.length - 2}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function CoordinatorCalendarPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/calendar");
        const data = await res.json();
        // Cultural Center events only (venueId 1 in the API)
        if (!cancelled) setEvents(data.cultural || []);
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load calendar:", err);
          toast.error("Failed to load calendar");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  async function refreshEvents() {
    try {
      const res = await fetch("/api/calendar");
      const data = await res.json();
      setEvents(data.cultural || []);
    } catch (err) {
      console.error("Failed to refresh calendar:", err);
    }
  }

  async function handleCheckOut(reservationId) {
    try {
      const res = await fetch("/api/reservations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId, eventStatus: "Completed" }),
      });
      if (!res.ok) throw new Error("Failed to check out");
      toast.success("Booking checked out successfully");
      refreshEvents();
      setSelectedEvent(null);
    } catch (err) {
      toast.error("Failed to check out booking");
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Facility Calendar</h2>
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-1">
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-[400px] w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Facility Calendar</h2>
        <p className="text-muted-foreground text-sm">
          Monthly calendar view of all Cultural Center bookings, events, and schedules.
          Click on an event to view details. Check out completed bookings.
        </p>
      </div>

      <MonthGrid events={events} onEventClick={setSelectedEvent} />

      {/* Event Detail Dialog */}
      <Dialog open={selectedEvent !== null} onOpenChange={(open) => { if (!open) setSelectedEvent(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedEvent?.type === "event" ? "Reservation Details" : "Block Details"}
            </DialogTitle>
            <DialogDescription>
              {selectedEvent?.type === "event"
                ? `Reservation #${selectedEvent?.id?.replace("RES-", "")}`
                : selectedEvent?.title}
            </DialogDescription>
          </DialogHeader>
          {selectedEvent?.type === "event" ? (
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Event Type</Label>
                  <p className="text-sm font-medium">{selectedEvent.title}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Client</Label>
                  <p className="text-sm font-medium">{selectedEvent.clientName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Date</Label>
                  <p className="text-sm font-medium">
                    {new Date(selectedEvent.date).toLocaleDateString("en-US", {
                      weekday: "long", month: "long", day: "numeric", year: "numeric",
                    })}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Time</Label>
                  <p className="text-sm font-medium">{selectedEvent.start} &mdash; {selectedEvent.end}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Venue</Label>
                  <p className="text-sm font-medium">{selectedEvent.venue}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Package</Label>
                  <p className="text-sm font-medium">{selectedEvent.packageName || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Reservation Status</Label>
                  <Badge variant="outline" className={`${getEventColor(selectedEvent.status).bg} ${getEventColor(selectedEvent.status).text}`}>
                    {selectedEvent.status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Booking Status</Label>
                  <p className="text-sm font-medium">{selectedEvent.bookingStatus || "N/A"}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label className="text-muted-foreground text-xs">Title</Label>
                  <p className="text-sm font-medium">{selectedEvent?.title}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Date</Label>
                  <p className="text-sm font-medium">
                    {selectedEvent?.date && new Date(selectedEvent.date).toLocaleDateString("en-US", {
                      weekday: "long", month: "long", day: "numeric", year: "numeric",
                    })}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Type</Label>
                  <Badge variant="outline" className={`${getEventColor(selectedEvent?.status).bg} ${getEventColor(selectedEvent?.status).text}`}>
                    {selectedEvent?.status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Venue</Label>
                  <p className="text-sm font-medium">{selectedEvent?.venue}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-muted-foreground text-xs">Notes</Label>
                  <p className="text-sm font-medium">{selectedEvent?.notes || "No notes"}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            {selectedEvent?.type === "event" && selectedEvent?.status === "Ongoing" && (
              <Button onClick={() => handleCheckOut(selectedEvent.id.replace("RES-", ""))}>
                <CheckCircle2 className="mr-2 size-4" />
                Check Out Booking
              </Button>
            )}
            <Button variant="outline" onClick={() => setSelectedEvent(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}