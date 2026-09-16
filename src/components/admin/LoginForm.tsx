"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";

/**
 * Signs in against Firebase Auth in the browser, then hands the resulting ID
 * token to the server exactly once so it can mint an httpOnly session cookie.
 * The password never reaches our server, and the ID token is never stored.
 */
export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(undefined);
    setBusy(true);

    try {
      const { getFirebaseAuth } = await import("@/lib/firebase/client");
      const auth = getFirebaseAuth();

      if (!auth) {
        setError("Firebase is not configured in this browser build.");
        setBusy(false);
        return;
      }

      const { signInWithEmailAndPassword } = await import("firebase/auth");
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await credential.user.getIdToken();

      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        // Drop the client session too: a non-admin must not stay signed in.
        await auth.signOut().catch(() => {});
        setError(data?.error ?? "We could not sign you in.");
        setBusy(false);
        return;
      }

      router.replace(next);
      router.refresh();
    } catch (err) {
      // Firebase Auth error codes are deliberately collapsed into one message
      // so this form cannot be used to discover which emails exist.
      const code = (err as { code?: string })?.code ?? "";
      setError(
        code === "auth/too-many-requests"
          ? "Too many attempts. Wait a few minutes and try again."
          : "Email or password is incorrect.",
      );
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-[18px] border border-charcoal/12 bg-paper p-6">
      <Input
        label="Email"
        type="email"
        required
        autoComplete="username"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Input
        label="Password"
        type="password"
        required
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {error && (
        <p
          role="alert"
          className="rounded-[10px] border border-critical/35 bg-critical/[0.04] p-3 text-[0.8125rem] font-medium text-critical"
        >
          {error}
        </p>
      )}

      <Button type="submit" full size="lg" disabled={busy}>
        <span>{busy ? "Signing in..." : "Sign in"}</span>
      </Button>
    </form>
  );
}
