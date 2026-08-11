import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Submit a new document (supports base64 image upload)
export async function POST(request) {
  try {
    const body = await request.json();
    const { documentTypeId, filePath, bookingId } = body;

    if (!documentTypeId || !filePath) {
      return NextResponse.json(
        { error: "Missing required fields: documentTypeId, filePath" },
        { status: 400 }
      );
    }

    const document = await prisma.document.create({
      data: {
        documentTypeId: parseInt(documentTypeId),
        filePath,
        status: "Pending",
        documentStatus: "Pending",
        bookingId: bookingId ? parseInt(bookingId) : null,
        submittedAt: new Date(),
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error("Document submission error:", error);
    return NextResponse.json(
      { error: "Failed to submit document" },
      { status: 500 }
    );
  }
}

// Get documents
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const documentTypeId = searchParams.get("documentTypeId");

    const where = documentTypeId
      ? { documentTypeId: parseInt(documentTypeId, 10) }
      : {};

    const documents = await prisma.document.findMany({
      where,
      include: { documentType: true },
      orderBy: { submittedAt: "desc" },
    });

    const formatted = documents.map((doc) => ({
      id: doc.documentId,
      type: doc.documentType?.type || "Unknown",
      filePath: doc.filePath,
      status: doc.status,
      documentStatus: doc.documentStatus,
      submittedAt: doc.submittedAt.toISOString(),
      remarks: doc.remarks,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Document fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

// Update document status (Verify/Decline) - used by LTOO
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

    const updateData = { documentStatus: status, status };
    if (status === "Declined" && remarks) {
      updateData.remarks = remarks;
    }
    if (status === "Verified") {
      updateData.remarks = null;
    }

    const document = await prisma.document.update({
      where: { documentId: parseInt(documentId) },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      documentId: document.documentId,
      status: document.status,
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