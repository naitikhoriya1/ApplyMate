"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  APPLICATION_STATUSES,
  type ApplicationStatus,
  type TrackedJobApplication,
} from "@/types/application";
import {
  validateApplicationInput,
  type NewApplicationInput,
} from "@/lib/storage/applicationStorage";

interface ApplicationFormModalProps {
  initial?: TrackedJobApplication | null;
  onSave: (data: NewApplicationInput) => Promise<void>;
  onClose: () => void;
}

export function ApplicationFormModal({
  initial,
  onSave,
  onClose,
}: ApplicationFormModalProps) {
  const [companyName, setCompanyName] = useState(initial?.companyName ?? "");
  const [jobTitle, setJobTitle] = useState(initial?.jobTitle ?? "");
  const [applicationUrl, setApplicationUrl] = useState(
    initial?.applicationUrl ?? ""
  );
  const [applicationDate, setApplicationDate] = useState(
    initial?.applicationDate ?? ""
  );
  const [resumeUsed, setResumeUsed] = useState(initial?.resumeUsed ?? "");
  const [status, setStatus] = useState<ApplicationStatus>(
    initial?.status ?? "Interested"
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [submittedConfirmed, setSubmittedConfirmed] = useState(
    initial?.submittedConfirmed ?? false
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: NewApplicationInput = {
      companyName,
      jobTitle,
      applicationUrl,
      applicationDate,
      resumeUsed,
      status,
      notes,
      submittedConfirmed,
    };

    const check = validateApplicationInput(payload);
    if (!check.valid) {
      setError(check.error);
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onSave(payload);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save application."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
    >
      <Card className="w-full max-w-lg shadow-xl border-zinc-200 dark:border-zinc-800 max-h-[90vh] overflow-y-auto">
        <CardContent className="p-6">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {initial ? "Edit Application" : "Track New Application"}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-xs text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Fibe India"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Job Title *
                </label>
                <input
                  type="text"
                  required
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. QA Automation Engineer"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                Application URL
              </label>
              <input
                type="url"
                value={applicationUrl}
                onChange={(e) => setApplicationUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as ApplicationStatus)
                  }
                  className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                >
                  {APPLICATION_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Application Date
                </label>
                <input
                  type="date"
                  value={applicationDate}
                  onChange={(e) => setApplicationDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Resume Used
                </label>
                <input
                  type="text"
                  value={resumeUsed}
                  onChange={(e) => setResumeUsed(e.target.value)}
                  placeholder="Naitik_QA_Resume.pdf"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                Notes
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Recruiter contact, interview dates, referral details…"
                className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={submittedConfirmed}
                onChange={(e) => setSubmittedConfirmed(e.target.checked)}
                className="rounded border-zinc-300"
              />
              <span>I confirm this application has actually been submitted</span>
            </label>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSaving}>
                {isSaving
                  ? "Saving…"
                  : initial
                    ? "Save Changes"
                    : "Save Application"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

