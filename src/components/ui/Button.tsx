import * as React from "react";
import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "dark" | "quiet" | "onDark";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-forest text-paper hover:bg-forest-deep active:bg-forest-deep disabled:bg-forest/45",
  secondary:
    "bg-transparent text-charcoal border border-charcoal/20 hover:border-charcoal/45 hover:bg-charcoal/[0.04]",
  dark: "bg-charcoal text-paper hover:bg-espresso",
  onDark:
    "bg-brass text-charcoal hover:bg-brass-light border border-transparent disabled:bg-paper/50",
  quiet:
    "bg-transparent text-charcoal hover:bg-charcoal/[0.05] border border-transparent",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-4 text-[0.8125rem] rounded-[10px]",
  md: "h-11 px-5 text-[0.875rem] rounded-[12px]",
  lg: "h-[54px] px-7 text-[0.9375rem] rounded-full",
};

const BASE =
  "inline-flex items-center justify-center gap-2 font-semibold tracking-[0.01em] " +
  "transition-[background-color,border-color,color,opacity] duration-200 ease-out " +
  "select-none disabled:cursor-not-allowed disabled:opacity-60 " +
  // Nudges the label 1px on hover; the arrow (if present) moves further.
  "[&>span]:transition-transform [&>span]:duration-200 hover:[&>span]:translate-x-[1px] " +
  "[&_[data-arrow]]:transition-transform [&_[data-arrow]]:duration-200 hover:[&_[data-arrow]]:translate-x-[3px]";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  full?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", full, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(BASE, VARIANTS[variant], SIZES[size], full && "w-full", className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export interface LinkButtonProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: Variant;
  size?: Size;
  full?: boolean;
}

export const LinkButton = React.forwardRef<HTMLAnchorElement, LinkButtonProps>(
  ({ className, variant = "primary", size = "md", full, ...props }, ref) => (
    <a
      ref={ref}
      className={cn(BASE, VARIANTS[variant], SIZES[size], full && "w-full", className)}
      {...props}
    />
  ),
);
LinkButton.displayName = "LinkButton";

/** Small right arrow used inside CTAs. Decorative only. */
export function Arrow({ className }: { className?: string }) {
  return (
    <svg
      data-arrow
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={cn("h-3.5 w-3.5", className)}
    >
      <path
        d="M2.5 8h10M9 4.5 12.5 8 9 11.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
