"use client";

import { cn } from "@/lib/utils/cn";

export function QuantitySelector({
  value,
  onChange,
  max = 99,
  min = 1,
  size = "md",
  label = "Quantity",
  disabled,
}: {
  value: number;
  onChange: (next: number) => void;
  max?: number;
  min?: number;
  size?: "sm" | "md";
  label?: string;
  disabled?: boolean;
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const box = size === "sm" ? "h-9" : "h-11";
  const btn = size === "sm" ? "w-9" : "w-11";

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-[11px] border border-charcoal/18 bg-paper",
        box,
        disabled && "opacity-55",
      )}
    >
      <button
        type="button"
        onClick={() => onChange(clamp(value - 1))}
        disabled={disabled || value <= min}
        aria-label={`Decrease ${label.toLowerCase()}`}
        className={cn(
          "grid h-full place-items-center rounded-l-[10px] text-charcoal transition-colors",
          "hover:bg-charcoal/[0.06] disabled:cursor-not-allowed disabled:text-faint disabled:hover:bg-transparent",
          btn,
        )}
      >
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
          <path d="M3.5 8h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>

      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        disabled={disabled}
        aria-label={label}
        onChange={(e) => {
          const next = Number(e.target.value.replace(/\D/g, ""));
          if (Number.isFinite(next) && next > 0) onChange(clamp(next));
        }}
        className={cn(
          "tabular h-full w-10 border-x border-charcoal/12 bg-transparent text-center",
          "text-[0.9375rem] font-semibold text-charcoal focus:outline-none",
          "focus-visible:bg-charcoal/[0.04]",
        )}
      />

      <button
        type="button"
        onClick={() => onChange(clamp(value + 1))}
        disabled={disabled || value >= max}
        aria-label={`Increase ${label.toLowerCase()}`}
        className={cn(
          "grid h-full place-items-center rounded-r-[10px] text-charcoal transition-colors",
          "hover:bg-charcoal/[0.06] disabled:cursor-not-allowed disabled:text-faint disabled:hover:bg-transparent",
          btn,
        )}
      >
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
          <path d="M8 3.5v9M3.5 8h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
