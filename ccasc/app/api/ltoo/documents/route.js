import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const documents = await prisma.document.findMany({
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
      // Try to get client name from booking -> reservation -> client chain
      const client = d.booking?.reservation?.client;
      const isProvincial = client?.clientRole?.clientRoleId === "PROV";

      let clientName = "Client";
      let clientType = "client";

      if (client) {
        clientName = `${client.firstName} ${client.lastName}`;
        clientType = isProvincial ? "provincial" : "client";
      } else if (d.staff) {
        // Document was uploaded by a staff member (e.g. provincial agency)
        clientName = `${d.staff.firstName} ${d.staff.lastName}`;
        clientType = "provincial";
      }

      return {
        id: d.documentId,
        documentId: d.documentId,
        clientName,
        clientType,
        documentType: d.documentType?.type || "Billing Statement",
        documentStatus: d.documentStatus || "Pending",
        filePath: d.filePath,
        remarks: d.remarks,
        submittedAt: d.submittedAt,
      };
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