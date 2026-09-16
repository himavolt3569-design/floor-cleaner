import { cn } from "@/lib/utils/cn";

/**
 * TMG Cleaner lockup. A tightly tracked bold "TMG" against the letterspaced
 * word CLEANER, divided by a brass hairline. In a single-typeface system the
 * logo has to earn its distinction from weight and spacing rather than from a
 * contrasting face, so the two halves sit at opposite ends of both.
 *
 * Deliberately small: the product is the hero, not the logo.
 */
export function Wordmark({
  className,
  tone = "dark",
}: {
  className?: string;
  tone?: "dark" | "light";
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "font-display text-[1.3125rem] font-bold leading-none tracking-[-0.055em]",
          tone === "dark" ? "text-charcoal" : "text-paper",
        )}
      >
        TMG
      </span>
      <span
        aria-hidden="true"
        className="h-[18px] w-px shrink-0 bg-brass/55"
      />
      <span
        className={cn(
          "text-[0.6rem] font-semibold uppercase leading-none tracking-[0.2em]",
          tone === "dark" ? "text-muted" : "text-stone/85",
        )}
      >
        Cleaner
      </span>
    </span>
  );
}
