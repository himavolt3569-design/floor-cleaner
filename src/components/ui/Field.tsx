"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

const CONTROL =
  "w-full rounded-[10px] border bg-paper px-3.5 text-[0.9375rem] text-charcoal " +
  "placeholder:text-faint transition-colors duration-200 " +
  "focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/18 " +
  "disabled:bg-stone/40 disabled:text-muted";

const OK = "border-charcoal/18 hover:border-charcoal/30";
const BAD = "border-critical/60 bg-critical/[0.03]";

function useFieldIds(id: string | undefined, error?: string, hint?: string) {
  const auto = React.useId();
  const fieldId = id ?? auto;
  const errorId = error ? `${fieldId}-error` : undefined;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  return {
    fieldId,
    errorId,
    hintId,
    describedBy: [errorId, hintId].filter(Boolean).join(" ") || undefined,
  };
}

function Label({
  htmlFor,
  children,
  required,
}: {
  htmlFor: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-muted"
    >
      {children}
      {required && (
        <span className="ml-1 text-terracotta" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
}

function Messages({
  error,
  errorId,
  hint,
  hintId,
}: {
  error?: string;
  errorId?: string;
  hint?: string;
  hintId?: string;
}) {
  return (
    <>
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-[0.75rem] text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="mt-1.5 flex items-start gap-1.5 text-[0.75rem] font-medium text-critical"
        >
          {/* Icon plus text: status is never communicated by colour alone. */}
          <svg viewBox="0 0 16 16" className="mt-[3px] h-3 w-3 shrink-0" aria-hidden="true">
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4" fill="none" />
            <path d="M8 4.5v4M8 11h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          {error}
        </p>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ input */

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, id, className, required, ...props }, ref) => {
    const { fieldId, errorId, hintId, describedBy } = useFieldIds(id, error, hint);
    return (
      <div className={className}>
        <Label htmlFor={fieldId} required={required}>
          {label}
        </Label>
        <input
          ref={ref}
          id={fieldId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(CONTROL, "h-11", error ? BAD : OK)}
          {...props}
        />
        <Messages error={error} errorId={errorId} hint={hint} hintId={hintId} />
      </div>
    );
  },
);
Input.displayName = "Input";

/* ----------------------------------------------------------------- select */

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  hint?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    { label, error, hint, id, className, options, placeholder, required, ...props },
    ref,
  ) => {
    const { fieldId, errorId, hintId, describedBy } = useFieldIds(id, error, hint);
    return (
      <div className={className}>
        <Label htmlFor={fieldId} required={required}>
          {label}
        </Label>
        <div className="relative">
          <select
            ref={ref}
            id={fieldId}
            required={required}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={cn(CONTROL, "h-11 appearance-none pr-10", error ? BAD : OK)}
            {...props}
          >
            {placeholder && <option value="">{placeholder}</option>}
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <svg
            viewBox="0 0 16 16"
            aria-hidden="true"
            className="pointer-events-none absolute right-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
          >
            <path
              d="m4 6 4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <Messages error={error} errorId={errorId} hint={hint} hintId={hintId} />
      </div>
    );
  },
);
Select.displayName = "Select";

/* --------------------------------------------------------------- textarea */

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, id, className, required, rows = 3, ...props }, ref) => {
    const { fieldId, errorId, hintId, describedBy } = useFieldIds(id, error, hint);
    return (
      <div className={className}>
        <Label htmlFor={fieldId} required={required}>
          {label}
        </Label>
        <textarea
          ref={ref}
          id={fieldId}
          rows={rows}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(CONTROL, "resize-y py-2.5 leading-relaxed", error ? BAD : OK)}
          {...props}
        />
        <Messages error={error} errorId={errorId} hint={hint} hintId={hintId} />
      </div>
    );
  },
);
Textarea.displayName = "Textarea";
