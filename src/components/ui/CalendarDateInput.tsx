"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

interface CalendarDateInputProps {
  value: string;
  onChange: (nextIsoDate: string) => void;
  disabled?: boolean;
  error?: boolean;
  placeholder?: string;
}

function parseToYmd(val: string): { year: number; month: number; day?: number } | null {
  const trimmed = val.trim();
  if (!trimmed) return null;

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/);
  if (isoMatch) {
    return {
      year: parseInt(isoMatch[1], 10),
      month: parseInt(isoMatch[2], 10) - 1,
      day: isoMatch[3] ? parseInt(isoMatch[3], 10) : undefined,
    };
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return {
      year: parsed.getFullYear(),
      month: parsed.getMonth(),
      day: trimmed.match(/\b\d{1,2}\b/) ? parsed.getDate() : undefined,
    };
  }
  return null;
}

function formatDisplay(val: string): string {
  const parsed = parseToYmd(val);
  if (!parsed) return val;
  if (parsed.day !== undefined) {
    return `${MONTHS_SHORT[parsed.month]} ${parsed.day}, ${parsed.year}`;
  }
  return `${MONTHS_SHORT[parsed.month]} ${parsed.year}`;
}

export function CalendarDateInput({
  value,
  onChange,
  disabled = false,
  error = false,
  placeholder = "Select date",
}: CalendarDateInputProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  const initial = useMemo(() => {
    const parsed = parseToYmd(value);
    const now = new Date();
    return {
      year: parsed?.year ?? now.getFullYear(),
      month: parsed?.month ?? now.getMonth(),
    };
  }, [value]);

  const [viewYear, setViewYear] = useState(initial.year);
  const [viewMonth, setViewMonth] = useState(initial.month);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const openCalendar = () => {
    if (disabled) return;
    setViewYear(initial.year);
    setViewMonth(initial.month);
    setOpen((prev) => !prev);
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();

  const selectDate = (day: number) => {
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    onChange(`${viewYear}-${mm}-${dd}`);
    setOpen(false);
  };

  const selectMonthOnly = () => {
    const mm = String(viewMonth + 1).padStart(2, "0");
    onChange(`${viewYear}-${mm}`);
    setOpen(false);
  };

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const selectedParsed = parseToYmd(value);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={openCalendar}
        className={`w-full rounded-xl border px-3 py-2 text-sm text-left flex items-center justify-between gap-2 transition-colors ${
          error
            ? "border-red-400 dark:border-red-500/70 bg-white dark:bg-zinc-900"
            : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-600"
        } ${disabled ? "opacity-50 cursor-not-allowed bg-zinc-50 dark:bg-zinc-800/50" : "cursor-pointer"}`}
      >
        <span
          className={
            value
              ? "text-zinc-900 dark:text-zinc-100"
              : "text-zinc-400 dark:text-zinc-500"
          }
        >
          {value ? formatDisplay(value) : placeholder}
        </span>
        <span className="flex items-center gap-1 shrink-0 text-zinc-400">
          {value && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Clear date"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="p-0.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-600"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <Calendar className="w-4 h-4" />
        </span>
      </button>

      {open && !disabled && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-72 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl p-3.5 space-y-3">
          {/* Year & Month Navigation */}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5">
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(parseInt(e.target.value, 10))}
                aria-label="Select month"
                className="text-xs font-semibold rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-2 py-1"
              >
                {MONTHS_SHORT.map((m, idx) => (
                  <option key={m} value={idx}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={viewYear}
                onChange={(e) => setViewYear(parseInt(e.target.value, 10))}
                aria-label="Select year"
                className="text-xs font-semibold rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-2 py-1"
              >
                {Array.from({ length: 45 }, (_, i) => new Date().getFullYear() + 5 - i).map(
                  (yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  )
                )}
              </select>
            </div>

            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-zinc-400">
            {WEEKDAYS.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          {/* Calendar Day Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {Array.from({ length: firstWeekday }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const isSelected =
                selectedParsed?.year === viewYear &&
                selectedParsed?.month === viewMonth &&
                selectedParsed?.day === day;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDate(day)}
                  className={`h-7 w-7 mx-auto rounded-lg text-xs font-medium transition-colors ${
                    isSelected
                      ? "bg-blue-600 text-white font-bold"
                      : "text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Quick Actions: Month Only / Today */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800 text-[11px]">
            <button
              type="button"
              onClick={selectMonthOnly}
              className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Use {MONTHS_SHORT[viewMonth]} {viewYear}
            </button>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                const mm = String(now.getMonth() + 1).padStart(2, "0");
                const dd = String(now.getDate()).padStart(2, "0");
                onChange(`${now.getFullYear()}-${mm}-${dd}`);
                setOpen(false);
              }}
              className="font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

