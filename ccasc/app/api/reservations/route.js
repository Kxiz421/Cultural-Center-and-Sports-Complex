import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function validateAdvanceBooking(eventDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const event = new Date(eventDate);
  event.setHours(0, 0, 0, 0);
  const minDate = addDays(today, 7);
  if (event < minDate) {
    const minDateStr = minDate.toISOString().split("T")[0];
    return {
      valid: false,
      error: `Reservations must be filed at least 7 days before the event. The earliest available date is ${minDateStr}.`,
      minDate: minDateStr,
    };
  }
  return { valid: true };
}

function computePaymentStatus(totalAmount, payments) {
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amountPaid), 0);
  if (totalAmount <= 0 || totalPaid <= 0) return "Pending";
  // 10% deposit is on TOP, so total payable = base * 1.1
  const totalPayable = totalAmount * 1.1;
  if (totalPaid >= totalPayable) return "BalanceSettled";
  // 50% down payment + 10% deposit = 60% of base
  if (totalPaid >= totalAmount * 0.6) return "DepositPaid";
  if (totalPaid >= totalAmount * 0.5) return "DownPaymentPaid";
  return "IncompletePayment";
}

function computeCalendarVisible(totalAmount, payments) {
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amountPaid), 0);
  if (totalAmount <= 0) return false;
  // Show on calendar if at least 60% (50% down + 10% deposit) paid
  return (totalPaid / totalAmount) >= 0.6;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    let clientId = searchParams.get("clientId");
    if (clientId) clientId = clientId.replace("CLT-", "");
    const parsedClientId = clientId ? parseInt(clientId, 10) : null;

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
        additionalDates: { select: { eventDate: true } },
      },
      orderBy: { submittedAt: "desc" },
    });

    const distinctClientIds = [...new Set(reservations.map((r) => r.clientId))];
    const clients = await prisma.client.findMany({
      where: { clientId: { in: distinctClientIds } },
      select: { clientId: true, firstName: true, lastName: true },
    });
    const clientMap = Object.fromEntries(clients.map((c) => [c.clientId, c]));

    const formatted = reservations
      .filter((r) => clientMap[r.clientId] !== undefined)
      .map((r) => {
        const client = clientMap[r.clientId];
        const allDates = [
          r.eventDate.toISOString().split("T")[0],
          ...r.additionalDates.map((ad) => ad.eventDate.toISOString().split("T")[0]),
        ];

        const allPayments = r.bookings.flatMap(b => b.payments);
        const totalPaid = allPayments.reduce((sum, p) => sum + Number(p.amountPaid), 0);
        const totalAmount = r.totalAmount ? Number(r.totalAmount) : null;

        const event = new Date(r.eventDate);
        const downPaymentDeadline = addDays(event, -7).toISOString().split("T")[0];
        const balanceDeadline = addDays(event, -2).toISOString().split("T")[0];
        const cancellationDeadline = addDays(event, -30).toISOString().split("T")[0];

        const today = new Date(); today.setHours(0,0,0,0);
        const isFinal = today >= addDays(event, -30);
        const paymentStatus = computePaymentStatus(totalAmount || 0, allPayments);
        const calendarVisible = computeCalendarVisible(totalAmount || 0, allPayments);

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
          amountPaid: totalPaid,
          totalAmount: totalAmount,
          paymentStatus,
          calendarVisible,
          downPaymentDeadline,
          balanceDeadline,
          cancellationDeadline,
          isFinal,
          requiredDownPayment: totalAmount ? totalAmount * 0.5 : null,
          requiredDeposit: totalAmount ? totalAmount * 0.1 : null,
          remarks: r.notes || null,
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

    const advanceCheck = validateAdvanceBooking(eventDate);
    if (!advanceCheck.valid) {
      return NextResponse.json(
        { error: advanceCheck.error, minDate: advanceCheck.minDate },
        { status: 400 }
      );
    }

    const primaryDate = new Date(eventDate);
    const additionalDates = (eventDates || [])
      .filter((d) => d !== eventDate)
      .map((d) => new Date(d));
    const allDates = [primaryDate, ...additionalDates];

    // Conflict check
    const conflictingReservations = await prisma.reservation.findMany({
      where: {
        venueId: parseInt(venueId, 10),
        reservationStatus: { in: ["Pending", "Confirmed"] },
        OR: [
          { eventDate: { in: allDates } },
          { additionalDates: { some: { eventDate: { in: allDates } } } },
        ],
      },
      select: { eventDate: true, additionalDates: { select: { eventDate: true } } },
    });

    const calendarBlocks = await prisma.calendarBlock.findMany({
      where: {
        venueId: parseInt(venueId, 10),
        blockDate: { in: allDates },
      },
      select: { blockDate: true },
    });

    const conflictDates = new Set();
    for (const r of conflictingReservations) {
      conflictDates.add(r.eventDate.toISOString().split("T")[0]);
      for (const ad of r.additionalDates) conflictDates.add(ad.eventDate.toISOString().split("T")[0]);
    }
    for (const b of calendarBlocks) conflictDates.add(b.blockDate.toISOString().split("T")[0]);

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

    // Calculate total
    let totalAmount = 0;
    const selectedPackage = packageId && parseInt(packageId, 10) > 0
      ? await prisma.package.findUnique({ where: { packageId: parseInt(packageId, 10) } })
      : null;

    if (selectedPackage) {
      const rate = parseInt(timeSlotId, 10) === 1
        ? Number(selectedPackage.dayRate || 0)
        : Number(selectedPackage.nightRate || 0);
      totalAmount += rate * allDates.length;
    }

    let particularsData = [];
    if (particulars && Array.isArray(particulars) && particulars.length > 0) {
      for (const p of particulars) {
        if (p.particularId && p.quantity > 0) {
          const particular = await prisma.particular.findUnique({
            where: { particularId: parseInt(p.particularId, 10) },
            include: { inventory: { select: { unitCost: true } } },
          });
          if (particular) {
            let unitCost = particular.inventory?.unitCost ? Number(particular.inventory.unitCost) : 0;
            // Special pricing for Basketball Game (encoded quantity = option selector)
            if (particular.particularName === "Basketball Game") {
              const basketballPrices = { 2: 1000, 3: 1500, 4: 1500, 5: 2000 };
              unitCost = basketballPrices[p.quantity] || (unitCost * p.quantity);
            }
            totalAmount += unitCost;
            particularsData.push({ particularId: parseInt(p.particularId, 10), quantity: p.quantity });
          }
        }
      }
    }

    const today = new Date(); today.setHours(0,0,0,0);
    const event = new Date(eventDate);
    const downPaymentDeadline = addDays(event, -7).toISOString().split("T")[0];
    const balanceDeadline = addDays(event, -2).toISOString().split("T")[0];
    const cancellationDeadline = addDays(event, -30).toISOString().split("T")[0];
    const isFinal = today >= addDays(event, -30);

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
        additionalDates: additionalDates.length > 0
          ? { create: additionalDates.map((d) => ({ eventDate: d })) }
          : undefined,
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

    if (isWalkIn) {
      const displayName = clientName || "Walk-in Client";
      const timeSlotNames = { 1: "Day (8:00 AM - 5:00 PM)", 2: "Night (5:00 PM - 10:00 PM)" };
      const timeSlotName = timeSlotNames[parseInt(timeSlotId, 10)] || "Unknown Time Slot";

      const provincialAgencies = await prisma.client.findMany({
        where: { clientRoleId: "PROV" },
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

      await prisma.notification.create({
        data: {
          message: `Your walk-in reservation at ${venueName} for "${eventType}" on ${dateList} (${timeSlotName}) has been submitted successfully. Reference: ${reservationId}. A 50% down payment (₱${(totalAmount * 0.5 || 0).toLocaleString()}) + 10% deposit (₱${(totalAmount * 0.1 || 0).toLocaleString()}) is required by ${downPaymentDeadline}.`,
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
      requiredDownPayment: totalAmount * 0.5,
      requiredDeposit: totalAmount * 0.1,
      downPaymentDeadline,
      balanceDeadline,
      cancellationDeadline,
      isFinal,
      dates: allDates.map((d) => d.toISOString().split("T")[0]),
      particulars: reservation.reservedParticulars.map((rp) => ({
        name: rp.particular.particularName,
        quantity: rp.quantity,
      })),
      message: `Reservation created successfully. Note: A 50% down payment and 10% deposit must be paid by ${downPaymentDeadline}. Final balance must be settled by ${balanceDeadline}.`,
    }, { status: 201 });
  } catch (error) {
    console.error("Failed to create reservation:", error);
    return NextResponse.json(
      { error: "Failed to create reservation" },
      { status: 500 }
    );
  }
}