/**
 * Toast — Lightweight save-confirmation toast.
 *
 * Usage:
 *   <Toast show={saveToast} message="Profile saved!" />
 */

import React from "react";
import { CheckCircle2 } from "lucide-react";

interface ToastProps {
  show: boolean;
  message?: string;
}

export function Toast({ show, message = "Saved!" }: ToastProps) {
  return (
    <div
      aria-live="polite"
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-2xl bg-zinc-900 dark:bg-white px-4 py-3 text-sm font-medium text-white dark:text-zinc-900 shadow-xl shadow-zinc-900/20 transition-all duration-300 ${
        show
          ? "translate-y-0 opacity-100"
          : "translate-y-4 opacity-0 pointer-events-none"
      }`}
    >
      <CheckCircle2 size={16} className="text-emerald-400 dark:text-emerald-600 shrink-0" />
      {message}
    </div>
  );
}

