"use client";

import Image from "next/image";
import { useCallback, useId, useRef, useState } from "react";
import { useLanguage } from "@/lib/store/language";
import { TRANSLATIONS } from "@/config/translations";
import type { ComparisonEntry } from "@/types";

/**
 * Draggable before/after comparison.
 *
 * Works with pointer, touch and keyboard. The handle is a real ARIA slider, so
 * a keyboard user can reveal the result with the arrow keys and hear the
 * position announced. Photography is supplied by the business; nothing here
 * simulates a cleaning result.
 */
export function BeforeAfterSlider({
  entry,
  priority,
}: {
  entry: ComparisonEntry;
  priority?: boolean;
}) {
  const { lang } = useLanguage();
  const t = TRANSLATIONS[lang];
  const [position, setPosition] = useState(50);
  const [dragging, setDragging] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const labelId = useId();

  const label = (lang === "ne" && t.results.items[entry.id]?.label) || entry.label;
  const caption = (lang === "ne" && t.results.items[entry.id]?.caption) || entry.caption;

  const beforeSrc = entry.beforeImage?.trim() || "/results/marble-before.webp";
  const afterSrc = entry.afterImage?.trim() || "/results/marble-after.webp";

  const setFromClientX = useCallback((clientX: number) => {
    const frame = frameRef.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, pct)));
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Ignore secondary buttons so a right click does not yank the divider.
    if (e.button !== 0 && e.pointerType === "mouse") return;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
    setDragging(true);
    setFromClientX(e.clientX);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setFromClientX(e.clientX);
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setDragging(false);
    try {
      const el = e.currentTarget as HTMLElement;
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    } catch {}
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 2;
    let next: number | null = null;

    if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = position - step;
    else if (e.key === "ArrowRight" || e.key === "ArrowUp") next = position + step;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = 100;
    else if (e.key === "PageDown") next = position - 10;
    else if (e.key === "PageUp") next = position + 10;

    if (next === null) return;
    e.preventDefault();
    setPosition(Math.min(100, Math.max(0, next)));
  };

  const rounded = Math.round(position);

  return (
    <figure className="group/fig">
      <div
        ref={frameRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="relative aspect-[620/677] w-full touch-none select-none overflow-hidden rounded-[20px] bg-espresso"
      >
        {/* After: the full frame underneath, revealed as the divider moves left. */}
        <Image
          src={afterSrc}
          alt={`${entry.label} surface after cleaning with TMG Cleaner`}
          fill
          priority={priority}
          sizes="(max-width: 639px) 92vw, (max-width: 1023px) 46vw, 31vw"
          className="object-cover"
          draggable={false}
        />

        {/* Before sits on top, clipped from the left edge to the divider, so the
            frame reads before-then-after in the same direction as the text. */}
        <div
          className="absolute inset-0"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        >
          <Image
            src={beforeSrc}
            alt={`${entry.label} surface before cleaning, showing stains and dirt`}
            fill
            priority={priority}
            sizes="(max-width: 639px) 92vw, (max-width: 1023px) 46vw, 31vw"
            className="object-cover"
            draggable={false}
          />
        </div>

        {/* Corner labels. Text, not colour, carries the meaning. */}
        <span className="pointer-events-none absolute left-3 top-3 rounded-[7px] bg-charcoal/78 px-2 py-1 text-[0.5625rem] font-bold uppercase tracking-[0.16em] text-paper">
          {t.results.before}
        </span>
        <span className="pointer-events-none absolute right-3 top-3 rounded-[7px] bg-charcoal/78 px-2 py-1 text-[0.5625rem] font-bold uppercase tracking-[0.16em] text-paper">
          {t.results.after}
        </span>

        {/* Divider */}
        <div
          className="pointer-events-none absolute inset-y-0 w-px bg-paper/90"
          style={{ left: `${position}%` }}
          aria-hidden="true"
        />

        {/* Handle */}
        <div
          role="slider"
          tabIndex={0}
          aria-labelledby={labelId}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={rounded}
          aria-valuetext={`${100 - rounded}% of the cleaned result shown`}
          onKeyDown={onKeyDown}
          className="absolute top-1/2 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize place-items-center rounded-full bg-paper text-charcoal shadow-[0_3px_14px_rgba(30,28,25,0.3)] transition-[box-shadow,transform] duration-200 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-paper"
          style={{ left: `${position}%` }}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
            <path
              d="M9.5 8 6 12l3.5 4M14.5 8l3.5 4-3.5 4"
              stroke="currentColor"
              strokeWidth="1.7"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      <figcaption className="mt-4">
        <span
          id={labelId}
          className="font-display text-[1.35rem] leading-none tracking-[-0.02em] text-paper"
        >
          {label}
        </span>
        <p className="mt-2 text-[0.875rem] leading-relaxed text-stone/70">
          {caption}
        </p>
      </figcaption>
    </figure>
  );
}
