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
import { FieldError } from "@/components/ui/field-error";
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
import { Pagination } from "@/components/pagination";
import { SportsComplexDayDialog } from "@/components/sports-complex-day-dialog";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getEventColor(status) {
  if (status === "Holiday")
    return { bg: "bg-rose-600", text: "text-white" };
  if (status === "Maintenance")
    return { bg: "bg-orange-500", text: "text-white" };
  if (status === "Approved" || status === "Confirmed")
    return { bg: "bg-emerald-600", text: "text-white" };
  if (status === "Pending")
    return { bg: "bg-amber-400", text: "text-amber-950" };
  if (status === "Ongoing")
    return { bg: "bg-sky-600", text: "text-white" };
  if (status === "Completed")
    return { bg: "bg-violet-600", text: "text-white" };
  return { bg: "bg-slate-500", text: "text-white" };
}

function MonthGrid({ events, title, icon: Icon, color, venueId, onRefresh, onEventClick, onDayClick }) {
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
              className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground"
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
                    role={cell.currentMonth && onDayClick ? "button" : undefined}
                    tabIndex={cell.currentMonth && onDayClick ? 0 : undefined}
                    onClick={
                      cell.currentMonth && onDayClick
                        ? () => onDayClick(cell.dateStr)
                        : undefined
                    }
                    onKeyDown={
                      cell.currentMonth && onDayClick
                        ? (event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              onDayClick(cell.dateStr);
                            }
                          }
                        : undefined
                    }
                    className={`relative min-h-[75px] rounded-md border p-1 text-xs transition-colors ${
                      cell.currentMonth
                        ? "bg-background hover:border-foreground/20"
                        : "bg-muted/20 text-muted-foreground/60"
                    } ${isToday ? "border-blue-500 ring-1 ring-blue-500" : "border-border"}${
                      cell.currentMonth && onDayClick
                        ? " cursor-pointer hover:bg-accent/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        : ""
                    }`}
                  >
                    <div
                      className={`mb-1 flex size-5 items-center justify-center rounded-full text-xs font-medium ${
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
                            className={`truncate rounded-sm px-1 py-0.5 text-xs font-medium leading-tight cursor-pointer ${colors.bg} ${colors.text}`}
                            onClick={
                              onDayClick
                                ? undefined
                                : (event) => {
                                    event.stopPropagation();
                                    onEventClick?.(ev);
                                  }
                            }
                            title={`${ev.title}${ev.clientName ? ` - ${ev.clientName}` : ""}${ev.blockType ? ` (${ev.blockType})` : ""}`}
                          >
                            {ev.title}
                          </div>
                        );
                      })}
                      {dayEvents.length > 2 && (
                        <div className="text-xs font-medium text-muted-foreground">
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
{/* Color Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-4 pt-3 border-t text-xs text-muted-foreground">
            <div className="flex items-center gap-1"><span className="inline-block size-3 rounded-sm bg-emerald-600" /> Confirmed / Approved</div>
            <div className="flex items-center gap-1"><span className="inline-block size-3 rounded-sm bg-amber-400" /> Pending</div>
            <div className="flex items-center gap-1"><span className="inline-block size-3 rounded-sm bg-rose-600" /> Holiday</div>
            <div className="flex items-center gap-1"><span className="inline-block size-3 rounded-sm bg-orange-500" /> Maintenance</div>
          </div>
      </CardContent>
    </Card>
  );
}

/** Filter options for the "Holidays & Maintenance" list. */
const BLOCK_TYPE_FILTERS = [
  { value: "all", label: "All" },
  { value: "Holiday", label: "Holiday" },
  { value: "Maintenance", label: "Maintenance" },
];

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
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [sportsDay, setSportsDay] = useState(null);
  const [blocksPage, setBlocksPage] = useState(1);
  const [blockTypeFilter, setBlockTypeFilter] = useState("all");
  const [addingBlock, setAddingBlock] = useState(false);
  const [errors, setErrors] = useState({});

  const clearError = (...names) =>
    setErrors((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const name of names) {
        if (next[name]) {
          delete next[name];
          changed = true;
        }
      }
      return changed ? next : prev;
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
    setErrors({});
  };

  const handleAddBlock = async () => {
    if (addingBlock) return;
    const { title, blockDate, blockType, venueId, notes } = blockForm;

    const next = {};
    if (!title) next.title = "Title is required.";
    if (!blockDate) {
      next.blockDate = "Please select a date.";
    } else {
      // Validate date is not in the past
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDate = new Date(blockDate);
      selectedDate.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        next.blockDate = "Cannot set a block on a date that has already passed";
      }
    }
    if (!blockType) next.blockType = "Please select a type.";
    if (!venueId) next.venueId = "Please select a venue.";

    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    setErrors({});

    setAddingBlock(true);
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
    } finally {
      setAddingBlock(false);
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

  const blockTypeCounts = {
    all: blocks.length,
    Holiday: blocks.filter((b) => b.blockType === "Holiday").length,
    Maintenance: blocks.filter((b) => b.blockType === "Maintenance").length,
  };
  const filteredBlocks =
    blockTypeFilter === "all"
      ? blocks
      : blocks.filter((b) => b.blockType === blockTypeFilter);
  const sortedBlocks = [...filteredBlocks].sort((a, b) =>
    String(a.date).localeCompare(String(b.date))
  );
  const blocksPerPage = 10;
  const blocksTotalPages = Math.max(
    1,
    Math.ceil(sortedBlocks.length / blocksPerPage)
  );
  const safeBlocksPage = Math.min(blocksPage, blocksTotalPages);
  const pagedBlocks = sortedBlocks.slice(
    (safeBlocksPage - 1) * blocksPerPage,
    safeBlocksPage * blocksPerPage
  );
  const blockDateCounts = sortedBlocks.reduce((acc, block) => {
    const key = String(block.date).split("T")[0];
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

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
                  onChange={(e) => {
                    clearError("title");
                    setBlockForm((f) => ({ ...f, title: e.target.value }));
                  }}
                  aria-invalid={Boolean(errors.title)}
                />
                <FieldError>{errors.title}</FieldError>
              </div>
              <div className="space-y-2">
                <Label htmlFor="block-date">Date</Label>
                <Input
                  id="block-date"
                  type="date"
                  value={blockForm.blockDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => {
                    clearError("blockDate");
                    setBlockForm((f) => ({ ...f, blockDate: e.target.value }));
                  }}
                  aria-invalid={Boolean(errors.blockDate)}
                />
                <FieldError>{errors.blockDate}</FieldError>
              </div>
              <div className="space-y-2">
                <Label htmlFor="block-type">Type</Label>
                <Select
                  value={blockForm.blockType}
                  onValueChange={(value) => {
                    clearError("blockType");
                    setBlockForm((f) => ({ ...f, blockType: value }));
                  }}
                >
                  <SelectTrigger id="block-type" aria-invalid={Boolean(errors.blockType)}>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Holiday">Holiday</SelectItem>
                    <SelectItem value="Maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
                <FieldError>{errors.blockType}</FieldError>
              </div>
              <div className="space-y-2">
                <Label htmlFor="block-venue">Venue</Label>
                <Select
                  value={blockForm.venueId}
                  onValueChange={(value) => {
                    clearError("venueId");
                    setBlockForm((f) => ({ ...f, venueId: value }));
                  }}
                >
                  <SelectTrigger id="block-venue" aria-invalid={Boolean(errors.venueId)}>
                    <SelectValue placeholder="Select venue" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Cultural Center</SelectItem>
                    <SelectItem value="2">Sports Complex</SelectItem>
                    <SelectItem value="3">Both</SelectItem>
                  </SelectContent>
                </Select>
                <FieldError>{errors.venueId}</FieldError>
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
              <Button type="button" onClick={handleAddBlock} disabled={addingBlock}>
                {addingBlock ? "Adding..." : "Add Block"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

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
            onEventClick={setSelectedEvent}
          />
          <MonthGrid
            events={sports}
            title="Sports Complex"
            icon={Trophy}
            color="border-l-4 border-l-orange-500"
            venueId={2}
            onRefresh={fetchData}
            onEventClick={setSelectedEvent}
            onDayClick={setSportsDay}
          />
        </div>
      )}

      {blocks.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
            <div className="space-y-3">
              <div>
                <CardTitle className="text-lg">Holidays & Maintenance</CardTitle>
                <CardDescription>
                  Holiday and maintenance days currently set.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                {BLOCK_TYPE_FILTERS.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    size="sm"
                    variant={
                      blockTypeFilter === option.value ? "default" : "outline"
                    }
                    onClick={() => {
                      setBlockTypeFilter(option.value);
                      setBlocksPage(1);
                    }}
                  >
                    {option.label} ({blockTypeCounts[option.value]})
                  </Button>
                ))}
              </div>
            </div>
            <Badge variant="secondary" className="shrink-0">
              {filteredBlocks.length} total
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pagedBlocks.length === 0 && (
                <p className="text-muted-foreground py-6 text-center text-sm">
                  {blockTypeFilter === "all"
                    ? "No blocks set."
                    : `No ${blockTypeFilter.toLowerCase()} blocks set.`}
                </p>
              )}
              {pagedBlocks.map((block, index) => {
                const key = String(block.date).split("T")[0];
                const prevKey =
                  index > 0
                    ? String(pagedBlocks[index - 1].date).split("T")[0]
                    : null;
                return (
                  <div key={block.id} className="space-y-1">
                    {key !== prevKey && (
                      <div className="flex items-baseline justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {new Date(`${key}T00:00:00`).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {blockDateCounts[key]}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 rounded-md border bg-muted/20 px-3 py-2 text-sm">
                      <span
                        className={`size-2 shrink-0 rounded-full ${
                          block.blockType === "Holiday" ? "bg-red-500" : "bg-orange-500"
                        }`}
                      />
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {block.title}
                      </span>
                      <Badge
                        variant="outline"
                        className={`shrink-0 ${
                          block.blockType === "Holiday"
                            ? "border-red-300 text-red-700 dark:text-red-300"
                            : "border-orange-300 text-orange-700 dark:text-orange-300"
                        }`}
                      >
                        {block.blockType}
                      </Badge>
                      <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                        {block.venueId === 1
                          ? "Cultural Center"
                          : block.venueId === 2
                            ? "Sports Complex"
                            : block.venue}
                      </span>
                      <button
                        onClick={() => handleDeleteBlock(block.id)}
                        className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
                        title="Remove block"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <Pagination
              page={safeBlocksPage}
              pageSize={blocksPerPage}
              total={sortedBlocks.length}
              onPageChange={setBlocksPage}
              itemLabel="blocks"
              className="pr-1"
            />
          </CardContent>
        </Card>
      )}

      {/* Event Detail Dialog */}
      <Dialog open={selectedEvent !== null} onOpenChange={(open) => { if (!open) setSelectedEvent(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedEvent?.type === "event" ? "Reservation Details" : "Block Details"}
            </DialogTitle>
            <DialogDescription>
              {selectedEvent?.type === "event"
                ? `Reservation #${selectedEvent?.reservationId ?? selectedEvent?.id?.replace("RES-", "").split("-")[0]}`
                : selectedEvent?.title}
            </DialogDescription>
          </DialogHeader>
          {selectedEvent?.type === "event" ? (
            <div className="space-y-4 py-2">
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
                  {selectedEvent.eventDates?.length > 1 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      All reserved days: {selectedEvent.eventDates.join(", ")}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Time</Label>
                  <p className="text-sm font-medium">{selectedEvent.start} — {selectedEvent.end}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Venue</Label>
                  <p className="text-sm font-medium">{selectedEvent.venue}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Package</Label>
                  <p className="text-sm font-medium">{selectedEvent.packageName || "None"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Reservation Status</Label>
                  <Badge variant="outline" className={`border-transparent ${getEventColor(selectedEvent.status).bg} ${getEventColor(selectedEvent.status).text}`}>
                    {selectedEvent.status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Booking Status</Label>
                  <p className="text-sm font-medium">{selectedEvent.bookingStatus}</p>
                </div>
              </div>

              <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Facilities
                  </p>
                  {selectedEvent.facilities?.length > 0 ? (
                    <ul className="space-y-1">
                      {selectedEvent.facilities.map((name, i) => (
                        <li key={`${name}-${i}`} className="flex items-center gap-2 text-sm">
                          <span className="size-1.5 shrink-0 rounded-full bg-foreground/50" />
                          {name}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">None</p>
                  )}
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Particulars
                  </p>
                  {selectedEvent.particulars?.length > 0 ? (
                    <ul className="space-y-1">
                      {selectedEvent.particulars.map((p, i) => (
                        <li key={`${p.name}-${i}`} className="flex items-center justify-between gap-2 text-sm">
                          <span className="min-w-0 truncate">{p.name}</span>
                          {p.quantity > 1 && (
                            <span className="shrink-0 text-xs text-muted-foreground">×{p.quantity}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">None</p>
                  )}
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
                    {selectedEvent?.blockType || selectedEvent?.status}
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
            {selectedEvent?.type === "block" && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  handleDeleteBlock(selectedEvent.id);
                  setSelectedEvent(null);
                }}
              >
                <Trash2 className="mr-2 size-4" />
                Remove
              </Button>
            )}
            <Button type="button" onClick={() => setSelectedEvent(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SportsComplexDayDialog
        date={sportsDay}
        open={!!sportsDay}
        onOpenChange={(open) => {
          if (!open) setSportsDay(null);
        }}
      />
    </div>
  );
}