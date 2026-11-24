/**
 * Input — Styled text input with optional leading icon.
 *
 * Usage:
 *   <Input value={v} onChange={...} error={!!errors.email} />
 *   <Input icon={<Mail size={15} />} ... />
 */

import React from "react";
import { cn } from "@/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ error, icon, className, ...props }, ref) => {
    const base =
      "w-full rounded-xl border bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 transition-all focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed";

    const borderClass = error
      ? "border-rose-400 dark:border-rose-500 focus:ring-rose-500/20 focus:border-rose-400"
      : "border-zinc-200 dark:border-zinc-800 focus:ring-blue-500/20 focus:border-blue-400 dark:focus:border-blue-500";

    const paddingClass = icon ? "pl-9 pr-3 py-2.5" : "px-3 py-2.5";

    return (
      <div className="relative">
        {icon && (
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={cn(base, borderClass, paddingClass, className)}
          {...props}
        />
      </div>
    );
  }
);
Input.displayName = "Input";

