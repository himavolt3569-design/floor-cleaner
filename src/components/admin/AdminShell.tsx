"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Wordmark } from "@/components/layout/Wordmark";
import { cn } from "@/lib/utils/cn";
import type { AdminUser } from "@/lib/auth/session";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/delivery", label: "Delivery" },
  { href: "/admin/content", label: "Content" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminShell({
  user,
  children,
}: {
  user: AdminUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const signOut = async () => {
    await fetch("/api/auth/session", { method: "DELETE" });
    router.replace("/admin/login");
    router.refresh();
  };

  return (
    <div className="min-h-svh lg:grid lg:grid-cols-[15rem_1fr]">
      {/* Sidebar */}
      <aside
        className={cn(
          "border-charcoal/12 bg-paper lg:sticky lg:top-0 lg:h-svh lg:border-r",
          "flex flex-col",
        )}
      >
        <div className="flex items-center justify-between border-b border-charcoal/12 px-5 py-4 lg:border-b-0">
          <Link href="/admin" className="rounded-[8px]">
            <Wordmark />
          </Link>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="admin-nav"
            className="grid h-8 w-8 place-items-center rounded-[9px] text-charcoal hover:bg-charcoal/[0.06] lg:hidden"
          >
            <span className="sr-only">Toggle navigation</span>
            <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
              <path d="M3.5 6h13M3.5 10h13M3.5 14h13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <nav
          id="admin-nav"
          aria-label="Admin"
          className={cn("px-3 pb-4 lg:block lg:flex-1 lg:pt-3", open ? "block" : "hidden")}
        >
          <ul className="space-y-0.5">
            {NAV.map((item) => {
              const active =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    prefetch={true}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "block rounded-[10px] px-3 py-2 text-[0.875rem] font-medium transition-colors",
                      active
                        ? "bg-forest text-paper"
                        : "text-muted hover:bg-charcoal/[0.05] hover:text-charcoal",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div
          className={cn(
            "border-t border-charcoal/12 px-5 py-4 lg:block",
            open ? "block" : "hidden",
          )}
        >
          <p className="truncate text-[0.75rem] text-muted">{user.email}</p>
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={signOut}
              className="text-[0.8125rem] font-semibold text-charcoal underline decoration-charcoal/30 underline-offset-4 hover:decoration-charcoal"
            >
              Sign out
            </button>
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="text-[0.8125rem] text-muted underline decoration-charcoal/20 underline-offset-4 hover:text-charcoal"
            >
              View store
            </a>
          </div>
        </div>
      </aside>

      <main className="min-w-0 px-5 py-8 sm:px-8 lg:px-10">{children}</main>
    </div>
  );
}
