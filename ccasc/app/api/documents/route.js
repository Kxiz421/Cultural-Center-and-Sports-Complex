import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { formatDbDate } from "@/lib/utils";
import {
  documentEventDateKey,
  documentsForEventDate,
  reservationEventDateKeys,
  resolveReservationEventDate,
} from "@/lib/document-event-date";
import {
  isCulturalCenterVenue,
  notifyCulturalCenterCoordinators,
} from "@/lib/coordinator-notifications";

const DOC_TYPE = {
  BILLING_STATEMENT: 1,
  CONTRACT_OF_LEASE: 2,
  CERTIFICATION: 3,
  OFFICIAL_RECEIPT: 5,
};

const INITIAL_TYPES = [DOC_TYPE.BILLING_STATEMENT, DOC_TYPE.OFFICIAL_RECEIPT];
const FINAL_TYPES = [DOC_TYPE.CONTRACT_OF_LEASE, DOC_TYPE.CERTIFICATION];
const VALID_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/jpg",
];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

function parseId(value) {
  if (value == null || value === "") return null;
  const clean = String(value).replace(/^(RES-|CLT-|BK-)/i, "");
  const n = parseInt(clean, 10);
  return Number.isNaN(n) ? null : n;
}

function validateImageFile(file, label = "File") {
  if (!file || typeof file === "string") {
    return `${label} is required.`;
  }
  if (!VALID_IMAGE_TYPES.includes(file.type)) {
    return `${label}: invalid type. Only JPEG, PNG, GIF, and WebP images are allowed.`;
  }
  if (file.size > MAX_FILE_SIZE) {
    return `${label}: file too large. Maximum is 5MB.`;
  }
  return null;
}

async function fileToDataUri(file) {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  return `data:${file.type};base64,${buffer.toString("base64")}`;
}

function latestStatusByType(documents) {
  const map = {};
  for (const doc of documents) {
    const typeId = doc.documentTypeId;
    if (map[typeId] == null) {
      map[typeId] = doc.documentStatus || "Pending";
    }
  }
  return map;
}

function isVerified(status) {
  return status === "Verified";
}

function isBlocking(status) {
  return status === "Pending" || status === "Verified";
}

function computePhase(documents) {
  const byType = latestStatusByType(documents);
  const billingStatus = byType[DOC_TYPE.BILLING_STATEMENT] || null;
  const receiptStatus = byType[DOC_TYPE.OFFICIAL_RECEIPT] || null;
  const leaseStatus = byType[DOC_TYPE.CONTRACT_OF_LEASE] || null;
  const certStatus = byType[DOC_TYPE.CERTIFICATION] || null;

  const initialApproved =
    isVerified(billingStatus) && isVerified(receiptStatus);

  return {
    billingStatus,
    receiptStatus,
    leaseStatus,
    certStatus,
    initialApproved,
    canUploadInitial:
      !isBlocking(billingStatus) || !isBlocking(receiptStatus),
    canUploadFinal: initialApproved,
    needsBilling: !isBlocking(billingStatus),
    needsReceipt: !isBlocking(receiptStatus),
    needsLease: initialApproved && !isBlocking(leaseStatus),
    needsCertification: initialApproved && !isBlocking(certStatus),
  };
}

function formatDocument(doc, primaryKey = null) {
  const submittedAt =
    doc.submittedAt?.toISOString?.() || doc.submittedAt || null;
  const forEventDate = documentEventDateKey(doc, primaryKey);
  return {
    id: doc.documentId,
    documentId: doc.documentId,
    documentTypeId: doc.documentTypeId,
    type: doc.documentType?.type || "Unknown",
    filePath: doc.filePath,
    status: doc.documentStatus,
    documentStatus: doc.documentStatus,
    submittedAt,
    remarks: doc.remarks,
    bookingId: doc.bookingId,
    reservationId: doc.booking?.reservationId ?? null,
    forEventDate,
    eventDate: forEventDate,
  };
}

function computeDatePhases(documents, eventDates, primaryKey) {
  const datePhases = {};
  for (const dateKey of eventDates) {
    datePhases[dateKey] = computePhase(
      documentsForEventDate(documents, dateKey, primaryKey)
    );
  }
  return datePhases;
}

async function ensureBookingForReservation(reservationId) {
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

async function resolveBookingForReservation(
  reservationId,
  clientId = null,
  bookingId = null
) {
  const resId = parseId(reservationId);
  if (!resId) {
    return { error: "Invalid reservation ID.", status: 400 };
  }

  const reservation = await prisma.reservation.findUnique({
    where: { reservationId: resId },
    select: {
      reservationId: true,
      clientId: true,
      eventDate: true,
      eventType: true,
      venueId: true,
      venue: { select: { venue: true } },
      additionalDates: { select: { eventDate: true } },
    },
  });

  if (!reservation) {
    return { error: "Reservation not found.", status: 404 };
  }

  if (clientId != null && reservation.clientId !== clientId) {
    return {
      error: "You do not have access to this reservation.",
      status: 403,
    };
  }

  let booking;
  const parsedBookingId =
    bookingId != null && bookingId !== ""
      ? parseInt(String(bookingId).replace(/^BK-/i, ""), 10)
      : null;

  if (parsedBookingId && !Number.isNaN(parsedBookingId)) {
    booking = await prisma.booking.findFirst({
      where: { bookingId: parsedBookingId, reservationId: resId },
    });
    if (!booking) {
      return {
        error: "Booking not found for this reservation.",
        status: 404,
      };
    }
  } else {
    booking = await ensureBookingForReservation(resId);
  }

  return { reservation, booking };
}

async function getBookingDocuments(bookingId) {
  return prisma.document.findMany({
    where: { bookingId },
    include: {
      documentType: true,
      booking: { select: { reservationId: true } },
    },
    orderBy: { submittedAt: "desc" },
  });
}

async function notifyDocumentRecipients({
  reservation,
  clientId,
  eventDateKey,
  documentTypes,
}) {
  if (!reservation || !clientId || !documentTypes?.length) return;
  const dateLabel = eventDateKey || formatDbDate(reservation.eventDate);
  const typeList = documentTypes.join(" and ");
  const message = `${typeList} submitted for "${reservation.eventType}" on ${dateLabel}${
    reservation.venue?.venue ? ` at ${reservation.venue.venue}` : ""
  }.`;

  const hasCoordinatorDocs = documentTypes.some((name) =>
    /certification|contract of lease/i.test(name)
  );
  if (hasCoordinatorDocs && isCulturalCenterVenue(reservation.venueId)) {
    await notifyCulturalCenterCoordinators({
      clientId,
      type: "document",
      message: `New ${message}`,
    });
  }
}

async function notifyClient({ clientId, message, type }) {
  if (!clientId || !message) return;
  try {
    await prisma.notification.create({
      data: {
        clientId,
        staffId: 1,
        message,
        type: type || "document",
        sentAt: new Date(),
      },
    });
  } catch (err) {
    console.error("Failed to create document notification:", err);
  }
}

async function createDocuments(tx, items) {
  const created = [];
  for (const item of items) {
    const dataUri = await fileToDataUri(item.file);
    const doc = await tx.document.create({
      data: {
        documentTypeId: item.documentTypeId,
        filePath: dataUri,
        documentStatus: "Pending",
        bookingId: item.bookingId,
        eventDate: item.eventDate
          ? new Date(`${item.eventDate}T00:00:00.000Z`)
          : null,
        submittedAt: new Date(),
      },
      include: {
        documentType: true,
        booking: { select: { reservationId: true } },
      },
    });
    created.push(doc);
  }
  return created;
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const reservationId = formData.get("reservationId");
    const bookingIdRaw = formData.get("bookingId");
    const clientId = parseId(formData.get("clientId"));
    const documentTypeIdRaw = formData.get("documentTypeId");
    const mode = String(formData.get("mode") || "single").toLowerCase();

    const isPairMode =
      mode === "initial" ||
      mode === "bs-or" ||
      mode === "final" ||
      mode === "cert-lease";

    let booking = null;
    let reservation = null;
    let existing = [];
    let phase = computePhase([]);
    let eventDateKey = null;
    let eventDates = [];
    let primaryDateKey = null;

    if (isPairMode || reservationId) {
      const resolved = await resolveBookingForReservation(
        reservationId,
        clientId,
        bookingIdRaw
      );
      if (resolved.error) {
        return NextResponse.json(
          { error: resolved.error },
          { status: resolved.status }
        );
      }
      booking = resolved.booking;
      reservation = resolved.reservation;
      primaryDateKey = formatDbDate(reservation.eventDate);
      eventDates = reservationEventDateKeys(reservation);
      const dated = resolveReservationEventDate(
        reservation,
        formData.get("eventDate")
      );
      if (dated.error) {
        return NextResponse.json(
          { error: dated.error, eventDates: dated.eventDates || eventDates },
          { status: dated.status || 400 }
        );
      }
      eventDateKey = dated.eventDateKey;
      const allDocs = await getBookingDocuments(booking.bookingId);
      existing = documentsForEventDate(allDocs, eventDateKey, primaryDateKey);
      phase = computePhase(existing);
    }

    if (mode === "initial" || mode === "bs-or") {
      if (isVerified(phase.billingStatus) && isVerified(phase.receiptStatus)) {
        return NextResponse.json(
          {
            error:
              "Billing Statement and Official Receipt are already approved for this event date.",
          },
          { status: 400 }
        );
      }

      const billingFile =
        formData.get("billingFile") || formData.get("billingStatement");
      const receiptFile =
        formData.get("receiptFile") || formData.get("officialReceipt");

      if (phase.needsBilling && phase.needsReceipt) {
        const billingErr = validateImageFile(billingFile, "Billing Statement");
        const receiptErr = validateImageFile(receiptFile, "Official Receipt");
        if (billingErr || receiptErr) {
          return NextResponse.json(
            { error: [billingErr, receiptErr].filter(Boolean).join(" ") },
            { status: 400 }
          );
        }
      } else {
        if (phase.needsBilling) {
          const err = validateImageFile(billingFile, "Billing Statement");
          if (err) return NextResponse.json({ error: err }, { status: 400 });
        }
        if (phase.needsReceipt) {
          const err = validateImageFile(receiptFile, "Official Receipt");
          if (err) return NextResponse.json({ error: err }, { status: 400 });
        }
        if (!phase.needsBilling && !phase.needsReceipt) {
          return NextResponse.json(
            {
              error:
                "Billing Statement and Official Receipt are already pending or approved for this event date. Wait for LTOO review.",
            },
            { status: 400 }
          );
        }
      }

      const toCreate = [];
      if (phase.needsBilling && billingFile && typeof billingFile !== "string") {
        toCreate.push({
          documentTypeId: DOC_TYPE.BILLING_STATEMENT,
          file: billingFile,
          bookingId: booking.bookingId,
          eventDate: eventDateKey,
        });
      }
      if (phase.needsReceipt && receiptFile && typeof receiptFile !== "string") {
        toCreate.push({
          documentTypeId: DOC_TYPE.OFFICIAL_RECEIPT,
          file: receiptFile,
          bookingId: booking.bookingId,
          eventDate: eventDateKey,
        });
      }

      if (toCreate.length === 0) {
        return NextResponse.json(
          {
            error:
              "No documents were uploaded. Please select the required files.",
          },
          { status: 400 }
        );
      }

      const created = await prisma.$transaction((tx) =>
        createDocuments(tx, toCreate)
      );

      return NextResponse.json(
        {
          success: true,
          documents: created.map((doc) => formatDocument(doc, primaryDateKey)),
          phase: computePhase([...created, ...existing]),
          eventDate: eventDateKey,
          eventDates,
        },
        { status: 201 }
      );
    }

    if (mode === "final" || mode === "cert-lease") {
      if (!phase.initialApproved) {
        return NextResponse.json(
          {
            error:
              "Certification and Contract of Lease unlock after LTOO approves both the Billing Statement and Official Receipt.",
          },
          { status: 400 }
        );
      }

      const certFile =
        formData.get("certificationFile") || formData.get("certification");
      const leaseFile =
        formData.get("leaseFile") || formData.get("contractOfLease");

      if (phase.needsCertification && phase.needsLease) {
        const certErr = validateImageFile(certFile, "Certification");
        const leaseErr = validateImageFile(leaseFile, "Contract of Lease");
        if (certErr || leaseErr) {
          return NextResponse.json(
            { error: [certErr, leaseErr].filter(Boolean).join(" ") },
            { status: 400 }
          );
        }
      } else {
        if (phase.needsCertification) {
          const err = validateImageFile(certFile, "Certification");
          if (err) return NextResponse.json({ error: err }, { status: 400 });
        }
        if (phase.needsLease) {
          const err = validateImageFile(leaseFile, "Contract of Lease");
          if (err) return NextResponse.json({ error: err }, { status: 400 });
        }
        if (!phase.needsCertification && !phase.needsLease) {
          return NextResponse.json(
            {
              error:
                "Certification and Contract of Lease are already pending or approved for this event date.",
            },
            { status: 400 }
          );
        }
      }

      const toCreate = [];
      if (
        phase.needsCertification &&
        certFile &&
        typeof certFile !== "string"
      ) {
        toCreate.push({
          documentTypeId: DOC_TYPE.CERTIFICATION,
          file: certFile,
          bookingId: booking.bookingId,
          eventDate: eventDateKey,
        });
      }
      if (phase.needsLease && leaseFile && typeof leaseFile !== "string") {
        toCreate.push({
          documentTypeId: DOC_TYPE.CONTRACT_OF_LEASE,
          file: leaseFile,
          bookingId: booking.bookingId,
          eventDate: eventDateKey,
        });
      }

      if (toCreate.length === 0) {
        return NextResponse.json(
          {
            error:
              "No documents were uploaded. Please select the required files.",
          },
          { status: 400 }
        );
      }

      const created = await prisma.$transaction((tx) =>
        createDocuments(tx, toCreate)
      );

      await notifyDocumentRecipients({
        reservation,
        clientId: reservation.clientId,
        eventDateKey,
        documentTypes: created.map((d) => d.documentType?.type || "Document"),
      });

      return NextResponse.json(
        {
          success: true,
          documents: created.map((doc) => formatDocument(doc, primaryDateKey)),
          phase: computePhase([...created, ...existing]),
          eventDate: eventDateKey,
          eventDates,
        },
        { status: 201 }
      );
    }

    const documentTypeId = parseId(documentTypeIdRaw);
    const file = formData.get("file");

    if (!documentTypeId || !file) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: documentTypeId, file (or use mode=initial / mode=final).",
        },
        { status: 400 }
      );
    }

    if (![...INITIAL_TYPES, ...FINAL_TYPES].includes(documentTypeId)) {
      return NextResponse.json(
        { error: "Invalid document type for client submission." },
        { status: 400 }
      );
    }

    const fileErr = validateImageFile(file, "Document");
    if (fileErr) {
      return NextResponse.json({ error: fileErr }, { status: 400 });
    }

    if (!booking) {
      return NextResponse.json(
        { error: "A reservation/booking is required to submit documents." },
        { status: 400 }
      );
    }

    if (FINAL_TYPES.includes(documentTypeId) && !phase.initialApproved) {
      return NextResponse.json(
        {
          error:
            "Certification and Contract of Lease unlock after LTOO approves both the Billing Statement and Official Receipt.",
        },
        { status: 400 }
      );
    }

    const typeStatus = latestStatusByType(existing)[documentTypeId];
    if (isBlocking(typeStatus)) {
      return NextResponse.json(
        {
          error: isVerified(typeStatus)
            ? "This document type is already approved for this event date."
            : "A document of this type is already pending review for this event date.",
        },
        { status: 400 }
      );
    }

    const created = await prisma.$transaction((tx) =>
      createDocuments(tx, [
        {
          documentTypeId,
          file,
          bookingId: booking.bookingId,
          eventDate: eventDateKey,
        },
      ])
    );

    await notifyDocumentRecipients({
      reservation,
      clientId: reservation.clientId,
      eventDateKey,
      documentTypes: created.map((d) => d.documentType?.type || "Document"),
    });

    return NextResponse.json(
      {
        success: true,
        document: formatDocument(created[0], primaryDateKey),
        documents: created.map((doc) => formatDocument(doc, primaryDateKey)),
        phase: computePhase([...created, ...existing]),
        eventDate: eventDateKey,
        eventDates,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Document submission error:", error);
    return NextResponse.json(
      { error: "Failed to submit document: " + error.message },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const documentTypeId = searchParams.get("documentTypeId");
    const clientId = parseId(searchParams.get("clientId"));
    const reservationId = parseId(searchParams.get("reservationId"));
    const bookingId = parseId(searchParams.get("bookingId"));
    const requestedEventDate = searchParams.get("eventDate");

    if (searchParams.get("eligibleBookings") === "true") {
      if (!clientId) {
        return NextResponse.json(
          { error: "clientId is required" },
          { status: 400 }
        );
      }

      const reservations = await prisma.reservation.findMany({
        where: {
          clientId,
          reservationStatus: { notIn: ["Cancelled"] },
        },
        include: {
          venue: { select: { venue: true } },
          additionalDates: { select: { eventDate: true } },
          bookings: {
            select: {
              bookingId: true,
              payments: { select: { paymentId: true } },
            },
            orderBy: { bookingId: "asc" },
          },
        },
        orderBy: { reservationId: "desc" },
      });

      const items = [];

      for (const r of reservations) {
        const allDates = [
          formatDbDate(r.eventDate),
          ...r.additionalDates.map((ad) => formatDbDate(ad.eventDate)),
        ];
        const base = {
          reservationId: r.reservationId,
          clientId: r.clientId,
          eventType: r.eventType,
          eventDate: formatDbDate(r.eventDate),
          eventDates: allDates,
          venue: r.venue?.venue || "Unknown Venue",
          status: r.reservationStatus,
        };

        if (r.bookings.length === 0) {
          items.push({
            ...base,
            id: `RES-${r.reservationId}`,
            recordType: "reservation",
            bookingId: null,
            hasBooking: false,
            hasPayment: false,
          });
        } else {
          for (const b of r.bookings) {
            const hasPayment = b.payments.length > 0;
            items.push({
              ...base,
              id: `BK-${b.bookingId}`,
              recordType: "booking",
              bookingId: b.bookingId,
              hasBooking: true,
              hasPayment,
            });
          }
        }
      }

      return NextResponse.json(items);
    }

    const where = {};

    if (documentTypeId) {
      where.documentTypeId = parseInt(documentTypeId, 10);
    }

    if (bookingId) {
      where.bookingId = bookingId;
    } else if (reservationId || clientId) {
      where.booking = {};
      if (reservationId) {
        where.booking.reservationId = reservationId;
      }
      if (clientId) {
        where.booking.reservation = { clientId };
      }
    }

    const documents = await prisma.document.findMany({
      where,
      include: {
        documentType: true,
        booking: {
          select: {
            bookingId: true,
            reservationId: true,
            reservation: {
              select: {
                clientId: true,
                eventType: true,
                eventDate: true,
                venue: { select: { venue: true } },
                additionalDates: { select: { eventDate: true } },
              },
            },
          },
        },
      },
      orderBy: { submittedAt: "desc" },
    });

    const formatted = documents.map((doc) => {
      const primaryKey = formatDbDate(doc.booking?.reservation?.eventDate);
      return {
        ...formatDocument(doc, primaryKey),
        eventType: doc.booking?.reservation?.eventType || null,
        venue: doc.booking?.reservation?.venue?.venue || null,
        reservationEventDate: primaryKey || null,
      };
    });

    if (reservationId) {
      const targetBookingId = bookingId || null;
      const bookingDocs = documents.filter((d) => {
        if (d.booking?.reservationId !== reservationId) return false;
        if (targetBookingId) return d.bookingId === targetBookingId;
        return true;
      });
      let reservation = bookingDocs[0]?.booking?.reservation;
      if (!reservation) {
        reservation = await prisma.reservation.findUnique({
          where: { reservationId },
          select: {
            eventDate: true,
            additionalDates: { select: { eventDate: true } },
          },
        });
      }
      const eventDates = reservation
        ? reservationEventDateKeys(reservation)
        : [];
      const primaryKey = reservation
        ? formatDbDate(reservation.eventDate)
        : null;
      const selectedDate = requestedEventDate
        ? resolveReservationEventDate(reservation, requestedEventDate)
        : { eventDateKey: null };
      const scopedDocs = selectedDate.eventDateKey
        ? documentsForEventDate(
            bookingDocs,
            selectedDate.eventDateKey,
            primaryKey
          )
        : bookingDocs;
      const scopedFormatted = formatted.filter((d) => {
        if (targetBookingId && d.bookingId !== targetBookingId) return false;
        if (
          selectedDate.eventDateKey &&
          d.forEventDate !== selectedDate.eventDateKey
        ) {
          return false;
        }
        return d.reservationId === reservationId || !d.reservationId;
      });

      return NextResponse.json({
        documents: scopedFormatted,
        phase: computePhase(scopedDocs),
        datePhases: computeDatePhases(bookingDocs, eventDates, primaryKey),
        eventDates,
        eventDate: selectedDate.eventDateKey || null,
        reservationId,
        bookingId: targetBookingId,
      });
    }

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Document fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const { documentId, status, remarks } = await request.json();

    if (!documentId || !status) {
      return NextResponse.json(
        { error: "Missing required fields: documentId, status" },
        { status: 400 }
      );
    }

    if (!["Verified", "Declined", "Pending"].includes(status)) {
      return NextResponse.json(
        { error: "Status must be 'Verified', 'Declined', or 'Pending'" },
        { status: 400 }
      );
    }

    if (status === "Declined" && (!remarks || !String(remarks).trim())) {
      return NextResponse.json(
        { error: "Remarks are required when declining a document." },
        { status: 400 }
      );
    }

    const updateData = { documentStatus: status };
    if (status === "Declined") {
      updateData.remarks = String(remarks).trim();
    }
    if (status === "Verified") {
      updateData.remarks = null;
    }

    const document = await prisma.document.update({
      where: { documentId: parseInt(documentId, 10) },
      data: updateData,
      include: {
        documentType: { select: { type: true, documentTypeId: true } },
        booking: {
          include: {
            reservation: {
              select: {
                clientId: true,
                eventType: true,
                eventDate: true,
                venue: { select: { venue: true } },
              },
            },
          },
        },
      },
    });

    const clientId = document.booking?.reservation?.clientId;
    const docTypeName = document.documentType?.type || "document";
    const reservation = document.booking?.reservation;
    const primaryKey = formatDbDate(reservation?.eventDate);
    const forEventDate = documentEventDateKey(document, primaryKey);
    const eventBits = [
      reservation?.eventType,
      forEventDate,
      reservation?.venue?.venue,
    ]
      .filter(Boolean)
      .join(" · ");

    if (status === "Declined" && clientId) {
      await notifyClient({
        clientId,
        type: "document",
        message: `Your ${docTypeName} requires resubmission${
          eventBits ? ` (${eventBits})` : ""
        }: ${updateData.remarks}`,
      });
    }

    if (status === "Verified" && clientId) {
      await notifyClient({
        clientId,
        type: "document",
        message: `Your ${docTypeName} has been approved${
          eventBits ? ` for ${eventBits}` : ""
        }.`,
      });

      if (
        document.bookingId &&
        INITIAL_TYPES.includes(document.documentTypeId)
      ) {
        const bookingDocs = await getBookingDocuments(document.bookingId);
        const sameDateDocs = documentsForEventDate(
          bookingDocs,
          forEventDate,
          primaryKey
        );
        const phase = computePhase(sameDateDocs);
        if (phase.initialApproved) {
          await notifyClient({
            clientId,
            type: "document",
            message: `Billing Statement and Official Receipt are approved${
              eventBits ? ` for ${eventBits}` : ""
            }. You may now submit your Certification and Contract of Lease.`,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      documentId: document.documentId,
      status: document.documentStatus,
      remarks: document.remarks,
    });
  } catch (error) {
    console.error("Document update error:", error);
    return NextResponse.json(
      { error: "Failed to update document status" },
      { status: 500 }
    );
  }
}
