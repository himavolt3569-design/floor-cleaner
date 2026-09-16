import { NextRequest, NextResponse } from "next/server";
import { getMediaFromFirestore } from "@/lib/data/media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await props.params;
    if (!id || typeof id !== "string") {
      return new NextResponse("Not Found", { status: 404 });
    }

    const media = await getMediaFromFirestore(id);
    if (!media) {
      return new NextResponse("Image Not Found", { status: 404 });
    }

    return new Response(new Uint8Array(media.buffer), {
      status: 200,
      headers: {
        "Content-Type": media.contentType || "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": String(media.buffer.length),
      },
    });
  } catch (error) {
    console.error("[api/media error]", error);
    return new NextResponse("Server Error", { status: 500 });
  }
}
