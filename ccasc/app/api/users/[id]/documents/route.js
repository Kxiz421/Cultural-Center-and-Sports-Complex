import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request, { params }) {
  try {
    const { id } = params;
    const prefix = id.split("-")[0];
    const userId = parseInt(id.split("-")[1], 10);

    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    let documents = [];

    if (prefix === "CLT") {
      // For clients: find their reservations -> bookings -> documents
      const reservations = await prisma.reservation.findMany({
        where: { clientId: userId },
        select: { reservationId: true },
      });

      const reservationIds = reservations.map((r) => r.reservationId);

      const bookings = await prisma.booking.findMany({
        where: { reservationId: { in: reservationIds } },
        select: { bookingId: true },
      });

      const bookingIds = bookings.map((b) => b.bookingId);

      documents = await prisma.document.findMany({
        where: { bookingId: { in: bookingIds } },
        include: {
          documentType: { select: { type: true } },
          booking: {
            select: {
              bookingId: true,
              reservation: {
                select: {
                  eventType: true,
                  eventDate: true,
                },
              },
            },
          },
        },
        orderBy: { submittedAt: "desc" },
      });
    } else if (prefix === "STF") {
      // For staff: find documents where staffId matches
      documents = await prisma.document.findMany({
        where: { staffId: userId },
        include: {
          documentType: { select: { type: true } },
          booking: {
            select: {
              bookingId: true,
              reservation: {
                select: {
                  eventType: true,
                  eventDate: true,
                },
              },
            },
          },
        },
        orderBy: { submittedAt: "desc" },
      });
    }

    return NextResponse.json(
      documents.map((d) => ({
        id: d.documentId,
        type: d.documentType.type,
        filePath: d.filePath,
        status: d.documentStatus,
        remarks: d.remarks,
        submittedAt: d.submittedAt,
        eventType: d.booking?.reservation?.eventType || "N/A",
        eventDate: d.booking?.reservation?.eventDate || null,
      }))
    );
  } catch (error) {
    console.error("Failed to fetch documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}