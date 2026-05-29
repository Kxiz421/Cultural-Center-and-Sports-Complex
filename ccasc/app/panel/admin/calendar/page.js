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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Trophy,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getEventColor(status, type) {
  if (status === "Holiday")
    return { bg: "bg-red-100 dark:bg-red-900/40", text: "text-red-800 dark:text-red-300" };
  if (status === "Maintenance")
    return { bg: "bg-orange-100 dark:bg-orange-900/40", text: "text-orange-800 dark:text-orange-300" };
  if (status === "Approved" || status === "Confirmed")
    return { bg: "bg-green-100 dark:bg-green-900/40", text: "text-green-800 dark:text-green-300" };
  if (status === "Pending")
    return { bg: "bg-yellow-100 dark:bg-yellow-900/40", text: "text-yellow-800 dark:text-yellow-300" };
  if (status === "Declined" || status === "Cancelled")
    return { bg: "bg-red-100 dark:bg-red-900/40", text: "text-red-800 dark:text-red-300" };
  return { bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-700 dark:text-slate-300" };
}

function MonthGrid({ events, title, icon: Icon, color, venueId, onRefresh }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const lastDayOfPrevMonth = new Date(year, month, 0).getDate();

  // Group events by date (YYYY-MM-DD)
  const eventsByDate = {};
  events.forEach((event) => {
    const datePart = event.date.split("T")[0];
    if (!eventsByDate[datePart]) eventsByDate[datePart] = [];
    eventsByDate[datePart].push(event);
  });

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // Build calendar grid (max 6 weeks)
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
      <CardHeader className={`border-b pb-3 ${color}`}>
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-background">
            <Icon className="size-5" />
          </div>
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription>
              {events.length} event{events.length !== 1 ? "s" : ""} scheduled
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {/* Month navigation */}
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

        {/* Day-of-week headers */}
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

        {/* Calendar grid */}
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
                        const colors = getEventColor(ev.status, ev.blockType);
                        return (
                          <div
                            key={ev.id}
                            className={`truncate rounded-sm px-1 py-0.5 text-[10px] font-medium leading-tight ${colors.bg} ${colors.text}`}
                            title={`${ev.title}${ev.clientName ? ` - ${ev.clientName}` : ""}${ev.blockType ? ` (${ev.blockType})` : ""}`}
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

export default function CalendarPage() {
  const [cultural, setCultural] = useState([]);
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [blocks, setBlocks] = useState([]);
  const [blockForm, setBlockForm] = useState({
    title: "",
    blockDate: "",
    blockType: null,
    venueId: null,
    notes: "",
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [calRes, blocksRes] = await Promise.all([
          fetch("/api/calendar"),
          fetch("/api/calendar/blocks"),
        ]);
        const calData = await calRes.json();
        const blocksData = await blocksRes.json();
        setCultural(calData.cultural || []);
        setSports(calData.sports || []);
        setBlocks(blocksData);
      } catch (err) {
        console.error("Failed to load calendar data:", err);
        toast.error("Failed to load calendar data");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);
  
  const fetchData = async () => {
    try {
      const [calRes, blocksRes] = await Promise.all([
        fetch("/api/calendar"),
        fetch("/api/calendar/blocks"),
      ]);
      const calData = await calRes.json();
      const blocksData = await blocksRes.json();
      setCultural(calData.cultural || []);
      setSports(calData.sports || []);
      setBlocks(blocksData);
    } catch (err) {
      console.error("Failed to load calendar data:", err);
      toast.error("Failed to load calendar data");
    }
  };

  const resetBlockForm = () => {
    setBlockForm({
      title: "",
      blockDate: "",
      blockType: null,
      venueId: null,
      notes: "",
    });
  };

  const handleAddBlock = async () => {
    const { title, blockDate, blockType, venueId, notes } = blockForm;

    if (!title || !blockDate || !blockType || !venueId) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Validate date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(blockDate);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      toast.error("Cannot set a block on a date that has already passed");
      return;
    }

    try {
      const res = await fetch("/api/calendar/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, blockDate, blockType, venueId: parseInt(venueId, 10), notes: notes || null }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to add block");
      }

      toast.success(`${blockType} added successfully`);
      resetBlockForm();
      setAddOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteBlock = async (blockId) => {
    try {
      const res = await fetch("/api/calendar/blocks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockId }),
      });

      if (!res.ok) throw new Error("Failed to delete block");

      toast.success("Block removed successfully");
      fetchData();
    } catch (err) {
      toast.error("Failed to delete block");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Facility Calendar
          </h2>
          <p className="text-muted-foreground text-sm">
            Monthly calendar view of all events, bookings, and schedules across both venues.
          </p>
        </div>
        <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) resetBlockForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 size-4" />
              Add Holiday / Maintenance
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Block Date</DialogTitle>
              <DialogDescription>
                Block a date for a holiday or maintenance. The selected date must be today or later.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="block-title">Title</Label>
                <Input
                  id="block-title"
                  placeholder="e.g. Independence Day"
                  value={blockForm.title}
                  onChange={(e) => setBlockForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="block-date">Date</Label>
                <Input
                  id="block-date"
                  type="date"
                  value={blockForm.blockDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setBlockForm((f) => ({ ...f, blockDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="block-type">Type</Label>
                <Select
                  value={blockForm.blockType}
                  onValueChange={(value) => setBlockForm((f) => ({ ...f, blockType: value }))}
                >
                  <SelectTrigger id="block-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Holiday">Holiday</SelectItem>
                    <SelectItem value="Maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="block-venue">Venue</Label>
                <Select
                  value={blockForm.venueId}
                  onValueChange={(value) => setBlockForm((f) => ({ ...f, venueId: value }))}
                >
                  <SelectTrigger id="block-venue">
                    <SelectValue placeholder="Select venue" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Cultural Center</SelectItem>
                    <SelectItem value="2">Sports Complex</SelectItem>
                    <SelectItem value="3">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="block-notes">Notes (optional)</Label>
                <Input
                  id="block-notes"
                  placeholder="Any additional notes..."
                  value={blockForm.notes}
                  onChange={(e) => setBlockForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setAddOpen(false); resetBlockForm(); }}>
                Cancel
              </Button>
              <Button type="button" onClick={handleAddBlock}>
                Add Block
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Blocks list */}
      {blocks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upcoming Blocks</CardTitle>
            <CardDescription>
              Holidays and maintenance days currently set.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {blocks.map((block) => (
                <div
                  key={block.id}
                  className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${
                    block.blockType === "Holiday"
                      ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                      : "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
                  }`}
                >
                  <span>{block.title}</span>
                  <span className="opacity-70">—</span>
                  <span>{new Date(block.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  <span className="opacity-70">({block.venue})</span>
                  <button
                    onClick={() => handleDeleteBlock(block.id)}
                    className="ml-1 hover:text-foreground transition-colors"
                    title="Remove block"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-[400px] w-full" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-[400px] w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <MonthGrid
            events={cultural}
            title="Cultural Center"
            icon={CalendarDays}
            color="border-l-4 border-l-blue-500"
            venueId={1}
            onRefresh={fetchData}
          />
          <MonthGrid
            events={sports}
            title="Sports Complex"
            icon={Trophy}
            color="border-l-4 border-l-orange-500"
            venueId={2}
            onRefresh={fetchData}
          />
        </div>
      )}
    </div>
  );
}