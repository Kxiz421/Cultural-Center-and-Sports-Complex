import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Submit a new document
export async function POST(request) {
  try {
    const { documentTypeId, filePath } = await request.json();
    const bookingId = null; // Will be set when booking is confirmed

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
        bookingId: null,
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