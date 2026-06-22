"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Bell, FileText, History } from "lucide-react";

export default function ProvincialAgencyDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome, Provincial Agency
        </h1>
        <p className="text-muted-foreground text-sm">
          Provincial Department Agency Portal
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Facility Calendar</CardTitle>
            <Calendar className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              View facility availability and schedules
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notifications</CardTitle>
            <Bell className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              View updates and announcements
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <FileText className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Submit and track required documents
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Booking History</CardTitle>
            <History className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              View past and current bookings
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}