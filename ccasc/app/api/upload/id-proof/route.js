import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { handleUpload } from "@vercel/blob/client";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/jpg",
];
// Raised from 5MB to 50MB; on Vercel this is enforced by the Blob direct
// upload (the file never passes through the serverless function body).
const MAX_SIZE_BYTES = 50 * 1024 * 1024;

export async function POST(request) {
  try {
    const contentType = request.headers.get("content-type") || "";

    // The Vercel Blob client `upload()` first sends a JSON handshake to this
    // route ({ type: "blob.generate-client-token", payload }). We respond with
    // a short-lived client token so the browser can PUT the file directly to
    // Blob storage — large files never pass through this serverless function.
    if (contentType.includes("application/json")) {
      const body = await request.json();
      const json = await handleUpload({
        token: process.env.BLOB_READ_WRITE_TOKEN,
        request,
        body,
        onBeforeGenerateToken: async () => ({
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes: MAX_SIZE_BYTES,
          addRandomSuffix: true,
        }),
        onUploadCompleted: async () => {
          // Nothing to record; the client receives the blob URL directly.
        },
      });
      return NextResponse.json(json);
    }

    // Fallback (multipart, local dev only): validate and write to disk.
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed." },
        { status: 400 }
      );
    }

    // Validate file size (max 50MB)
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File size too large. Maximum is 50MB." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create unique filename
    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filename = `${timestamp}-${originalName}`;

    // Ensure uploads/id-proofs directory exists
    const uploadDir = path.join(process.cwd(), "public", "uploads", "id-proofs");
    await mkdir(uploadDir, { recursive: true });

    // Write file to disk
    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, buffer);

    // Return the public URL (small string, fits easily in JSON body)
    const publicUrl = `/uploads/id-proofs/${filename}`;

    return NextResponse.json({
      url: publicUrl,
      filename,
    });
  } catch (error) {
    console.error("Failed to upload file:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload file" },
      { status: 500 }
    );
  }
}