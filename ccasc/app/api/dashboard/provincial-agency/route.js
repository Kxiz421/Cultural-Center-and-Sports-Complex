import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");

    if (!clientId) {
      return NextResponse.json(
        { error: "clientId is required" },
        { status: 400 }
      );
    }

    const clientIdInt = parseInt(clientId, 10);

    // Count reservations
    const totalReservations = await prisma.reservation.count({
      where: { clientId: clientIdInt },
    });

    const pendingReservations = await prisma.reservation.count({
      where: { clientId: clientIdInt, reservationStatus: "Pending" },
    });

    const confirmedReservations = await prisma.reservation.count({
      where: { clientId: clientIdInt, reservationStatus: "Confirmed" },
    });

    // Count documents
    const totalDocuments = await prisma.document.count({
      where: {
        booking: {
          reservation: {
            clientId: clientIdInt,
          },
        },
      },
    });

    // Count notifications
    const unreadNotifications = await prisma.notification.count({
      where: { clientId: clientIdInt, isRead: false },
    });

    // Upcoming events
    const now = new Date();
    const upcomingReservations = await prisma.reservation.findMany({
      where: {
        clientId: clientIdInt,
        eventDate: { gte: now },
        reservationStatus: { in: ["Confirmed", "Pending"] },
      },
      include: {
        venue: { select: { venue: true } },
        timeSlot: { select: { startTime: true, endTime: true } },
      },
      orderBy: { eventDate: "asc" },
      take: 5,
    });

    return NextResponse.json({
      stats: {
        totalReservations,
        pendingReservations,
        confirmedReservations,
        totalDocuments,
        unreadNotifications,
      },
      upcomingEvents: upcomingReservations.map((r) => ({
        id: `RES-${r.reservationId}`,
        venue: r.venue.venue,
        eventType: r.eventType,
        eventDate: r.eventDate.toISOString().split("T")[0],
        timeSlot: `${r.timeSlot.startTime} - ${r.timeSlot.endTime}`,
        status: r.reservationStatus,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch provincial-agency dashboard data:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}