import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin, clientIp, rateLimit } from "@/lib/utils/request-guard";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 6 * 1024 * 1024; // 6MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(req: NextRequest) {
  try {
    await assertSameOrigin();
    await rateLimit("checkout-upload-proof", await clientIp(), 10, 300);

    const formData = await req.formData();
    const file = formData.get("file");
    const rawOrderId = formData.get("orderId");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "No image file provided." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ ok: false, error: "Screenshot exceeds 6MB limit." }, { status: 400 });
    }

    if (file.type && !ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ ok: false, error: "Only JPEG, PNG, or WebP images are allowed." }, { status: 400 });
    }

    const orderId = typeof rawOrderId === "string" ? rawOrderId.replace(/[^a-zA-Z0-9_-]/g, "") : "general";
    const extension = path.extname(file.name).slice(0, 10) || ".jpg";
    const cleanBase = path.basename(file.name, extension).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40);
    const safeName = `${Date.now()}-${cleanBase || "proof"}${extension}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Persistent cloud storage in Firestore (100% Free, works on Vercel)
    let mediaUrl: string | null = null;
    try {
      const { saveMediaToFirestore } = await import("@/lib/data/media");
      mediaUrl = await saveMediaToFirestore(buffer, file.type || "image/jpeg", file.name, `proof_${orderId}`);
    } catch (firestoreErr) {
      console.warn("[upload-proof] Firestore media save failed:", firestoreErr);
    }

    // 2. Local mirror if filesystem is writable
    try {
      const uploadDir = path.join(process.cwd(), "public", "uploads", "payment-proofs", orderId);
      await fs.mkdir(uploadDir, { recursive: true });
      const filePath = path.join(uploadDir, safeName);
      await fs.writeFile(filePath, buffer);
    } catch {
      // Ignored on read-only serverless filesystems
    }

    const finalPath = mediaUrl || `/uploads/payment-proofs/${orderId}/${safeName}`;
    return NextResponse.json({ ok: true, path: finalPath });
  } catch (err) {
    console.error("[upload-proof error]", err);
    return NextResponse.json({ ok: false, error: "Could not upload proof screenshot." }, { status: 500 });
  }
}
