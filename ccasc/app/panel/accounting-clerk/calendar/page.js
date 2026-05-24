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
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, CalendarDays, Trophy } from "lucide-react";

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
  return { bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-700 dark:text-slate-300" };
}

function MonthGrid({ events, title, icon: Icon, color }) {
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
                            className={`truncate rounded-sm px-1 py-0.5 text-[10px] font-medium leading-tight ${colors.bg} ${colors.text}`}
                            title={`${ev.title} - ${ev.clientName}`}
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

export default function AccountingCalendarPage() {
  const [cultural, setCultural] = useState([]);
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/calendar");
        const data = await res.json();
        setCultural(data.cultural || []);
        setSports(data.sports || []);
      } catch (err) {
        console.error("Failed to load calendar data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Facility Calendar
        </h2>
        <p className="text-muted-foreground text-sm">
          View available dates, completed events, scheduled maintenance periods,
          and holidays — to assist walk-in clients with their reservations.
        </p>
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
          />
          <MonthGrid
            events={sports}
            title="Sports Complex"
            icon={Trophy}
            color="border-l-4 border-l-orange-500"
          />
        </div>
      )}
    </div>
  );
}