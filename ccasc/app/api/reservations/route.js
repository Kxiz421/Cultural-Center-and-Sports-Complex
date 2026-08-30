import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { formatDbDate, parseSqlDate } from "@/lib/utils";
import { BASKETBALL_NAME, getBasketballPrice } from "@/lib/particular-options";
import { getTimeSlotLabel, isWholeDaySlot, WHOLE_DAY_SLOT } from "@/lib/time-slots";
import {
  embedChargeBreakdownInNotes,
  extractChargeBreakdownFromNotes,
  stripChargeBreakdownFromNotes,
  normalizeChargeLines,
  sumChargeLineAmounts,
} from "@/lib/reservation-charge-breakdown";
import { getPackageBillingRate } from "@/lib/reservation-package-select";
import {
  validateAdvanceBooking,
  validateAdvanceBookingDates,
} from "@/lib/reservation-advance-booking";

function parsePackageId(value) {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
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
        additionalDates: { select: { reservationDateId: true, eventDate: true } },
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
          formatDbDate(r.eventDate),
          ...r.additionalDates.map((ad) => formatDbDate(ad.eventDate)),
        ];
        const eventDateEntries = [
          {
            date: formatDbDate(r.eventDate),
            reservationDateId: null,
            isPrimary: true,
          },
          ...r.additionalDates.map((ad) => ({
            date: formatDbDate(ad.eventDate),
            reservationDateId: ad.reservationDateId,
            isPrimary: false,
          })),
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
          eventDate: formatDbDate(r.eventDate),
          eventDates: allDates,
          eventDateEntries,
          timeSlot: `${r.timeSlot.startTime} - ${r.timeSlot.endTime}`,
          status: r.reservationStatus,
          submittedAt: r.submittedAt.toISOString(),
          bookingStatus: r.bookings[0]?.status?.status || "Unbooked",
          bookingVenueId: r.venueId || null,
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
          remarks: stripChargeBreakdownFromNotes(r.notes) || null,
          chargeLines: extractChargeBreakdownFromNotes(r.notes) || null,
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
    const { venueId, eventType, eventDate, eventDates, timeSlotId, packageId, clientId, notes, clientName, clientContact, clientEmail, particulars, chargeLines: rawChargeLines } = body;

    if (!venueId || !eventType || !eventDate || !timeSlotId || !clientId) {
      return NextResponse.json(
        { error: "Missing required fields: venueId, eventType, eventDate, timeSlotId, clientId" },
        { status: 400 }
      );
    }

    const advanceCheck = validateAdvanceBookingDates(
      [eventDate, ...(eventDates || [])].filter(Boolean)
    );
    if (!advanceCheck.valid) {
      return NextResponse.json(
        { error: advanceCheck.error, minDate: advanceCheck.minDate },
        { status: 400 }
      );
    }

    const primaryDateStr = parseSqlDate(eventDate);
    if (!primaryDateStr) {
      return NextResponse.json({ error: "Invalid event date" }, { status: 400 });
    }
    const additionalDateStrs = (eventDates || [])
      .filter((d) => d !== eventDate)
      .map((d) => parseSqlDate(d))
      .filter(Boolean);
    const allDateStrs = [primaryDateStr, ...additionalDateStrs];
    const allDates = allDateStrs.map((d) => new Date(`${d}T00:00:00.000Z`));

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
      conflictDates.add(formatDbDate(r.eventDate));
      for (const ad of r.additionalDates) conflictDates.add(formatDbDate(ad.eventDate));
    }
    for (const b of calendarBlocks) conflictDates.add(formatDbDate(b.blockDate));

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
    const packageCatalog = await prisma.package.findMany({
      select: {
        packageId: true,
        packageName: true,
        dayRate: true,
        nightRate: true,
        ledWallDayRate: true,
        ledWallNightRate: true,
        timeSlotId: true,
      },
    });
    const selectedPackage = parsePackageId(packageId)
      ? packageCatalog.find((p) => p.packageId === parsePackageId(packageId))
      : null;

    if (selectedPackage) {
      const rate = getPackageBillingRate(selectedPackage, timeSlotId, packageCatalog);
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
            let lineCost = 0;
            const unitCost = particular.inventory?.unitCost
              ? Number(particular.inventory.unitCost)
              : 0;
            const name = particular.particularName || "";

            if (name === BASKETBALL_NAME) {
              const days = Math.max(1, parseInt(p.days, 10) || 1);
              lineCost = (getBasketballPrice(p.quantity) || unitCost) * days;
            } else if (name.startsWith("Basketball Game")) {
              lineCost = unitCost;
            } else if (/venue rental/i.test(name)) {
              lineCost = unitCost * p.quantity;
            } else {
              lineCost = unitCost * p.quantity;
            }

            totalAmount += lineCost;
            particularsData.push({
              particularId: parseInt(p.particularId, 10),
              quantity: p.quantity,
            });
          }
        }
      }
    }

    const chargeLines = normalizeChargeLines(rawChargeLines);
    if (chargeLines.length > 0) {
      totalAmount = sumChargeLineAmounts(chargeLines);
    }

    const storedNotes = embedChargeBreakdownInNotes(notes, chargeLines);

    const today = new Date(); today.setHours(0,0,0,0);
    const event = new Date(`${primaryDateStr}T00:00:00.000Z`);
    const downPaymentDeadline = addDays(event, -7).toISOString().split("T")[0];
    const balanceDeadline = addDays(event, -2).toISOString().split("T")[0];
    const cancellationDeadline = addDays(event, -30).toISOString().split("T")[0];
    const isFinal = today >= addDays(event, -30);

    const parsedTimeSlotId = parseInt(timeSlotId, 10);
    if (isWholeDaySlot(parsedTimeSlotId)) {
      await prisma.timeSlot.upsert({
        where: { timeSlotId: WHOLE_DAY_SLOT.timeSlotId },
        update: {
          startTime: WHOLE_DAY_SLOT.startTime,
          endTime: WHOLE_DAY_SLOT.endTime,
        },
        create: WHOLE_DAY_SLOT,
      });
    }

    const reservation = await prisma.reservation.create({
      data: {
        venueId: parseInt(venueId, 10),
        eventType,
        eventDate: event,
        timeSlotId: parsedTimeSlotId,
        packageId: parsePackageId(packageId),
        clientId: parsedClientId,
        reservationStatus: "Pending",
        eventStatus: "Upcoming",
        totalAmount: totalAmount > 0 ? totalAmount : null,
        submittedAt: new Date(),
        notes: storedNotes,
        additionalDates: additionalDateStrs.length > 0
          ? { create: additionalDateStrs.map((d) => ({ eventDate: new Date(`${d}T00:00:00.000Z`) })) }
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
      const timeSlotName = getTimeSlotLabel(timeSlotId);

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
      { error: error.message || "Failed to create reservation" },
      { status: 500 }
    );
  }
}