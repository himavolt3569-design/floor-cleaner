/**
 * Grants or revokes super admin access.
 *
 *   pnpm grant-admin someone@example.com
 *   pnpm grant-admin someone@example.com --revoke
 *
 * Admin access is a Firebase custom claim, not a database row, so it is carried
 * inside the signed token and verified on every request. There is deliberately
 * no way to grant this from inside the application: it requires the service
 * account and a terminal.
 */
import { cert, initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const email = process.argv[2];
const revoke = process.argv.includes("--revoke");

if (!email || !email.includes("@")) {
  console.error("Usage: pnpm grant-admin <email> [--revoke]");
  process.exit(1);
}

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const rawKey = process.env.FIREBASE_PRIVATE_KEY;

if (!projectId || !clientEmail || !rawKey) {
  console.error(
    "Missing Firebase credentials. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL\n" +
      "and FIREBASE_PRIVATE_KEY in .env.local first.",
  );
  process.exit(1);
}

const privateKey = rawKey.includes("\\n") ? rawKey.replace(/\\n/g, "\n") : rawKey;

if (!getApps().length) {
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId });
}

async function main() {
  const auth = getAuth();
  const user = await auth.getUserByEmail(email).catch(() => null);

  if (!user) {
    console.error(
      `No Firebase Auth user with the email ${email}.\n` +
        "Create the account first in the Firebase console under Authentication,\n" +
        "using the Email/Password provider, then run this again.",
    );
    process.exit(1);
  }

  await auth.setCustomUserClaims(user.uid, revoke ? null : { superAdmin: true });

  // Force existing sessions to be re-evaluated against the new claim.
  await auth.revokeRefreshTokens(user.uid);

  console.log(
    revoke
      ? `Revoked admin access for ${email}. Existing sessions have been ended.`
      : `Granted admin access to ${email}. They can now sign in at /admin/login.`,
  );
}

main().catch((error) => {
  console.error("Failed:", error);
  process.exit(1);
});
