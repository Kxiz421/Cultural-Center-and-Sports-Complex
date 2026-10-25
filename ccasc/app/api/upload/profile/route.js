import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { handleUpload } from "@vercel/blob/client";

import { noCacheJson } from "@/lib/api-cache-control";
import { requireApiAuth } from "@/lib/api-auth";
import { resolveBlobToken } from "@/lib/blob-token";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/jpg",
];
// Same 50MB cap as the ID-proof upload; on Vercel the limit is enforced by the
// Blob direct upload, so the file never passes through the serverless body.
const MAX_SIZE_BYTES = 50 * 1024 * 1024;

/**
 * Reports whether this deployment can issue Vercel Blob client tokens, so the
 * browser uploader skips the direct-to-Blob handshake on localhost and uses the
 * disk fallback instead.
 */
export async function GET() {
  const guard = await requireApiAuth();
  if (guard.response) return guard.response;

  return noCacheJson({ blobConfigured: Boolean(resolveBlobToken()) });
}

export async function POST(request) {
  const guard = await requireApiAuth();
  if (guard.response) return guard.response;

  try {
    const contentType = request.headers.get("content-type") || "";

    // Direct browser-to-Blob upload: the Vercel Blob client `upload()` sends a
    // JSON handshake first; answer with a short-lived client token so the file
    // goes straight to Blob without hitting the serverless body limit.
    if (contentType.includes("application/json")) {
      const token = resolveBlobToken();
      if (!token) {
        return NextResponse.json(
          {
            error:
              "Large-file Blob uploads require a Vercel Blob read/write token on this deployment.",
            code: "BLOB_NOT_CONFIGURED",
          },
          { status: 501 }
        );
      }

      const body = await request.json();
      const json = await handleUpload({
        token,
        request,
        body,
        onBeforeGenerateToken: async () => ({
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes: MAX_SIZE_BYTES,
          addRandomSuffix: true,
        }),
        onUploadCompleted: async () => {},
      });
      return NextResponse.json(json);
    }

    // Fallback (multipart, local dev): validate and write to disk.
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.",
        },
        { status: 400 }
      );
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File size too large. Maximum is 50MB." },
        { status: 400 }
      );
    }

    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filename = `${timestamp}-${originalName}`;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const uploadDir = path.join(process.cwd(), "public", "uploads", "profiles");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), buffer);

    return NextResponse.json({
      url: `/uploads/profiles/${filename}`,
      filename,
    });
  } catch (error) {
    console.error("Failed to upload profile photo:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload profile photo" },
      { status: 500 }
    );
  }
}
