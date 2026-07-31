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
        documentType: { select: { type: true } },
      },
      orderBy: { submittedAt: "desc" },
    });

    const mapped = documents.map((d) => {
      const client = d.booking?.reservation?.client;
      const isProvincial = client?.clientRole?.clientRoleId === "PROV";
      return {
        id: d.documentId,
        documentId: d.documentId,
        clientName: client
          ? `${client.firstName} ${client.lastName}`
          : "Unknown",
        clientType: isProvincial ? "provincial" : "client",
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