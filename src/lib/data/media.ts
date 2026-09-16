import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { requireDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";

const CHUNK_SIZE = 650 * 1024; // 650 KB (well within Firestore 1MB doc limit)

export interface MediaDoc {
  id: string;
  name: string;
  contentType: string;
  size: number;
  chunksCount: number;
  data?: string;
}

/**
 * Saves an image to Firestore so it works 100% on Vercel without Cloud Storage / Blaze plan.
 * Returns the public URL `/api/media/${id}`.
 */
export async function saveMediaToFirestore(
  buffer: Buffer,
  contentType: string,
  originalName: string,
  folder = "general",
): Promise<string> {
  const db = requireDb();
  const cleanFolder = folder.replace(/[^a-zA-Z0-9_-]/g, "") || "general";
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-40);
  const id = `${cleanFolder}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  if (buffer.length <= CHUNK_SIZE) {
    // Single document
    await db.collection(COLLECTIONS.media).doc(id).set({
      id,
      name: safeName,
      contentType: contentType || "image/jpeg",
      size: buffer.length,
      chunksCount: 1,
      data: buffer.toString("base64"),
      createdAt: FieldValue.serverTimestamp(),
    });
  } else {
    // Multi-chunk document
    const chunks: Buffer[] = [];
    for (let i = 0; i < buffer.length; i += CHUNK_SIZE) {
      chunks.push(buffer.subarray(i, i + CHUNK_SIZE));
    }

    const docRef = db.collection(COLLECTIONS.media).doc(id);
    await docRef.set({
      id,
      name: safeName,
      contentType: contentType || "image/jpeg",
      size: buffer.length,
      chunksCount: chunks.length,
      createdAt: FieldValue.serverTimestamp(),
    });

    const batch = db.batch();
    chunks.forEach((chunk, index) => {
      const chunkRef = docRef.collection("chunks").doc(String(index));
      batch.set(chunkRef, {
        index,
        data: chunk.toString("base64"),
      });
    });
    await batch.commit();
  }

  return `/api/media/${id}`;
}

/**
 * Reads an image from Firestore by its media ID.
 */
export async function getMediaFromFirestore(
  id: string,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const db = requireDb();
    const docRef = db.collection(COLLECTIONS.media).doc(id);
    const snap = await docRef.get();

    if (!snap.exists) return null;

    const data = snap.data() as MediaDoc | undefined;
    if (!data) return null;

    if (data.chunksCount <= 1 && data.data) {
      return {
        buffer: Buffer.from(data.data, "base64"),
        contentType: data.contentType || "image/jpeg",
      };
    }

    // Read chunks in order
    const chunksSnap = await docRef
      .collection("chunks")
      .orderBy("index", "asc")
      .get();

    const parts: Buffer[] = [];
    chunksSnap.docs.forEach((d) => {
      const chunkData = d.data();
      if (typeof chunkData.data === "string") {
        parts.push(Buffer.from(chunkData.data, "base64"));
      }
    });

    if (!parts.length) return null;

    return {
      buffer: Buffer.concat(parts),
      contentType: data.contentType || "image/jpeg",
    };
  } catch (error) {
    console.error("[getMediaFromFirestore error]", error);
    return null;
  }
}
