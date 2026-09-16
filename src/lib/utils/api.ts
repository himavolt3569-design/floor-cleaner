import "server-only";

import { NextResponse } from "next/server";
import { CommerceError } from "@/lib/commerce/pricing";
import { GuardError } from "@/lib/utils/request-guard";
import { FirebaseUnavailableError } from "@/lib/firebase/admin";

/**
 * Single place that turns a thrown error into a response.
 *
 * Known, safe-to-show errors keep their message. Everything else is logged
 * server side and replaced with a neutral sentence, so internal details never
 * reach the browser.
 */
export function errorResponse(error: unknown) {
  if (error instanceof GuardError) {
    return NextResponse.json(
      { ok: false, error: error.message },
      {
        status: error.status,
        headers: error.retryAfter
          ? { "retry-after": String(error.retryAfter) }
          : undefined,
      },
    );
  }

  if (error instanceof CommerceError) {
    return NextResponse.json(
      { ok: false, error: error.message, code: error.code },
      { status: error.status },
    );
  }

  if (error instanceof FirebaseUnavailableError) {
    return NextResponse.json(
      {
        ok: false,
        code: "firebase_unavailable",
        error:
          "The store is not connected to its database yet, so orders cannot be placed. Please contact us to order.",
      },
      { status: 503 },
    );
  }

  console.error("[api] unexpected error:", error);
  return NextResponse.json(
    { ok: false, error: "Something went wrong on our side. Please try again." },
    { status: 500 },
  );
}

export const noStore = { "cache-control": "no-store" } as const;
