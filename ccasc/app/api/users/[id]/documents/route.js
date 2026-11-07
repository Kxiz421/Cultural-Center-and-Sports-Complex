import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";


import { requireApiAuth } from "@/lib/api-auth";
export async function GET(request, { params }) {
  const guard = await requireApiAuth(["admin"]);
  if (guard.response) return guard.response;

  try {
    const { id } = await params;
    const prefix = id.split("-")[0];
    const userId = parseInt(id.split("-")[1], 10);

    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    let documents = [];

    if (prefix === "CLT") {
      // Only the Certificate of Employment the client uploaded (during
      // registration / resubmission) is shown — not the booking documents.
      const client = await prisma.client.findUnique({
        where: { clientId: userId },
        select: { idProof: true, firstName: true, lastName: true },
      });

      if (client?.idProof) {
        documents.push({
          documentId: 0,
          documentType: { type: "Certificate of Employment (ID)" },
          filePath: client.idProof,
          documentStatus: "Submitted",
          remarks: `Uploaded by ${client.firstName} ${client.lastName}`,
          submittedAt: new Date(),
          booking: null,
        });
      }
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
        eventDate: d.eventDate || d.booking?.reservation?.eventDate || null,
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