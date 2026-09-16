"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

/**
 * Whole-page failure. Calm language, one obvious action, and never a blank
 * screen. The underlying error is logged rather than shown: an end user cannot
 * act on a stack trace, and it may contain internals.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[page error]", error);
  }, [error]);

  return (
    <div className="grid min-h-svh place-items-center bg-ivory px-6 py-16">
      <div className="max-w-[32rem] text-center">
        <p className="eyebrow text-brass-ink">Something went wrong</p>
        <h1 className="display-section mt-5">
          The page did not load properly.
        </h1>
        <p className="lede mx-auto mt-5 max-w-[26rem]">
          This is on our side, not yours. Try again, and if it keeps happening
          please contact us and we will take the order by phone.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button size="lg" onClick={reset}>
            <span>Try again</span>
          </Button>
          <Link
            href="/"
            className="inline-flex h-[52px] items-center rounded-[14px] border border-charcoal/20 px-7 text-[0.9375rem] font-semibold text-charcoal transition-colors hover:border-charcoal/45"
          >
            Back to the start
          </Link>
        </div>

        {error.digest && (
          <p className="tabular mt-8 text-[0.75rem] text-faint">
            Reference {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
