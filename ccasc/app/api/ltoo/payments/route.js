import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { formatDbDate, roundMoney } from "@/lib/utils";
import { computePaymentBreakdown, getPaymentTypeMax, isPaymentTypeAllowed, isFixedPaymentAmount } from "@/lib/payment-utils";

export const dynamic = "force-dynamic";


export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const bookingsOnly = searchParams.get("bookings");

    if (bookingsOnly === "true") {
      // Fetch reservations without client include to avoid orphaned FK errors
      const reservations = await prisma.reservation.findMany({
        where: {
          reservationStatus: { notIn: ["Cancelled", "Confirmed"] },
        },
        include: {
          package: { select: { packageName: true, dayRate: true, nightRate: true } },
          venue: { select: { venue: true } },
          timeSlot: { select: { startTime: true, endTime: true } },
          additionalDates: { select: { eventDate: true } },
          reservedParticulars: {
            include: {
              particular: {
                select: { particularName: true, inventory: { select: { unitCost: true } } },
              },
            },
          },
          bookings: {
            include: {
              payments: {
                select: { amountPaid: true },
              },
            },
          },
        },
        orderBy: { reservationId: "desc" },
      });

      // Fetch valid client info separately
      const distinctClientIds = [...new Set(reservations.map((r) => r.clientId))];
      const clients = await prisma.client.findMany({
        where: { clientId: { in: distinctClientIds } },
        select: { clientId: true, firstName: true, lastName: true, clientRole: { select: { clientRoleId: true } } },
      });
      const clientMap = Object.fromEntries(clients.map((c) => [c.clientId, c]));

      const mapped = reservations
        .filter((r) => clientMap[r.clientId] !== undefined)
        .map((r) => {
          const client = clientMap[r.clientId];
          // Calculate total paid so far
          const totalPaid = r.bookings.reduce(
            (sum, b) => sum + b.payments.reduce((s, p) => s + Number(p.amountPaid), 0),
            0
          );
          // Calculate total amount from reservation
          const numDays = 1 + r.additionalDates.length;
          const pkgRate = r.package?.dayRate
            ? Number(r.package.dayRate)
            : r.package?.nightRate
              ? Number(r.package.nightRate)
              : null;
          const pkgTotal = pkgRate ? pkgRate * numDays : 0;
          const particularsTotal = r.reservedParticulars.reduce((sum, rp) => {
            let unitCost = rp.particular?.inventory?.unitCost
              ? Number(rp.particular.inventory.unitCost)
              : 0;
            // Special pricing for Basketball Game (encoded quantity = option selector)
            if (rp.particular?.particularName === "Basketball Game") {
              const basketballPrices = { 2: 1000, 3: 1500, 4: 1500, 5: 2000 };
              return sum + (basketballPrices[rp.quantity] || unitCost);
            }
            return sum + unitCost * rp.quantity;
          }, 0);
          const calculatedBase = roundMoney(pkgTotal + particularsTotal);
          const storedBase = r.totalAmount ? Number(r.totalAmount) : 0;
          const totalAmount =
            calculatedBase > 0
              ? roundMoney(Math.max(storedBase, calculatedBase))
              : storedBase;
          const breakdown = computePaymentBreakdown(totalAmount, totalPaid);

          return {
            id: r.reservationId,
            reservationId: r.reservationId,
            clientId: r.clientId,
            clientName: `${client.firstName} ${client.lastName}`,
            clientType: client.clientRole?.clientRoleId === "PROV" ? "provincial-agency" : "client",
            eventType: r.eventType,
            eventDate: r.eventDate ? new Date(r.eventDate).toISOString().split("T")[0] : "",
            eventDates: [
              r.eventDate.toISOString().split("T")[0],
              ...r.additionalDates.map((ad) => ad.eventDate.toISOString().split("T")[0]),
            ],
            venue: r.venue?.venue,
            timeSlot: r.timeSlot ? `${r.timeSlot.startTime} - ${r.timeSlot.endTime}` : "",
            packageName: r.package?.packageName,
            packageDayRate: r.package?.dayRate ? Number(r.package.dayRate) : null,
            packageNightRate: r.package?.nightRate ? Number(r.package.nightRate) : null,
            totalAmount: breakdown.base,
            totalPaid: breakdown.paid,
            balance: breakdown.remainingBalance,
            balanceRemaining: breakdown.remainingBalance,
            totalPayable: breakdown.totalPayable,
            hasBooking: r.bookings.length > 0,
            paymentStatus: breakdown.balanceSettled
              ? "BalanceSettled"
              : breakdown.status === "DepositPaid"
                ? "DepositPaid"
                : breakdown.status === "DownPaymentPaid"
                  ? "DownPaymentPaid"
                  : breakdown.status === "IncompletePayment"
                    ? "IncompletePayment"
                    : "Pending",
            requiredDownPayment: breakdown.requiredDownPayment,
            requiredDeposit: breakdown.requiredDeposit,
            downPaymentMet: breakdown.downPaymentMet,
            depositMet: breakdown.depositMet,
            balanceSettled: breakdown.balanceSettled,
            particulars: r.reservedParticulars.map((rp) => ({
              name: rp.particular.particularName,
              quantity: rp.quantity,
              unitCost: rp.particular?.inventory?.unitCost
                ? Number(rp.particular.inventory.unitCost)
                : 0,
            })),
          };
        });

      return NextResponse.json(mapped);
    }

    if (searchParams.get("history") === "true") {
      const monthParam = searchParams.get("month");
      const yearParam = searchParams.get("year");
      const reservationIdParam = searchParams.get("reservationId");
      const reservationId = reservationIdParam
        ? parseInt(reservationIdParam, 10)
        : null;

      const where = {};
      if (
        monthParam !== null &&
        yearParam !== null &&
        monthParam !== "" &&
        yearParam !== ""
      ) {
        where.paymentDate = {
          gte: new Date(parseInt(yearParam, 10), parseInt(monthParam, 10), 1),
          lte: new Date(
            parseInt(yearParam, 10),
            parseInt(monthParam, 10) + 1,
            0,
            23,
            59,
            59
          ),
        };
      }
      if (reservationId && Number.isFinite(reservationId)) {
        where.booking = { reservationId };
      }

      const transactions = await prisma.transaction.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        include: {
          payment: {
            include: {
              status: { select: { status: true } },
            },
          },
          booking: {
            include: {
              reservation: {
                include: {
                  venue: { select: { venue: true } },
                  timeSlot: { select: { startTime: true, endTime: true } },
                },
              },
            },
          },
        },
        orderBy: { paymentDate: "desc" },
      });

      const clientIds = [
        ...new Set(
          transactions
            .map((t) => t.booking?.reservation?.clientId)
            .filter((id) => id != null)
        ),
      ];
      const clients =
        clientIds.length > 0
          ? await prisma.client.findMany({
              where: { clientId: { in: clientIds } },
              select: {
                clientId: true,
                firstName: true,
                lastName: true,
                clientRoleId: true,
              },
            })
          : [];
      const clientMap = Object.fromEntries(clients.map((c) => [c.clientId, c]));

      const mapped = transactions.map((t) => {
        const reservation = t.booking?.reservation;
        const client = reservation ? clientMap[reservation.clientId] : null;
        const notes = reservation?.notes || "";
        const walkInMatch = notes.match(/Client:\s*([^,]+)/);

        const clientName = client
          ? `${client.firstName} ${client.lastName}`.trim()
          : walkInMatch?.[1]?.trim() || (notes.includes("Walk-in") ? notes : "Unknown");

        const clientType =
          client?.clientRoleId === "PROV" ? "provincial" : "client";

        return {
          transactionId: t.transactionId,
          paymentId: t.paymentId,
          bookingId: t.bookingId,
          reservationId: reservation?.reservationId ?? null,
          orNumber: t.receiptNumber,
          amountPaid: roundMoney(t.payment?.amountPaid ?? 0),
          paymentStatus: t.payment?.status?.status || "Partially Paid",
          clientName,
          clientType,
          activityName: reservation?.eventType || "",
          eventDate: reservation?.eventDate ? formatDbDate(reservation.eventDate) : "",
          venue: reservation?.venue?.venue || "",
          timeSlot: reservation?.timeSlot
            ? `${reservation.timeSlot.startTime} - ${reservation.timeSlot.endTime}`
            : "",
          paymentDate: t.paymentDate,
          recordedBy: t.recordedBy || "LTOO",
        };
      });

      const totalCollected = roundMoney(
        mapped.reduce((sum, row) => sum + row.amountPaid, 0)
      );

      return NextResponse.json({
        transactions: mapped,
        summary: {
          count: mapped.length,
          totalCollected,
        },
      });
    }

    // Return all payments (legacy list)
    const payments = await prisma.payment.findMany({
      include: {
        booking: {
          include: {
            reservation: {
              include: {
                client: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
        transactions: true,
        status: { select: { status: true } },
      },
      orderBy: { paymentId: "desc" },
    });

    const mapped = payments.map((p) => ({
      paymentId: p.paymentId,
      clientName: p.booking?.reservation?.client
        ? `${p.booking.reservation.client.firstName} ${p.booking.reservation.client.lastName}`
        : p.booking?.reservation?.notes?.includes("Walk-in")
          ? p.booking.reservation.notes
          : "Unknown",
      clientType:
        p.booking?.reservation?.client?.clientRoleId === "PROV"
          ? "provincial"
          : "client",
      orNumber: p.transactions?.[0]?.receiptNumber || "",
      totalAmount: Number(p.amountPaid),
      amountPaid: Number(p.amountPaid),
      paymentStatus: p.status?.status || "Partially Paid",
      activityName: p.booking?.reservation?.eventType || "",
      createdAt: p.transactions?.[0]?.paymentDate || p.booking?.confirmationDate,
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("Payments GET error:", error);
    return NextResponse.json(
      { error: "Failed to load payments" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      clientType,
      clientName,
      company,
      address,
      contactNumber,
      activityName,
      activityDate,
      amountPaid,
      orNumber,
      selectedBookingId,
      paymentType,
      performedBy,
      performedByName,
    } = body;

    if (!clientName || !amountPaid || !orNumber) {
      return NextResponse.json(
        { error: "Client, payment amount, and OR number are required" },
        { status: 400 }
      );
    }

    const amount = Number(amountPaid);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Payment amount must be a positive number" },
        { status: 400 }
      );
    }

    let reservationId = selectedBookingId ? parseInt(selectedBookingId) : null;
    let bookingId = null;
    let statusToUse = clientType === "provincial" ? "Fully Paid" : "Partially Paid";

    // If recording against an existing reservation, validate the amount server-side.
    if (reservationId) {
      const reservation = await prisma.reservation.findFirst({
        where: { reservationId },
        include: {
          package: { select: { packageName: true, dayRate: true, nightRate: true } },
          timeSlot: { select: { startTime: true, endTime: true } },
          additionalDates: { select: { eventDate: true } },
          reservedParticulars: {
            include: {
              particular: {
                select: { particularName: true, inventory: { select: { unitCost: true } } },
              },
            },
          },
          bookings: {
            include: {
              payments: { select: { amountPaid: true } },
            },
          },
        },
      });

      if (!reservation) {
        return NextResponse.json(
          { error: "Reservation not found" },
          { status: 404 }
        );
      }

      // Recompute the total amount owed for this reservation.
      const numDays = 1 + reservation.additionalDates.length;
      const pkgRate = reservation.package?.dayRate
        ? Number(reservation.package.dayRate)
        : reservation.package?.nightRate
          ? Number(reservation.package.nightRate)
          : null;
      const pkgTotal = pkgRate ? pkgRate * numDays : 0;
      const particularsTotal = reservation.reservedParticulars.reduce((sum, rp) => {
        let unitCost = rp.particular?.inventory?.unitCost
          ? Number(rp.particular.inventory.unitCost)
          : 0;
        if (rp.particular?.particularName === "Basketball Game") {
          const basketballPrices = { 2: 1000, 3: 1500, 4: 1500, 5: 2000 };
          return sum + (basketballPrices[rp.quantity] || unitCost);
        }
        return sum + unitCost * rp.quantity;
      }, 0);
      const calculatedBase = roundMoney(pkgTotal + particularsTotal);
      const storedBase = reservation.totalAmount ? Number(reservation.totalAmount) : 0;
      const totalAmt =
        calculatedBase > 0
          ? roundMoney(Math.max(storedBase, calculatedBase))
          : storedBase;

      const totalPaid =
        reservation.bookings?.reduce(
          (sum, b) =>
            sum + (b.payments || []).reduce((s, p) => s + Number(p.amountPaid), 0),
          0
        ) || 0;

      const breakdown = computePaymentBreakdown(totalAmt, totalPaid);
      const remainingBalance = breakdown.remainingBalance;

      const normalizedPaymentType =
        paymentType === "deposit" || paymentType === "downpayment" || paymentType === "balance"
          ? paymentType
          : "balance";

      if (!isPaymentTypeAllowed(breakdown, normalizedPaymentType)) {
        const label =
          normalizedPaymentType === "deposit" ? "10% deposit"
          : normalizedPaymentType === "downpayment" ? "50% down payment"
          : "remaining balance";
        return NextResponse.json(
          { error: `The ${label} has already been recorded or is not available yet.` },
          { status: 400 }
        );
      }

      // The payment can never exceed the total remaining balance.
      if (roundMoney(amount) > remainingBalance) {
        return NextResponse.json(
          { error: `Amount cannot exceed the remaining balance of ${remainingBalance.toFixed(2)}` },
          { status: 400 }
        );
      }

      // The amount can never exceed the cap for the selected payment type.
      const typeMax = getPaymentTypeMax(breakdown, normalizedPaymentType);
      if (roundMoney(amount) > typeMax) {
        const label =
          normalizedPaymentType === "deposit" ? "the 10% deposit"
          : normalizedPaymentType === "downpayment" ? "the 50% down payment"
          : "the remaining balance";
        return NextResponse.json(
          { error: `Amount cannot exceed ${typeMax.toFixed(2)} for ${label}` },
          { status: 400 }
        );
      }

      if (isFixedPaymentAmount(normalizedPaymentType) && roundMoney(amount) !== roundMoney(typeMax)) {
        const label =
          normalizedPaymentType === "deposit" ? "10% deposit"
          : normalizedPaymentType === "downpayment" ? "50% down payment"
          : "remaining balance";
        return NextResponse.json(
          { error: `You must pay the full ${label} amount of ${typeMax.toFixed(2)}` },
          { status: 400 }
        );
      }

      // Derive the stored status from the cumulative amount paid after this payment.
      if (clientType !== "provincial") {
        const afterPayment = computePaymentBreakdown(totalAmt, totalPaid + amount);
        statusToUse = afterPayment.balanceSettled ? "Fully Paid" : "Partially Paid";
      }
    }

    // If no reservation selected, create one
    if (!reservationId) {
      let tempClient = await prisma.client.findFirst({
        where: { clientRoleId: clientType === "provincial" ? "PROV" : "INDV" },
      });

      if (!tempClient) {
        tempClient = await prisma.client.findFirst();
      }

      const reservation = await prisma.reservation.create({
        data: {
          eventDate: activityDate ? new Date(activityDate) : new Date(),
          eventType: activityName || "Payment Recording",
          reservationStatus: "Confirmed",
          venueId: 1,
          clientId: tempClient.clientId,
          timeSlotId: 1,
          notes: `Payment recorded by LTOO. Client: ${clientName}, Company: ${company || "N/A"}, Address: ${address || "N/A"}, Contact: ${contactNumber || "N/A"}`,
          submittedAt: new Date(),
        },
      });

      reservationId = reservation.reservationId;
    }

    // Find or create a booking for this reservation
    let existingBooking = await prisma.booking.findFirst({
      where: { reservationId: reservationId },
    });

    if (!existingBooking) {
      existingBooking = await prisma.booking.create({
        data: {
          reservationId: reservationId,
          venueId: 1,
          bookingStatusId: statusToUse === "Fully Paid" ? 2 : 1, // Booked or Pending
          confirmationDate: new Date(),
          staffId: performedBy ? parseInt(performedBy.replace("STF-", "")) || null : null,
        },
      });
    }

    bookingId = existingBooking.bookingId;

    // Update booking status if Fully Paid
    if (statusToUse === "Fully Paid") {
      await prisma.booking.update({
        where: { bookingId: bookingId },
        data: { bookingStatusId: 2 },
      });
    }

    // Find or create payment status based on the derived cumulative status.
    let paymentStatusRecord = await prisma.paymentStatus.findFirst({
      where: { status: statusToUse },
    });
    if (!paymentStatusRecord) {
      paymentStatusRecord = await prisma.paymentStatus.create({
        data: { status: statusToUse },
      });
    }

    // Create payment
    const payment = await prisma.payment.create({
      data: {
        amountPaid: amount,
        paymentStatusId: paymentStatusRecord.statusId,
        bookingId: bookingId,
        staffId: performedBy ? parseInt(performedBy.replace("STF-", "")) || null : null,
      },
    });

    // Create transaction (OR record)
    await prisma.transaction.create({
      data: {
        receiptNumber: orNumber,
        paymentDate: new Date(),
        recordedBy: performedByName || "LTOO",
        bookingId: bookingId,
        paymentId: payment.paymentId,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: "PAYMENT_RECORDED",
        targetUserId: `PAY-${payment.paymentId}`,
        targetName: clientName,
        performedById: performedBy || "LTOO",
        performedByName: performedByName || "Local Treasury Operations Officer",
        details: `Payment of ${amount} recorded. OR: ${orNumber}. Status: ${statusToUse}`,
      },
    });

    return NextResponse.json({ success: true, paymentId: payment.paymentId });
  } catch (error) {
    console.error("Payments POST error:", error);
    return NextResponse.json(
      { error: "Failed to record payment" },
      { status: 500 }
    );
  }

}