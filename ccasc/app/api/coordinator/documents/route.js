import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";


// Program Coordinator sees only Contract of Lease (2) and Certification (3)
const COORDINATOR_DOCUMENT_TYPES = [2, 3];

export async function GET() {
  try {
    const documents = await prisma.document.findMany({
      where: {
        documentTypeId: { in: COORDINATOR_DOCUMENT_TYPES },
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

    const mapped = documents.map((d) => {
      const client = d.booking?.reservation?.client;
      const isProvincial = client?.clientRole?.clientRoleId === "PROV";

      let clientName = "Client";
      let clientType = "client";

      if (client) {
        clientName = `${client.firstName} ${client.lastName}`;
        clientType = isProvincial ? "provincial" : "client";
      } else if (d.staff) {
        clientName = `${d.staff.firstName} ${d.staff.lastName}`;
        clientType = "provincial";
      }

      return {
        id: d.documentId,
        documentId: d.documentId,
        clientName,
        clientType,
        documentType: d.documentType?.type || "Document",
        documentStatus: d.documentStatus || "Pending",
        filePath: d.filePath,
        remarks: d.remarks,
        submittedAt: d.submittedAt,
      };
    });

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("Coordinator documents GET error:", error);
    return NextResponse.json(
      { error: "Failed to load documents" },
      { status: 500 }
    );
  }
}