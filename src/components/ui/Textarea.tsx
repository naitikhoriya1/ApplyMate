/**
 * Textarea — Styled multiline input.
 */

import React from "react";
import { cn } from "@/utils";

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, className, ...props }, ref) => {
    const base =
      "w-full rounded-xl border bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 transition-all focus:outline-none focus:ring-2 resize-none disabled:opacity-50";

    const borderClass = error
      ? "border-rose-400 dark:border-rose-500 focus:ring-rose-500/20 focus:border-rose-400"
      : "border-zinc-200 dark:border-zinc-800 focus:ring-blue-500/20 focus:border-blue-400 dark:focus:border-blue-500";

    return (
      <textarea
        ref={ref}
        className={cn(base, borderClass, "px-3 py-2.5", className)}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

