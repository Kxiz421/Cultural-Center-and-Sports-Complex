import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { formatDbDate } from "@/lib/utils";
import { documentEventDateKey } from "@/lib/document-event-date";

export const dynamic = "force-dynamic";

const LTOO_DOCUMENT_TYPES = [1, 5];
const BILLING_TYPE_ID = 1;
const RECEIPT_TYPE_ID = 5;

function toDocItem(doc, eventDate) {
  return {
    documentId: doc.documentId,
    documentTypeId: doc.documentTypeId,
    documentType: doc.documentType?.type || "",
    documentStatus: doc.documentStatus || "Pending",
    filePath: doc.filePath,
    remarks: doc.remarks,
    submittedAt: doc.submittedAt,
    eventDate,
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

function groupStatus(dateGroups) {
  const statuses = dateGroups.map((group) => group.overallStatus);
  if (statuses.length === 0) return "Pending";
  if (statuses.every((status) => status === "Verified")) return "Verified";
  if (statuses.some((status) => status === "Pending")) return "Pending";
  if (statuses.some((status) => status === "Declined")) return "Declined";
  return "Pending";
}

export async function GET() {
  try {
    const documents = await prisma.document.findMany({
      where: {
        documentTypeId: { in: LTOO_DOCUMENT_TYPES },
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

      const eventDate = documentEventDateKey(
        doc,
        formatDbDate(reservation?.eventDate)
      );

      if (!groups.has(groupId)) {
        groups.set(groupId, {
          id: groupId,
          reservationId,
          bookingId,
          clientName,
          clientType,
          eventType: reservation?.eventType || null,
          venue: reservation?.venue?.venue || null,
          primaryEventDate: formatDbDate(reservation?.eventDate),
          items: [],
        });
      }

      groups.get(groupId).items.push(toDocItem(doc, eventDate));
    }

    const mapped = [...groups.values()].map((group) => {
      const byDate = new Map();
      for (const item of group.items) {
        const dateKey = item.eventDate || group.primaryEventDate || "unknown";
        if (!byDate.has(dateKey)) {
          byDate.set(dateKey, { eventDate: dateKey, docs: [] });
        }
        byDate.get(dateKey).docs.push(item);
      }

      const dateGroups = [...byDate.values()]
        .map((entry) => {
          const billingStatement = latestOf(entry.docs.filter(isBilling));
          const officialReceipt = latestOf(entry.docs.filter(isReceipt));
          return {
            eventDate: entry.eventDate === "unknown" ? null : entry.eventDate,
            billingStatement,
            officialReceipt,
            overallStatus: pairStatus(billingStatement, officialReceipt),
          };
        })
        .sort((a, b) => String(a.eventDate || "").localeCompare(String(b.eventDate || "")));

      const submittedAt = group.items.reduce((latest, item) => {
        const time = item.submittedAt ? new Date(item.submittedAt).getTime() : 0;
        return time > latest ? time : latest;
      }, 0);

      const billingStatement = dateGroups[0]?.billingStatement || null;
      const officialReceipt = dateGroups[0]?.officialReceipt || null;

      return {
        id: group.id,
        reservationId: group.reservationId,
        bookingId: group.bookingId,
        clientName: group.clientName,
        clientType: group.clientType,
        eventType: group.eventType,
        venue: group.venue,
        eventDate: dateGroups.length === 1
          ? dateGroups[0].eventDate
          : group.primaryEventDate,
        eventDates: dateGroups.map((entry) => entry.eventDate).filter(Boolean),
        dateGroups,
        billingStatement,
        officialReceipt,
        documentStatus: groupStatus(dateGroups),
        submittedAt: submittedAt ? new Date(submittedAt).toISOString() : null,
        remarks:
          [billingStatement?.remarks, officialReceipt?.remarks]
            .filter(Boolean)
            .join(" · ") || null,
      };
    });

    mapped.sort((a, b) => {
      const aTime = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const bTime = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      return bTime - aTime;
    });

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("Documents GET error:", error);
    return NextResponse.json(
      { error: "Failed to load documents" },
      { status: 500 }
    );
  }
}
