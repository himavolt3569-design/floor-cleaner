import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/session";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/svg+xml",
  "image/gif",
]);

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized. Super admin access required." },
        { status: 401 },
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "No valid file uploaded." },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { ok: false, error: "File exceeds 15MB limit." },
        { status: 400 },
      );
    }

    if (file.type && !ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { ok: false, error: "Only image files (JPEG, PNG, WebP, AVIF, SVG, GIF) are allowed." },
        { status: 400 },
      );
    }

    const rawFolder = (formData.get("folder") as string) || "general";
    const folder = rawFolder.replace(/[^a-zA-Z0-9_-]/g, "") || "general";
    const extension = path.extname(file.name).slice(0, 10) || ".jpg";
    const cleanBase = path
      .basename(file.name, extension)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 40);
    const safeName = `${Date.now()}-${cleanBase || "image"}${extension}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Persistent cloud storage in Firestore (100% Free on Spark plan, zero Blaze/credit card needed, works on Vercel)
    let mediaUrl: string | null = null;
    try {
      const { saveMediaToFirestore } = await import("@/lib/data/media");
      mediaUrl = await saveMediaToFirestore(buffer, file.type || "image/jpeg", file.name, folder);
    } catch (firestoreErr) {
      console.warn("[upload] Firestore media save failed:", firestoreErr);
    }

    // 2. Local mirror in public/uploads if filesystem is writable
    try {
      const uploadDir = path.join(process.cwd(), "public", "uploads", folder);
      await fs.mkdir(uploadDir, { recursive: true });
      const filePath = path.join(uploadDir, safeName);
      await fs.writeFile(filePath, buffer);
    } catch {
      // Ignored on read-only serverless filesystems (e.g. Vercel)
    }

    // Return the permanent Firestore media URL (or fallback to local /uploads/ if Firestore failed)
    const finalUrl = mediaUrl || `/uploads/${folder}/${safeName}`;
    return NextResponse.json({ ok: true, url: finalUrl });
  } catch (error) {
    console.error("[upload route] Failed to process upload:", error);
    return NextResponse.json(
      { ok: false, error: "Upload failed. Please try again." },
      { status: 500 },
    );
  }
}
