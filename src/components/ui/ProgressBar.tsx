import React from "react";

interface ProgressBarProps {
  value: number; // 0 to 100
  color?: "blue" | "emerald" | "amber";
  height?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function ProgressBar({
  value,
  color = "blue",
  height = "md",
  showLabel = false,
  className = "",
}: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  const colors = {
    blue: "bg-blue-600 dark:bg-blue-500",
    emerald: "bg-emerald-600 dark:bg-emerald-500",
    amber: "bg-amber-500 dark:bg-amber-400",
  };

  const heights = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-3.5",
  };

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center mb-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          <span>Completion</span>
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
            {clampedValue}%
          </span>
        </div>
      )}
      <div
        className={`w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden ${heights[height]}`}
      >
        <div
          className={`${heights[height]} ${colors[color]} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}

