"use client";

import { upload } from "@vercel/blob/client";

/**
 * Uploads a Certificate of Employment (ID proof) image.
 *
 * On Vercel (BLOB_READ_WRITE_TOKEN set) the file is uploaded directly from
 * the browser to Vercel Blob, bypassing the ~4.5MB serverless body limit, so
 * files up to 50MB work. Without a Blob token (local dev) it falls back to
 * the disk-based /api/upload/id-proof endpoint.
 */
export async function uploadIdProof(file) {
  // Fast path: direct browser → Vercel Blob upload (up to 50MB).
  try {
    const blob = await upload(file, {
      handleUploadUrl: "/api/upload/id-proof",
    });
    return blob.url;
  } catch {
    // Blob not configured — fall through to the disk-based upload.
  }

  // Fallback: classic multipart upload handled server-side (localhost).
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/upload/id-proof", {
    method: "POST",
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to upload image");
  }
  return data.url;
}
