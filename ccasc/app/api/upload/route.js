import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

import { requireApiAuth } from "@/lib/api-auth";

const VALID_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/jpg",
];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const EXTENSION_BY_TYPE = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
};

function safeBaseName(name) {
  return (
    String(name || "image")
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "image"
  );
}

export async function POST(request) {
  const guard = await requireApiAuth([
    "admin",
    "accounting clerk",
    "local treasury operations officer",
    "program coordinator cultural",
    "program coordinator sports",
  ]);
  if (guard.response) return guard.response;

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!VALID_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.",
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size too large. Maximum is 5MB." },
        { status: 400 }
      );
    }

    const extension =
      EXTENSION_BY_TYPE[file.type] ||
      path.extname(String(file.name || "")).toLowerCase();
    const filename = `${Date.now()}-${safeBaseName(file.name)}${extension}`;

    // Production uses Vercel Blob. When no token is configured (local dev), we
    // fall back to the public/uploads folder so the feature still works.
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(`facilities/${filename}`, file, {
        access: "public",
        contentType: file.type,
      });
      return NextResponse.json({ url: blob.url, filename: blob.pathname });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const uploadDir = path.join(process.cwd(), "public", "uploads", "facilities");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), buffer);

    console.warn(
      "BLOB_READ_WRITE_TOKEN is not set - saved the image to public/uploads instead of Vercel Blob."
    );

    return NextResponse.json({
      url: `/uploads/facilities/${filename}`,
      filename,
    });
  } catch (error) {
    console.error("Failed to upload file:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
