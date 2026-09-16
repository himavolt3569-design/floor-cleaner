import Link from "next/link";
import { Wordmark } from "./Wordmark";

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-ivory">
      <header className="border-b border-charcoal/12">
        <div className="shell flex h-[68px] items-center justify-between">
          <Link href="/" className="rounded-[8px]">
            <Wordmark />
          </Link>
          <Link
            href="/"
            className="text-[0.8125rem] font-semibold text-charcoal underline decoration-charcoal/30 underline-offset-4 hover:decoration-charcoal"
          >
            Back to the store
          </Link>
        </div>
      </header>

      <main className="shell py-[clamp(3rem,7vw,6rem)]">
        <div className="max-w-[44rem]">
          <p className="eyebrow text-brass-ink">Legal</p>
          <h1 className="display-section mt-5">{title}</h1>
          <p className="mt-4 text-[0.8125rem] text-muted">Last updated {updated}</p>

          <div
            className={
              "mt-10 space-y-6 text-[0.9375rem] leading-[1.75] text-muted " +
              "[&_h2]:mt-12 [&_h2]:font-sans [&_h2]:text-[1.0625rem] [&_h2]:font-bold [&_h2]:tracking-[-0.01em] [&_h2]:text-charcoal " +
              "[&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_strong]:font-semibold [&_strong]:text-charcoal"
            }
          >
            {children}
          </div>
        </div>
      </main>

      <footer className="border-t border-charcoal/12 py-8">
        <div className="shell">
          <p className="text-[0.75rem] text-muted">
            &copy; {new Date().getFullYear()} TMG Cleaner
          </p>
        </div>
      </footer>
    </div>
  );
}
