import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth/session";
import { isAdminConfigured } from "@/lib/firebase/admin";
import { LoginForm } from "@/components/admin/LoginForm";
import { Wordmark } from "@/components/layout/Wordmark";

export default async function AdminLoginPage({
  searchParams,
}: PageProps<"/admin/login">) {
  const existing = await getAdminUser();
  if (existing) redirect("/admin");

  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "/admin";
  const configured = isAdminConfigured();

  return (
    <div className="grid min-h-svh place-items-center px-5 py-12">
      <div className="w-full max-w-[24rem]">
        <div className="mb-8 text-center">
          <Wordmark className="justify-center" />
          <h1 className="display-sub mt-6">Admin sign in</h1>
          <p className="mt-2 text-[0.875rem] text-muted">
            For TMG Cleaner staff accounts only.
          </p>
        </div>

        {configured ? (
          <LoginForm next={next.startsWith("/admin") ? next : "/admin"} />
        ) : (
          <div className="rounded-[16px] border border-caution/35 bg-caution/[0.06] p-5">
            <p className="text-[0.875rem] font-semibold text-caution">
              Firebase is not configured
            </p>
            <p className="mt-2 text-[0.8125rem] leading-relaxed text-caution/90">
              Add the Firebase server credentials to the environment and restart
              the app. See README.md for the exact variables and for the command
              that grants the first admin account.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
