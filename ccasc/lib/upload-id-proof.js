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
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const pathname = `id-proofs/${Date.now()}-${safeName}`;
    const blob = await upload(pathname, file, {
      handleUploadUrl: "/api/upload/id-proof",
      contentType: file.type,
      access: "public",
    });
    return blob.url;
  } catch (blobError) {
    // Surface the real reason so it's easy to diagnose (e.g. token missing
    // on the deployment, route returning 500, CORS issues in dev).
    console.error(
      "[uploadIdProof] Vercel Blob direct upload failed:",
      blobError?.message || blobError
    );
  }

  // Fallback: classic multipart upload handled server-side (localhost).
  // NOTE: on Vercel this path fails above ~4.5MB (platform body limit).
  let data = null;
  let res = null;
  try {
    const formData = new FormData();
    formData.append("file", file);
    res = await fetch("/api/upload/id-proof", {
      method: "POST",
      body: formData,
    });
    data = await res.json();
  } catch {
    // A non-JSON 413 "Request Entity Too Large" lands here on Vercel.
    throw new Error(
      "Image too large for this server. Large uploads require Vercel Blob storage to be connected (BLOB_READ_WRITE_TOKEN)."
    );
  }
  if (!res.ok || !data?.url) {
    throw new Error(data?.error || "Failed to upload image");
  }
  return data.url;
}
