import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Submit a new document (supports image upload via FormData)
export async function POST(request) {
  try {
    const formData = await request.formData();
    const documentTypeId = formData.get("documentTypeId");
    const file = formData.get("file");
    const bookingId = formData.get("bookingId");

    if (!documentTypeId || !file) {
      return NextResponse.json(
        { error: "Missing required fields: documentTypeId, file" },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed." },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size too large. Maximum is 5MB." },
        { status: 400 }
      );
    }

    // Convert file to base64 data URI
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");
    const mimeType = file.type;
    const dataUri = `data:${mimeType};base64,${base64}`;

    // Create document record
    const document = await prisma.document.create({
      data: {
        documentTypeId: parseInt(documentTypeId),
        filePath: dataUri,
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
      { error: "Failed to submit document: " + error.message },
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