import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth/session";
import { AdminShell } from "@/components/admin/AdminShell";

/**
 * Authorisation boundary for the whole dashboard.
 *
 * proxy.ts only checks that a session cookie exists. This is where the cookie
 * is actually verified against Firebase, including revocation and the
 * superAdmin claim, so a forged or stale cookie gets no further than here.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");

  return <AdminShell user={user}>{children}</AdminShell>;
}
