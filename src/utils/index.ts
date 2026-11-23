// Core utility functions for ApplyMate

/**
 * Validates whether an email string has a valid structure.
 */
export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

/**
 * Truncates text to a specified maximum length and appends ellipsis.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "...";
}

/**
 * Formats an ISO date string to a human-readable format (e.g., 'Jan 2024').
 */
export function formatMonthYear(dateString?: string): string {
  if (!dateString) return "Present";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

/**
 * Safely joins class name strings together.
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

