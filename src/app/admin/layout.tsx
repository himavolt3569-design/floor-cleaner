import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin",
  // The admin must never appear in search results or be framed.
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Shell shared by the sign-in page and the dashboard. The authorisation gate
 * lives in the (dashboard) group so the login route stays reachable.
 */
export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-svh bg-ivory">{children}</div>;
}
