"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, ClipboardEdit, FileText, History } from "lucide-react";

export default function ClientDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Client Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Manage your reservations, documents, and bookings
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
              Check availability and schedules
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reservations</CardTitle>
            <ClipboardEdit className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Create and manage your bookings
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
              Upload and track required documents
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