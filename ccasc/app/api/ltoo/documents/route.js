import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { formatDbDate } from "@/lib/utils";
import { noCacheJson } from "@/lib/api-cache-control";
import { walkInDisplayName } from "@/lib/walk-in";

import { requireApiAuth } from "@/lib/api-auth";
export const dynamic = "force-dynamic";

const LTOO_DOCUMENT_TYPES = [1, 5];
const BILLING_TYPE_ID = 1;
const RECEIPT_TYPE_ID = 5;

function toDocItem(doc) {
  return {
    documentId: doc.documentId,
    documentTypeId: doc.documentTypeId,
    documentType: doc.documentType?.type || "",
    documentStatus: doc.documentStatus || "Pending",
    filePath: doc.filePath,
    remarks: doc.remarks,
    submittedAt: doc.submittedAt,
  };
}

function isBilling(doc) {
  return (
    doc.documentTypeId === BILLING_TYPE_ID ||
    /billing/i.test(doc.documentType?.type || "")
  );
}

function isReceipt(doc) {
  return (
    doc.documentTypeId === RECEIPT_TYPE_ID ||
    /official receipt/i.test(doc.documentType?.type || "")
  );
}

function latestOf(docs) {
  return (
    [...docs].sort(
      (a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0)
    )[0] || null
  );
}

function pairStatus(billing, receipt) {
  const statuses = [billing?.documentStatus, receipt?.documentStatus].filter(
    Boolean
  );
  if (statuses.length === 0) return "Pending";
  if (statuses.every((status) => status === "Verified")) return "Verified";
  if (statuses.some((status) => status === "Pending") || statuses.length < 2) {
    return "Pending";
  }
  if (statuses.some((status) => status === "Declined")) return "Declined";
  return "Pending";
}

export async function GET() {
  const guard = await requireApiAuth(["local treasury operations officer","admin"]);
  if (guard.response) return guard.response;

  try {
    const documents = await prisma.document.findMany({
      where: {
        documentTypeId: { in: LTOO_DOCUMENT_TYPES },
        bookingId: { not: null },
      },
      include: {
        booking: {
          include: {
            reservation: {
              include: {
                client: {
                  select: {
                    firstName: true,
                    lastName: true,
                    clientRole: { select: { clientRoleId: true } },
                  },
                },
                venue: { select: { venue: true } },
                additionalDates: { select: { eventDate: true } },
              },
            },
          },
        },
        staff: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        documentType: { select: { type: true } },
      },
      orderBy: { submittedAt: "desc" },
    });

    const groups = new Map();

    for (const doc of documents) {
      const reservation = doc.booking?.reservation;
      const client = reservation?.client;
      
      // Skip documents for Sports Complex — these go to the Program Coordinator, not LTOO
      if (reservation?.venue?.venue?.toLowerCase().includes("sports complex")) continue;

      const isProvincial = client?.clientRole?.clientRoleId === "PROV";

      let clientName = "Client";
      let clientType = "client";
      if (client) {
        clientName = `${client.firstName} ${client.lastName}`;
        clientType = isProvincial ? "provincial" : "client";
      } else if (doc.staff) {
        clientName = `${doc.staff.firstName} ${doc.staff.lastName}`;
        clientType = "provincial";
      }

      const reservationId = reservation?.reservationId || null;
      const bookingId = doc.bookingId || doc.booking?.bookingId || null;
      const groupId = reservationId
        ? `res-${reservationId}`
        : bookingId
          ? `bkg-${bookingId}`
          : `doc-${doc.documentId}`;

      if (!groups.has(groupId)) {
        const primaryEventDate = formatDbDate(reservation?.eventDate);
        const eventDates = [
          primaryEventDate,
          ...(reservation?.additionalDates || []).map((ad) =>
            formatDbDate(ad.eventDate)
          ),
        ].filter(Boolean);
        groups.set(groupId, {
          id: groupId,
          reservationId,
          bookingId,
          clientName,
          clientType,
          eventType: reservation?.eventType || null,
          venue: reservation?.venue?.venue || null,
          eventDate: primaryEventDate || null,
          eventDates: [...new Set(eventDates)].sort(),
          items: [],
        });
      }

      groups.get(groupId).items.push(toDocItem(doc));
    }

    const mapped = [...groups.values()].map((group) => {
      const billingStatement = latestOf(group.items.filter(isBilling));
      const officialReceipt = latestOf(group.items.filter(isReceipt));

      const submittedAt = group.items.reduce((latest, item) => {
        const time = item.submittedAt ? new Date(item.submittedAt).getTime() : 0;
        return time > latest ? time : latest;
      }, 0);

      return {
        id: group.id,
        reservationId: group.reservationId,
        bookingId: group.bookingId,
        clientName: group.clientName,
        clientType: group.clientType,
        eventType: group.eventType,
        venue: group.venue,
        eventDate: group.eventDate,
        eventDates: group.eventDates,
        billingStatement,
        officialReceipt,
        documentStatus: pairStatus(billingStatement, officialReceipt),
        submittedAt: submittedAt ? new Date(submittedAt).toISOString() : null,
        remarks:
          [billingStatement?.remarks, officialReceipt?.remarks]
            .filter(Boolean)
            .join(" · ") || null,
      };
    });

    const pendingReservations = await prisma.reservation.findMany({
      where: {
        reservationStatus: { notIn: ["Cancelled"] },
        bookings: {
          some: {},
          none: {
            documents: {
              some: { documentTypeId: { in: LTOO_DOCUMENT_TYPES } },
            },
          },
        },
      },
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true,
            clientRole: { select: { clientRoleId: true } },
          },
        },
        venue: { select: { venue: true } },
        additionalDates: { select: { eventDate: true } },
        bookings: { select: { bookingId: true }, orderBy: { bookingId: "asc" } },
      },
      orderBy: { reservationId: "desc" },
    });

    for (const r of pendingReservations) {
      if (r.venue?.venue?.toLowerCase().includes("sports complex")) continue;
      const client = r.client;
      const primaryEventDate = formatDbDate(r.eventDate);
      const eventDates = [
        primaryEventDate,
        ...r.additionalDates.map((ad) => formatDbDate(ad.eventDate)),
      ].filter(Boolean);
      mapped.push({
        id: `res-${r.reservationId}`,
        reservationId: r.reservationId,
        bookingId: r.bookings[0]?.bookingId ?? null,
        clientName: client
          ? `${client.firstName} ${client.lastName}`
          : walkInDisplayName(r.notes),
        clientType:
          client?.clientRole?.clientRoleId === "PROV" ? "provincial" : "client",
        eventType: r.eventType || null,
        venue: r.venue?.venue || null,
        eventDate: primaryEventDate || null,
        eventDates: [...new Set(eventDates)].sort(),
        billingStatement: null,
        officialReceipt: null,
        documentStatus: "Pending",
        submittedAt: null,
        remarks: null,
      });
    }

    mapped.sort((a, b) => {
      const aTime = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const bTime = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      return bTime - aTime;
    });

    return noCacheJson(mapped);
  } catch (error) {
    console.error("Documents GET error:", error);
    return noCacheJson(
      { error: "Failed to load documents" },
      { status: 500 }
    );
  }
}

function parseId(value) {
  if (value == null || value === "") return null;
  const clean = String(value).replace(/^(RES-|BK-)/i, "");
  const n = parseInt(clean, 10);
  return Number.isNaN(n) ? null : n;
}

async function resolveBooking(reservationId, bookingId) {
  if (bookingId) {
    return prisma.booking.findFirst({ where: { bookingId, reservationId } });
  }
  const existing = await prisma.booking.findFirst({
    where: { reservationId },
    orderBy: { bookingId: "asc" },
  });
  if (existing) return existing;

  const pendingStatus = await prisma.bookingStatus.findFirst({
    where: { status: "Pending" },
    select: { bookingStatusId: true },
  });
  return prisma.booking.create({
    data: {
      reservationId,
      bookingStatusId: pendingStatus?.bookingStatusId ?? 3,
      confirmationDate: new Date(),
    },
  });
}

export async function POST(request) {
  const guard = await requireApiAuth(["local treasury operations officer","admin"]);
  if (guard.response) return guard.response;

  try {
    const body = await request.json();
    const bookingId = parseId(body.bookingId);
    const documentTypeId = parseId(body.documentTypeId);
    let reservationId = parseId(body.reservationId);

    if (!reservationId && bookingId) {
      const linkedBooking = await prisma.booking.findUnique({
        where: { bookingId },
        select: { reservationId: true },
      });
      reservationId = linkedBooking?.reservationId ?? null;
    }

    if (!reservationId) {
      return NextResponse.json(
        { error: "This document is not linked to a reservation." },
        { status: 400 }
      );
    }
    if (!LTOO_DOCUMENT_TYPES.includes(documentTypeId)) {
      return NextResponse.json(
        { error: "Invalid document type for LTOO verification." },
        { status: 400 }
      );
    }

    const reservation = await prisma.reservation.findUnique({
      where: { reservationId },
      select: {
        reservationId: true,
        clientId: true,
        eventType: true,
        eventDate: true,
        venue: { select: { venue: true } },
      },
    });
    if (!reservation) {
      return NextResponse.json(
        { error: "Reservation not found." },
        { status: 404 }
      );
    }
    if (reservation.venue?.venue?.toLowerCase().includes("sports complex")) {
      return NextResponse.json(
        {
          error:
            "Sports Complex documents are handled by the Program Coordinator.",
        },
        { status: 400 }
      );
    }

    const booking = await resolveBooking(reservationId, bookingId);
    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found for this reservation." },
        { status: 404 }
      );
    }

    const existingDocs = await prisma.document.findMany({
      where: {
        bookingId: booking.bookingId,
        documentTypeId: { in: LTOO_DOCUMENT_TYPES },
      },
      orderBy: { submittedAt: "desc" },
    });
    const existingForType = latestOf(
      existingDocs.filter((doc) => doc.documentTypeId === documentTypeId)
    );
    if (existingForType?.documentStatus === "Verified") {
      return NextResponse.json(
        { error: "This document is already verified." },
        { status: 400 }
      );
    }
    if (existingForType?.documentStatus === "Pending") {
      return NextResponse.json(
        {
          error:
            "A document of this type was submitted online and is pending review.",
        },
        { status: 400 }
      );
    }

    const primaryKey = formatDbDate(reservation.eventDate);
    const created = await prisma.document.create({
      data: {
        documentTypeId,
        filePath: null,
        documentStatus: "Verified",
        remarks: "Physical copy verified by LTOO (no online submission).",
        bookingId: booking.bookingId,
        eventDate: primaryKey
          ? new Date(`${primaryKey}T00:00:00.000Z`)
          : null,
        submittedAt: new Date(),
      },
      include: { documentType: { select: { type: true } } },
    });

    const updatedDocs = await prisma.document.findMany({
      where: {
        bookingId: booking.bookingId,
        documentTypeId: { in: LTOO_DOCUMENT_TYPES },
      },
      orderBy: { submittedAt: "desc" },
    });
    const billingStatus =
      latestOf(updatedDocs.filter(isBilling))?.documentStatus || null;
    const receiptStatus =
      latestOf(updatedDocs.filter(isReceipt))?.documentStatus || null;
    const initialApproved =
      billingStatus === "Verified" && receiptStatus === "Verified";

    if (initialApproved && reservation.clientId) {
      const eventBits = [
        reservation.eventType,
        primaryKey,
        reservation.venue?.venue,
      ]
        .filter(Boolean)
        .join(" · ");
      try {
        await prisma.notification.create({
          data: {
            clientId: reservation.clientId,
            staffId: 1,
            type: "document",
            message: `Billing Statement and Official Receipt are approved for ${eventBits}. You may now submit your Certification and Contract of Lease.`,
            sentAt: new Date(),
          },
        });
      } catch (err) {
        console.error("Failed to create document notification:", err);
      }
    }

    return NextResponse.json(
      { success: true, document: toDocItem(created), initialApproved },
      { status: 201 }
    );
  } catch (error) {
    console.error("Physical document verification error:", error);
    return NextResponse.json(
      { error: "Failed to verify physical document" },
      { status: 500 }
    );
  }
}
