"use client";

import { upload } from "@vercel/blob/client";

/**
 * Uploads a facility image.
 *
 * On Vercel (a Blob read/write token is configured) the file is uploaded
 * directly from the browser to Vercel Blob, bypassing the ~4.5MB serverless
 * body limit so files up to 50MB work. Without a token (local dev) it falls
 * back to the disk-based /api/upload endpoint.
 */

/**
 * Whether this deployment can issue Blob client tokens. Probed once per session
 * and cached, so the direct-to-Blob path is only attempted when it can
 * actually succeed (local dev skips straight to the fallback).
 */
let blobConfiguredPromise = null;

function blobConfigured() {
  if (!blobConfiguredPromise) {
    blobConfiguredPromise = fetch("/api/upload", {
      method: "GET",
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => Boolean(data?.blobConfigured))
      .catch(() => false);
  }
  return blobConfiguredPromise;
}

export async function uploadFacilityImage(file) {
  // Fast path: direct browser-to-Blob upload (up to 50MB), only when a Blob
  // token is configured on the deployment.
  if (await blobConfigured()) {
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const pathname = `facilities/${Date.now()}-${safeName}`;
      const blob = await upload(pathname, file, {
        handleUploadUrl: "/api/upload",
        contentType: file.type,
        access: "public",
      });
      return blob.url;
    } catch (blobError) {
      console.warn(
        "[uploadFacilityImage] Vercel Blob direct upload failed, using server upload:",
        blobError?.message || blobError
      );
    }
  }

  // Fallback: classic multipart upload handled server-side (localhost).
  // On Vercel this path fails above ~4.5MB (platform body limit).
  let data = null;
  let res = null;
  try {
    const formData = new FormData();
    formData.append("file", file);
    res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });
    data = await res.json();
  } catch {
    throw new Error(
      "Image too large for this server. Large uploads require Vercel Blob storage to be connected."
    );
  }
  if (!res.ok || !data?.url) {
    throw new Error(data?.error || "Failed to upload image");
  }
  return data.url;
}
