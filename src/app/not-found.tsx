import Link from "next/link";
import { Wordmark } from "@/components/layout/Wordmark";

export default function NotFound() {
  return (
    <div className="grid min-h-svh place-items-center bg-ivory px-6 py-16">
      <div className="max-w-[32rem] text-center">
        <Wordmark className="justify-center" />
        <p className="eyebrow mt-10 text-brass-ink">Page not found</p>
        <h1 className="display-section mt-5">That page does not exist.</h1>
        <p className="lede mx-auto mt-5 max-w-[26rem]">
          The link may be out of date. Everything about TMG Cleaner lives on one
          page, so this link will take you there.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex h-[52px] items-center rounded-[14px] bg-forest px-7 text-[0.9375rem] font-semibold text-paper transition-colors hover:bg-forest-deep"
        >
          Go to TMG Cleaner
        </Link>
      </div>
    </div>
  );
}
