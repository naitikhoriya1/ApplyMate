/**
 * FormField — Labelled input wrapper with inline error display.
 *
 * Usage:
 *   <FormField label="Email" error={errors.email} required>
 *     <Input ... />
 *   </FormField>
 */

import React from "react";
import { cn } from "@/utils";

interface FormFieldProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  label,
  error,
  hint,
  required,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 select-none">
        {label}
        {required && (
          <span className="ml-1 text-rose-500 dark:text-rose-400" aria-hidden>
            *
          </span>
        )}
      </label>

      {children}

      {hint && !error && (
        <p className="text-xs text-zinc-400 dark:text-zinc-500">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1">
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

