"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils/cn";

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Shared behaviour for the cart drawer and the checkout modal:
 * focus is moved in and trapped, Escape closes, background scroll is locked,
 * and focus returns to whatever opened it.
 */
function useOverlayBehaviour(open: boolean, onClose: () => void) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const restoreRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!open) return;

    restoreRef.current = document.activeElement as HTMLElement | null;

    const { overflow, paddingRight } = document.body.style;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;

    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panel) return;

      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (!items.length) return;

      const firstItem = items[0];
      const lastItem = items[items.length - 1];

      if (e.shiftKey && document.activeElement === firstItem) {
        e.preventDefault();
        lastItem.focus();
      } else if (!e.shiftKey && document.activeElement === lastItem) {
        e.preventDefault();
        firstItem.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
      restoreRef.current?.focus?.();
    };
  }, [open, onClose]);

  return panelRef;
}

/**
 * True only after hydration. useSyncExternalStore gives the server and the
 * first client render the same answer without a setState-in-effect cascade,
 * which matters because portals cannot be created during SSR.
 */
const neverChanges = () => () => {};
function useMounted() {
  return React.useSyncExternalStore(
    neverChanges,
    () => true,
    () => false,
  );
}

interface BaseProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Rendered instead of the plain heading when the header needs more than text. */
  header?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/* ------------------------------------------------------------------ drawer */

export function Drawer({ open, onClose, title, header, children, footer }: BaseProps) {
  const panelRef = useOverlayBehaviour(open, onClose);
  const mounted = useMounted();
  const titleId = React.useId();

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80]">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-charcoal/45 motion-safe:animate-[fadeIn_240ms_ease-out]"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "absolute right-0 top-0 flex h-full w-full max-w-[26.5rem] flex-col",
          "bg-ivory shadow-[-18px_0_48px_rgba(30,28,25,0.14)] outline-none",
          "sm:rounded-l-[20px] motion-safe:animate-[slideIn_360ms_cubic-bezier(0.16,1,0.3,1)]",
        )}
      >
        <div className="flex items-center justify-between gap-4 border-b border-charcoal/10 px-5 py-4">
          {header ?? (
            <h2 id={titleId} className="font-sans text-[0.95rem] font-bold tracking-[-0.01em]">
              {title}
            </h2>
          )}
          <CloseButton onClick={onClose} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
        {footer && <div className="border-t border-charcoal/10 bg-paper px-5 py-4">{footer}</div>}
      </div>
      <OverlayKeyframes />
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------- modal */

export function Modal({
  open,
  onClose,
  title,
  header,
  children,
  footer,
  wide,
}: BaseProps & { wide?: boolean }) {
  const panelRef = useOverlayBehaviour(open, onClose);
  const mounted = useMounted();
  const titleId = React.useId();

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-charcoal/50 motion-safe:animate-[fadeIn_240ms_ease-out]"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "relative flex max-h-[94svh] w-full flex-col overflow-hidden bg-ivory outline-none",
          "rounded-t-[22px] sm:rounded-[22px] shadow-[0_24px_70px_rgba(30,28,25,0.24)]",
          "motion-safe:animate-[riseIn_340ms_cubic-bezier(0.16,1,0.3,1)]",
          wide ? "sm:max-w-[58rem]" : "sm:max-w-[34rem]",
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-charcoal/10 bg-paper px-5 py-4 sm:px-6">
          {header ?? (
            <h2 id={titleId} className="font-sans text-[0.95rem] font-bold tracking-[-0.01em]">
              {title}
            </h2>
          )}
          <CloseButton onClick={onClose} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-charcoal/10 bg-paper px-5 py-4 sm:px-6">
            {footer}
          </div>
        )}
      </div>
      <OverlayKeyframes />
    </div>,
    document.body,
  );
}

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Close"
      className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] text-muted transition-colors hover:bg-charcoal/[0.06] hover:text-charcoal"
    >
      <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
        <path
          d="m4 4 8 8M12 4l-8 8"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}

/**
 * Keyframes live here rather than in globals.css so the overlay ships them
 * only when one is actually opened.
 */
function OverlayKeyframes() {
  return (
    <style>{`
      @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
      @keyframes slideIn { from { transform: translateX(100%) } to { transform: translateX(0) } }
      @keyframes riseIn { from { opacity: 0; transform: translateY(18px) } to { opacity: 1; transform: translateY(0) } }
    `}</style>
  );
}
