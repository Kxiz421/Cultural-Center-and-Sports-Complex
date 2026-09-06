import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { formatDbDate, formatPhp, roundMoney } from "@/lib/utils";
import {
  computePaymentBreakdown,
  isValidPaymentType,
  validatePaymentAmount,
  paymentCoversDeposit,
  getPaymentTypeLabel,
  getBilledTotals,
  sumPaymentDiscounts,
  computeDiscountPeso,
  validateDiscountAmount,
} from "@/lib/payment-utils";
import {
  ensurePendingDeposit,
  recordDepositPayment,
  mapDepositSnapshot,
} from "@/lib/deposit-utils";
import { createClientNotification } from "@/lib/coordinator-notifications";
import { getPackageBillingRate } from "@/lib/reservation-package-select";
import { getBasketballPrice } from "@/lib/particular-options";

export const dynamic = "force-dynamic";

function getBookingDeposit(bookings) {
  for (const b of bookings || []) {
    if (b.deposit) return b.deposit;
  }
  return null;
}

const bookingDepositInclude = {
  payments: {
    select: {
      amountPaid: true,
      discountAmount: true,
      discountPercent: true,
      baseAmount: true,
      amountAfterDiscount: true,
    },
  },
  deposit: {
    include: {
      status: true,
      deductions: { orderBy: { recordedAt: "desc" } },
    },
  },
};

function collectBookingPayments(bookings) {
  return (bookings || []).flatMap((booking) => booking.payments || []);
}

function billedBreakdownForReservation(originalBase, bookings, depositRecord = null) {
  const payments = collectBookingPayments(bookings);
  const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amountPaid || 0), 0);
  const totalDiscount = sumPaymentDiscounts(payments);
  return computePaymentBreakdown(
    originalBase,
    totalPaid,
    depositRecord ?? getBookingDeposit(bookings),
    { originalBase, totalDiscount }
  );
}

const PACKAGE_RATE_SELECT = {
  packageId: true,
  packageName: true,
  dayRate: true,
  nightRate: true,
  ledWallDayRate: true,
  ledWallNightRate: true,
  timeSlotId: true,
};

function fetchPackageCatalog() {
  return prisma.package.findMany({ select: PACKAGE_RATE_SELECT });
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const bookingsOnly = searchParams.get("bookings");

    if (bookingsOnly === "true") {
      // Fetch reservations without client include to avoid orphaned FK errors
      const reservations = await prisma.reservation.findMany({
        where: {
          reservationStatus: { notIn: ["Cancelled"] },
        },
        include: {
          package: {
            select: PACKAGE_RATE_SELECT,
          },
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
            include: bookingDepositInclude,
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
      const packageCatalog = await fetchPackageCatalog();

      const mapped = reservations
        .filter((r) => clientMap[r.clientId] !== undefined)
        .map((r) => {
          const client = clientMap[r.clientId];
          // Calculate total paid so far
          const numDays = 1 + r.additionalDates.length;
          const pkgRate = r.package
            ? getPackageBillingRate(r.package, r.timeSlotId, packageCatalog)
            : 0;
          const pkgTotal = pkgRate ? pkgRate * numDays : 0;
          const particularsTotal = r.reservedParticulars.reduce((sum, rp) => {
            let unitCost = rp.particular?.inventory?.unitCost
              ? Number(rp.particular.inventory.unitCost)
              : 0;
            if (rp.particular?.particularName === "Basketball Game") {
              return sum + (getBasketballPrice(rp.quantity) || unitCost);
            }
            return sum + unitCost * rp.quantity;
          }, 0);
          const calculatedBase = roundMoney(pkgTotal + particularsTotal);
          const storedBase = r.totalAmount ? Number(r.totalAmount) : 0;
          const totalAmount =
            calculatedBase > 0
              ? roundMoney(Math.max(storedBase, calculatedBase))
              : storedBase;
          const breakdown = billedBreakdownForReservation(
            totalAmount,
            r.bookings,
            getBookingDeposit(r.bookings)
          );
          const deposit = mapDepositSnapshot(getBookingDeposit(r.bookings));

          return {
            id: r.reservationId,
            reservationId: r.reservationId,
            clientId: r.clientId,
            clientName: `${client.firstName} ${client.lastName}`,
            clientType: client.clientRole?.clientRoleId === "PROV" ? "provincial-agency" : "client",
            eventType: r.eventType,
            eventDate: r.eventDate ? formatDbDate(r.eventDate) : "",
            eventDates: [
              r.eventDate ? formatDbDate(r.eventDate) : null,
              ...r.additionalDates.map((ad) => formatDbDate(ad.eventDate)),
            ].filter(Boolean),
            venue: r.venue?.venue,
            timeSlot: r.timeSlot ? `${r.timeSlot.startTime} - ${r.timeSlot.endTime}` : "",
            packageName: r.package?.packageName,
            packageDayRate: r.package?.dayRate ? Number(r.package.dayRate) : null,
            packageNightRate: r.package?.nightRate ? Number(r.package.nightRate) : null,
            originalAmount: breakdown.originalBase,
            originalTotalPayable: breakdown.originalTotalPayable,
            totalDiscount: breakdown.totalDiscount,
            totalAmount: breakdown.base,
            totalPaid: breakdown.paid,
            balance: breakdown.remainingBalance,
            balanceRemaining: breakdown.remainingBalance,
            totalPayable: breakdown.totalPayable,
            deposit,
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
        where.OR = [
          { payment: { booking: { reservationId } } },
          { deposit: { booking: { reservationId } } },
        ];
      }

      const reservationInclude = {
        include: {
          venue: { select: { venue: true } },
          timeSlot: { select: { startTime: true, endTime: true } },
        },
      };

      const transactions = await prisma.transaction.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        include: {
          payment: {
            include: {
              status: { select: { status: true } },
              booking: {
                include: {
                  reservation: reservationInclude,
                },
              },
            },
          },
          deposit: {
            include: {
              status: { select: { status: true } },
              deductions: { orderBy: { recordedAt: "desc" } },
              booking: {
                include: {
                  reservation: reservationInclude,
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
            .map((t) => (
              t.payment?.booking?.reservation?.clientId
              ?? t.deposit?.booking?.reservation?.clientId
            ))
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
        const reservation =
          t.payment?.booking?.reservation || t.deposit?.booking?.reservation;
        const client = reservation ? clientMap[reservation.clientId] : null;
        const notes = reservation?.notes || "";
        const walkInMatch = notes.match(/Client:\s*([^,]+)/);

        const clientName = client
          ? `${client.firstName} ${client.lastName}`.trim()
          : walkInMatch?.[1]?.trim() || (notes.includes("Walk-in") ? notes : "Unknown");

        const clientType =
          client?.clientRoleId === "PROV" ? "provincial" : "client";
        const deposit = mapDepositSnapshot(t.deposit);
        const isRelease = t.entryType === "deposit_release";

        return {
          transactionId: t.transactionId,
          paymentId: t.paymentId,
          depositId: t.depositId ?? null,
          bookingId: t.payment?.bookingId ?? t.deposit?.bookingId ?? null,
          reservationId: reservation?.reservationId ?? null,
          orNumber: t.receiptNumber || null,
          entryType: t.entryType || "payment",
          amountPaid: isRelease
            ? roundMoney(t.releaseAmount ?? 0)
            : roundMoney(t.payment?.amountPaid ?? 0),
          paymentStatus: isRelease
            ? "Pulled Out"
            : (t.payment?.status?.status || "Partially Paid"),
          baseAmount: t.payment?.baseAmount != null ? roundMoney(t.payment.baseAmount) : null,
          discountAmount: t.payment ? roundMoney(t.payment.discountAmount || 0) : 0,
          discountPercent: t.payment?.discountPercent != null
            ? Number(t.payment.discountPercent)
            : null,
          amountAfterDiscount: t.payment?.amountAfterDiscount != null
            ? roundMoney(t.payment.amountAfterDiscount)
            : null,
          depositStatus: deposit?.status ?? null,
          depositRequiredAmount: deposit?.requiredAmount ?? null,
          depositAmountPaid: deposit?.amountPaid ?? null,
          depositAmountAfterDeductions: deposit?.amountAfterDeductions ?? null,
          depositPulledOutAt: deposit?.pulledOutAt ?? null,
          depositNotes: deposit?.notes ?? null,
          depositDeductions: deposit?.deductions ?? [],
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
        mapped.reduce((sum, row) => (
          row.entryType === "deposit_release" ? sum : sum + row.amountPaid
        ), 0)
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
      selectedBookingId,
      paymentType,
      performedBy,
      performedByName,
      applyDiscount,
      discountMode,
      discountPeso,
      discountPercent,
    } = body;

    if (!clientName) {
      return NextResponse.json(
        { error: "Client is required" },
        { status: 400 }
      );
    }

    const amount = Number(amountPaid || 0);
    if (!Number.isFinite(amount) || amount < 0) {
      return NextResponse.json(
        { error: "Payment amount must be a valid number" },
        { status: 400 }
      );
    }

    let reservationId = selectedBookingId ? parseInt(selectedBookingId) : null;
    let bookingId = null;
    let statusToUse = clientType === "provincial" ? "Fully Paid" : "Partially Paid";
    let notifyClientId = null;
    let notifyEventType = activityName || "";
    let notifyEventDate = activityDate || "";
    let notifyVenue = "";
    let depositRequiredAmount = 0;
    let paymentBreakdown = null;
    let paymentBaseAmount = null;
    let paymentDiscountAmount = 0;
    let paymentDiscountPercent = null;
    let paymentAmountAfterDiscount = null;
    let skipDepositHold = false;
    if (paymentType && !isValidPaymentType(paymentType)) {
      return NextResponse.json(
        { error: "Invalid payment type." },
        { status: 400 }
      );
    }

    let resolvedPaymentType = isValidPaymentType(paymentType)
      ? paymentType
      : "manual";

    // If recording against an existing reservation, validate the amount server-side.
    if (reservationId) {
      const reservation = await prisma.reservation.findFirst({
        where: { reservationId },
        include: {
          package: {
            select: PACKAGE_RATE_SELECT,
          },
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
            include: bookingDepositInclude,
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
      const packageCatalog = await fetchPackageCatalog();
      const pkgRate = reservation.package
        ? getPackageBillingRate(reservation.package, reservation.timeSlotId, packageCatalog)
        : 0;
      const pkgTotal = pkgRate ? pkgRate * numDays : 0;
      const particularsTotal = reservation.reservedParticulars.reduce((sum, rp) => {
        let unitCost = rp.particular?.inventory?.unitCost
          ? Number(rp.particular.inventory.unitCost)
          : 0;
        if (rp.particular?.particularName === "Basketball Game") {
          return sum + (getBasketballPrice(rp.quantity) || unitCost);
        }
        return sum + unitCost * rp.quantity;
      }, 0);
      const calculatedBase = roundMoney(pkgTotal + particularsTotal);
      const storedBase = reservation.totalAmount ? Number(reservation.totalAmount) : 0;
      const totalAmt =
        calculatedBase > 0
          ? roundMoney(Math.max(storedBase, calculatedBase))
          : storedBase;

      const currentBreakdown = billedBreakdownForReservation(
        totalAmt,
        reservation.bookings,
        getBookingDeposit(reservation.bookings)
      );
      const totalPaid = currentBreakdown.paid;

      let discountAmount = 0;
      let discountPercentValue = null;
      if (applyDiscount) {
        const isFullDiscount = discountMode === "full";
        discountAmount = computeDiscountPeso(currentBreakdown.totalPayable, {
          mode: isFullDiscount ? "full" : discountMode === "percent" ? "percent" : "peso",
          peso: discountPeso,
          percent: isFullDiscount ? 100 : discountPercent,
          remainingBalance: currentBreakdown.remainingBalance,
        });
        const discountCheck = validateDiscountAmount(
          currentBreakdown.totalPayable,
          totalPaid,
          discountAmount,
          currentBreakdown.requiredDeposit,
          { waiveDeposit: isFullDiscount }
        );
        if (!discountCheck.ok) {
          return NextResponse.json({ error: discountCheck.error }, { status: 400 });
        }
        if (isFullDiscount) {
          discountPercentValue = 100;
          skipDepositHold = !currentBreakdown.depositMet;
        } else if (discountMode === "percent") {
          discountPercentValue = Number(discountPercent);
        }
      }

      const billedAfterDiscount = getBilledTotals(
        currentBreakdown.originalBase,
        currentBreakdown.totalDiscount + discountAmount
      );
      const breakdown = computePaymentBreakdown(
        billedAfterDiscount.base,
        totalPaid,
        getBookingDeposit(reservation.bookings),
        {
          originalBase: currentBreakdown.originalBase,
          totalDiscount: currentBreakdown.totalDiscount + discountAmount,
        }
      );
      depositRequiredAmount = breakdown.requiredDeposit;
      paymentBreakdown = breakdown;
      paymentBaseAmount = currentBreakdown.totalPayable;
      paymentDiscountAmount = discountAmount;
      paymentDiscountPercent = discountPercentValue;
      paymentAmountAfterDiscount = billedAfterDiscount.totalPayable;
      const remainingBalance = breakdown.remainingBalance;
      const discountSettlesRemaining = discountAmount > 0 && remainingBalance <= 0;

      const normalizedPaymentType = isValidPaymentType(paymentType)
        ? paymentType
        : (discountSettlesRemaining ? "full" : "manual");

      if (!discountSettlesRemaining && amount <= 0) {
        return NextResponse.json(
          { error: "Payment amount must be a positive number" },
          { status: 400 }
        );
      }

      const validation = validatePaymentAmount(
        breakdown,
        normalizedPaymentType,
        amount,
        { discountSettlesRemaining }
      );
      if (!validation.ok) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        );
      }

      if (roundMoney(amount) > remainingBalance) {
        return NextResponse.json(
          { error: `Amount cannot exceed the remaining balance of ${formatPhp(remainingBalance)}` },
          { status: 400 }
        );
      }

      // Derive the stored status from the cumulative amount paid after this payment.
      if (clientType !== "provincial") {
        let depositAfter = getBookingDeposit(reservation.bookings);
        if (paymentCoversDeposit(breakdown, normalizedPaymentType, amount)) {
          depositAfter = {
            amountPaid: breakdown.requiredDeposit,
            requiredAmount: breakdown.requiredDeposit,
            status: { status: "Held" },
          };
        }
        const afterPayment = computePaymentBreakdown(
          billedAfterDiscount.base,
          totalPaid + amount,
          depositAfter,
          {
            originalBase: currentBreakdown.originalBase,
            totalDiscount: currentBreakdown.totalDiscount + discountAmount,
          }
        );
        statusToUse = afterPayment.balanceSettled ? "Fully Paid" : "Partially Paid";
      }

      notifyClientId = reservation.clientId;
      notifyEventType = reservation.eventType || activityName || "";
      notifyEventDate = reservation.eventDate
        ? formatDbDate(reservation.eventDate)
        : (activityDate || "");
      notifyVenue = reservation.venue?.venue || "";
      resolvedPaymentType = normalizedPaymentType;
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
      notifyClientId = tempClient.clientId;
      notifyEventType = activityName || "Payment Recording";
      notifyEventDate = activityDate || "";
    }

    // Find or create a booking for this reservation
    let existingBooking = await prisma.booking.findFirst({
      where: { reservationId: reservationId },
    });

    if (!existingBooking) {
      existingBooking = await prisma.booking.create({
        data: {
          reservationId: reservationId,
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
    if (!reservationId && amount <= 0) {
      return NextResponse.json(
        { error: "Payment amount must be a positive number" },
        { status: 400 }
      );
    }

    const payment = await prisma.payment.create({
      data: {
        amountPaid: amount,
        paymentStatusId: paymentStatusRecord.statusId,
        bookingId: bookingId,
        staffId: performedBy ? parseInt(performedBy.replace("STF-", "")) || null : null,
        baseAmount: paymentBaseAmount,
        discountAmount: paymentDiscountAmount,
        discountPercent: paymentDiscountPercent,
        amountAfterDiscount: paymentAmountAfterDiscount,
      },
    });

    const staffIdNum = performedBy
      ? parseInt(String(performedBy).replace("STF-", ""), 10) || null
      : null;

    let linkedDeposit = null;
    if (depositRequiredAmount > 0 && !skipDepositHold) {
      linkedDeposit = await ensurePendingDeposit(prisma, {
        bookingId,
        requiredAmount: depositRequiredAmount,
        staffId: staffIdNum,
      });
    }

    if (
      depositRequiredAmount > 0 &&
      !skipDepositHold &&
      paymentBreakdown &&
      paymentCoversDeposit(paymentBreakdown, resolvedPaymentType, amount)
    ) {
      linkedDeposit = await recordDepositPayment(prisma, {
        bookingId,
        requiredAmount: depositRequiredAmount,
        paymentId: payment.paymentId,
        staffId: staffIdNum,
        notes: `Recorded with ${getPaymentTypeLabel(resolvedPaymentType)}`,
      });
    }

    // Create transaction record (no OR number), linked to Deposit when applicable
    await prisma.transaction.create({
      data: {
        receiptNumber: "",
        paymentDate: new Date(),
        recordedBy: performedByName || "LTOO",
        paymentId: payment.paymentId,
        depositId: linkedDeposit?.depositId ?? null,
        entryType: "payment",
      },
    });

    const paymentTypeLabel = getPaymentTypeLabel(resolvedPaymentType);
    const formattedAmount = Number(amount).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: "PAYMENT_RECORDED",
        targetUserId: `PAY-${payment.paymentId}`,
        targetName: clientName,
        performedById: performedBy || "LTOO",
        performedByName: performedByName || "Local Treasury Operations Officer",
        details: paymentDiscountAmount > 0
          ? `Payment of ₱${formattedAmount} recorded for ${paymentTypeLabel} with ${formatPhp(paymentDiscountAmount)} discount. Status: ${statusToUse}`
          : `Payment of ₱${formattedAmount} recorded for ${paymentTypeLabel}. Status: ${statusToUse}`,
      },
    });

    // Notify the client about the recorded payment
    if (notifyClientId) {
      const reservationBits = [
        notifyEventType ? `"${notifyEventType}"` : null,
        notifyEventDate ? `on ${notifyEventDate}` : null,
        notifyVenue ? `at ${notifyVenue}` : null,
        reservationId ? `(Reservation #${reservationId})` : null,
      ]
        .filter(Boolean)
        .join(" ");

      await createClientNotification({
        clientId: notifyClientId,
        type: "payment",
        message: `A payment of ₱${formattedAmount} was recorded for your reservation${reservationBits ? ` ${reservationBits}` : ""}. Payment type: ${paymentTypeLabel}.`,
      });
    }

    return NextResponse.json({ success: true, paymentId: payment.paymentId });
  } catch (error) {
    console.error("Payments POST error:", error);
    return NextResponse.json(
      { error: "Failed to record payment" },
      { status: 500 }
    );
  }

}