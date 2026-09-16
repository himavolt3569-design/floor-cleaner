import { NextResponse } from "next/server";
import { adminLoginSchema } from "@/lib/validation/schemas";
import { endSession, NotAuthorisedError, startSession } from "@/lib/auth/session";
import { assertSameOrigin, clientIp, rateLimit } from "@/lib/utils/request-guard";
import { errorResponse, noStore } from "@/lib/utils/api";

export const dynamic = "force-dynamic";

/** Exchanges a freshly minted Firebase ID token for an admin session cookie. */
export async function POST(request: Request) {
  try {
    await assertSameOrigin();
    // Brute force protection sits on top of Firebase Auth's own throttling.
    await rateLimit("admin-login", await clientIp(), 10, 600);

    const body = await request.json().catch(() => null);
    const parsed = adminLoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Sign in again." },
        { status: 400, headers: noStore },
      );
    }

    const user = await startSession(parsed.data.idToken);
    return NextResponse.json({ ok: true, user }, { headers: noStore });
  } catch (error) {
    if (error instanceof NotAuthorisedError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 403, headers: noStore },
      );
    }
    // Any other verification failure is reported as a plain sign-in failure so
    // the response cannot be used to probe which accounts exist.
    if (error instanceof Error && error.name === "FirebaseAuthError") {
      return NextResponse.json(
        { ok: false, error: "We could not sign you in. Please try again." },
        { status: 401, headers: noStore },
      );
    }
    return errorResponse(error);
  }
}

export async function DELETE() {
  try {
    await assertSameOrigin();
    await endSession();
    return NextResponse.json({ ok: true }, { headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}
