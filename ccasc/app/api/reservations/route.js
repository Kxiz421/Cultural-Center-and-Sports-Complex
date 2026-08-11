import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
      let clientId = searchParams.get("clientId");

    // Strip "CLT-" prefix if present
    if (clientId) {
      clientId = clientId.replace("CLT-", "");
    }

    const parsedClientId = clientId ? parseInt(clientId, 10) : null;

    // Get reservations WITHOUT client include to avoid orphaned FK errors
    const reservations = await prisma.reservation.findMany({
      where: parsedClientId ? { clientId: parsedClientId } : {},
      include: {
        venue: { select: { venue: true } },
        timeSlot: { select: { startTime: true, endTime: true } },
        bookings: {
          include: {
            status: { select: { status: true } },
            payments: { select: { amountPaid: true } },
          },
        },
        reservedParticulars: {
          include: {
            particular: { 
              select: { particularName: true, inventory: { select: { unitCost: true } } }
            },
          },
        },
        additionalDates: {
          select: { eventDate: true },
        },
      },
      orderBy: { submittedAt: "desc" },
    });

    // Fetch valid client info separately
    const distinctClientIds = [...new Set(reservations.map((r) => r.clientId))];
    const clients = await prisma.client.findMany({
      where: { clientId: { in: distinctClientIds } },
      select: { clientId: true, firstName: true, lastName: true },
    });
    const clientMap = Object.fromEntries(clients.map((c) => [c.clientId, c]));

    const formatted = reservations
      .filter((r) => clientMap[r.clientId] !== undefined) // Skip orphaned
      .map((r) => {
        const client = clientMap[r.clientId];
        const allDates = [
          r.eventDate.toISOString().split("T")[0],
          ...r.additionalDates.map((ad) => ad.eventDate.toISOString().split("T")[0]),
        ];
        return {
          id: `RES-${r.reservationId}`,
          clientId: r.clientId,
          clientName: `${client.firstName} ${client.lastName}`,
          venueId: r.venueId,
          venue: r.venue.venue,
          eventType: r.eventType,
          eventDate: r.eventDate.toISOString().split("T")[0],
          eventDates: allDates,
          timeSlot: `${r.timeSlot.startTime} - ${r.timeSlot.endTime}`,
          status: r.reservationStatus,
          submittedAt: r.submittedAt.toISOString(),
          bookingStatus: r.bookings[0]?.status?.status || "Unbooked",
          bookingVenueId: r.bookings[0]?.venueId || null,
          amountPaid: r.bookings.reduce((sum, b) => 
            sum + b.payments.reduce((s, p) => s + Number(p.amountPaid), 0), 0),
          totalAmount: r.totalAmount ? Number(r.totalAmount) : null,
          particulars: r.reservedParticulars.map((rp) => ({
            name: rp.particular.particularName,
            quantity: rp.quantity,
            unitCost: rp.particular.inventory?.unitCost ? Number(rp.particular.inventory.unitCost) : 0,
          })),
          notes: r.notes || null,
        };
      });

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Failed to fetch reservations:", error);
    return NextResponse.json(
      { error: "Failed to fetch reservations" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { venueId, eventType, eventDate, eventDates, timeSlotId, packageId, clientId, notes, clientName, clientContact, clientEmail, particulars } = body;

    if (!venueId || !eventType || !eventDate || !timeSlotId || !clientId) {
      return NextResponse.json(
        { error: "Missing required fields: venueId, eventType, eventDate, timeSlotId, clientId" },
        { status: 400 }
      );
    }

    // Build the full list of dates including additional dates
    const primaryDate = new Date(eventDate);
    const additionalDates = (eventDates || [])
      .filter((d) => d !== eventDate) // exclude the primary date
      .map((d) => new Date(d));
    const allDates = [primaryDate, ...additionalDates];

    // CONFLICT CHECK: Check if any of the dates are already booked for this venue
    // Check against confirmed/pending reservations
    const conflictingReservations = await prisma.reservation.findMany({
      where: {
        venueId: parseInt(venueId, 10),
        reservationStatus: { in: ["Pending", "Confirmed"] },
        OR: [
          { eventDate: { in: allDates } },
          {
            additionalDates: {
              some: { eventDate: { in: allDates } },
            },
          },
        ],
      },
      select: { eventDate: true, additionalDates: { select: { eventDate: true } } },
    });

    // Check against calendar blocks
    const calendarBlocks = await prisma.calendarBlock.findMany({
      where: {
        venueId: parseInt(venueId, 10),
        blockDate: { in: allDates },
      },
      select: { blockDate: true },
    });

    // Collect all conflicting dates
    const conflictDates = new Set();
    for (const r of conflictingReservations) {
      conflictDates.add(r.eventDate.toISOString().split("T")[0]);
      for (const ad of r.additionalDates) {
        conflictDates.add(ad.eventDate.toISOString().split("T")[0]);
      }
    }
    for (const b of calendarBlocks) {
      conflictDates.add(b.blockDate.toISOString().split("T")[0]);
    }

    if (conflictDates.size > 0) {
      return NextResponse.json({
        error: `The following dates are already booked: ${[...conflictDates].join(", ")}`,
        conflictDates: [...conflictDates],
      }, { status: 409 });
    }

    const isWalkIn = notes && notes.startsWith("Walk-in client:");
    const parsedClientId = parseInt(clientId, 10);
    const venueNames = { 1: "Cultural Center", 2: "Sports Complex" };
    const venueName = venueNames[parseInt(venueId, 10)] || "Unknown Venue";

    // Calculate total amount
    let totalAmount = 0;

    // Package rate * number of days
    const selectedPackage = packageId && parseInt(packageId, 10) > 0
      ? await prisma.package.findUnique({ where: { packageId: parseInt(packageId, 10) } })
      : null;

    if (selectedPackage) {
      const rate = parseInt(timeSlotId, 10) === 1
        ? Number(selectedPackage.dayRate || 0)
        : Number(selectedPackage.nightRate || 0);
      totalAmount += rate * allDates.length;
    }

    // Particulars cost
    let particularsData = [];
    if (particulars && Array.isArray(particulars) && particulars.length > 0) {
      for (const p of particulars) {
        if (p.particularId && p.quantity > 0) {
          const particular = await prisma.particular.findUnique({
            where: { particularId: parseInt(p.particularId, 10) },
            include: { inventory: { select: { unitCost: true } } },
          });
          if (particular) {
            const unitCost = particular.inventory?.unitCost
              ? Number(particular.inventory.unitCost)
              : 0;
            totalAmount += unitCost * p.quantity;
            particularsData.push({
              particularId: parseInt(p.particularId, 10),
              quantity: p.quantity,
            });
          }
        }
      }
    }

    // Create the reservation with all dates and particulars
    const reservation = await prisma.reservation.create({
      data: {
        venueId: parseInt(venueId, 10),
        eventType,
        eventDate: primaryDate,
        timeSlotId: parseInt(timeSlotId, 10),
        packageId: packageId && parseInt(packageId, 10) > 0 ? parseInt(packageId, 10) : null,
        clientId: parsedClientId,
        reservationStatus: "Pending",
        eventStatus: "Upcoming",
        totalAmount: totalAmount > 0 ? totalAmount : null,
        submittedAt: new Date(),
        notes: notes || null,
        // Create additional dates
        additionalDates: additionalDates.length > 0
          ? { create: additionalDates.map((d) => ({ eventDate: d })) }
          : undefined,
        // Create reserved particulars
        reservedParticulars: particularsData.length > 0
          ? { create: particularsData }
          : undefined,
      },
      include: {
        additionalDates: true,
        reservedParticulars: {
          include: { particular: { select: { particularName: true } } },
        },
      },
    });

    const reservationId = `RES-${reservation.reservationId}`;

    // For walk-in reservations, send notifications
    if (isWalkIn) {
      const displayName = clientName || "Walk-in Client";
      const timeSlotNames = { 1: "Day (8:00 AM - 5:00 PM)", 2: "Night (5:00 PM - 10:00 PM)" };
      const timeSlotName = timeSlotNames[parseInt(timeSlotId, 10)] || "Unknown Time Slot";

      // 1. Notify provincial department agencies (PDA) about the new walk-in reservation
      const provincialAgencies = await prisma.client.findMany({
        where: {
          clientRoleId: "PROV",
        },
        select: { clientId: true },
      });

      const dateList = allDates.map((d) => d.toISOString().split("T")[0]).join(", ");
      const pdaNotificationMessage = `New walk-in reservation: ${displayName} booked ${venueName} for "${eventType}" on ${dateList} (${timeSlotName}).`;

      for (const agency of provincialAgencies) {
        await prisma.notification.create({
          data: {
            message: pdaNotificationMessage,
            type: "booking",
            staffId: 1,
            clientId: agency.clientId,
            sentAt: new Date(),
          },
        });
      }

      // 2. Notify the client about their new reservation
      await prisma.notification.create({
        data: {
          message: `Your walk-in reservation at ${venueName} for "${eventType}" on ${dateList} (${timeSlotName}) has been submitted successfully. Reference: ${reservationId}`,
          type: "booking",
          staffId: 1,
          clientId: parsedClientId,
          sentAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      id: reservationId,
      totalAmount,
      dates: allDates.map((d) => d.toISOString().split("T")[0]),
      particulars: reservation.reservedParticulars.map((rp) => ({
        name: rp.particular.particularName,
        quantity: rp.quantity,
      })),
      message: "Reservation created successfully",
    }, { status: 201 });
  } catch (error) {
    console.error("Failed to create reservation:", error);
    return NextResponse.json(
      { error: "Failed to create reservation" },
      { status: 500 }
    );
  }
}