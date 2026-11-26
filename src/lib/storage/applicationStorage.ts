/**
 * ApplyMate — Application Tracker Storage Service
 *
 * Persists tracked job applications and recent activity locally using
 * StorageAdapter (browser.storage.local in extension, localStorage in dashboard,
 * MemoryStorageAdapter in tests).
 */

import type { StorageAdapter } from "../../types/storage.ts";
import type {
  ApplicationActivityItem,
  ApplicationStats,
  ApplicationStatus,
  TrackedJobApplication,
} from "../../types/application.ts";
import { APPLICATION_STATUSES } from "../../types/application.ts";
import { createStorageAdapter } from "./adapters/index.ts";

export const APPLICATIONS_STORAGE_KEY = "applymate_applications";
export const ACTIVITY_STORAGE_KEY = "applymate_application_activity";
const MAX_ACTIVITY_ITEMS = 50;

export type NewApplicationInput = {
  companyName: string;
  jobTitle: string;
  applicationUrl?: string;
  applicationDate?: string;
  resumeUsed?: string;
  status?: ApplicationStatus;
  notes?: string;
  submittedConfirmed?: boolean;
};

export function validateApplicationInput(
  input: NewApplicationInput
): { valid: true } | { valid: false; error: string } {
  if (!input.companyName || !input.companyName.trim()) {
    return { valid: false, error: "Company name is required." };
  }
  if (!input.jobTitle || !input.jobTitle.trim()) {
    return { valid: false, error: "Job title is required." };
  }
  if (input.applicationUrl && input.applicationUrl.trim()) {
    try {
      const u = new URL(input.applicationUrl.trim());
      if (u.protocol !== "http:" && u.protocol !== "https:") {
        return { valid: false, error: "Application URL must use http or https." };
      }
    } catch {
      return { valid: false, error: "Application URL is not a valid URL." };
    }
  }
  if (input.status && !APPLICATION_STATUSES.includes(input.status)) {
    return { valid: false, error: "Invalid application status." };
  }
  return { valid: true };
}

export function filterApplications(
  apps: TrackedJobApplication[],
  searchTerm: string,
  statusFilter: ApplicationStatus | "All"
): TrackedJobApplication[] {
  const query = searchTerm.trim().toLowerCase();
  return apps.filter((app) => {
    const matchesStatus = statusFilter === "All" || app.status === statusFilter;
    if (!matchesStatus) return false;
    if (!query) return true;
    return (
      app.companyName.toLowerCase().includes(query) ||
      app.jobTitle.toLowerCase().includes(query) ||
      app.resumeUsed.toLowerCase().includes(query) ||
      app.notes.toLowerCase().includes(query) ||
      app.applicationUrl.toLowerCase().includes(query)
    );
  });
}

export function computeApplicationStats(
  apps: TrackedJobApplication[]
): ApplicationStats {
  const byStatus: Record<ApplicationStatus, number> = {
    Interested: 0,
    Preparing: 0,
    Applied: 0,
    Interview: 0,
    Rejected: 0,
    Offer: 0,
  };

  let confirmedSubmissions = 0;
  for (const app of apps) {
    if (byStatus[app.status] !== undefined) {
      byStatus[app.status]++;
    }
    if (app.submittedConfirmed) {
      confirmedSubmissions++;
    }
  }

  return {
    total: apps.length,
    byStatus,
    confirmedSubmissions,
  };
}

function makeId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export class ApplicationStorageService {
  private adapter: StorageAdapter;

  constructor(adapter?: StorageAdapter) {
    this.adapter = adapter ?? createStorageAdapter();
  }

  async listApplications(): Promise<TrackedJobApplication[]> {
    const stored = await this.adapter.get<TrackedJobApplication[]>(
      APPLICATIONS_STORAGE_KEY
    );
    if (!Array.isArray(stored)) return [];
    return [...stored].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getRecentActivity(limit = 15): Promise<ApplicationActivityItem[]> {
    const stored = await this.adapter.get<ApplicationActivityItem[]>(
      ACTIVITY_STORAGE_KEY
    );
    if (!Array.isArray(stored)) return [];
    return stored.slice(0, limit);
  }

  private async logActivity(
    item: Omit<ApplicationActivityItem, "id" | "timestamp">
  ): Promise<void> {
    const existing =
      (await this.adapter.get<ApplicationActivityItem[]>(ACTIVITY_STORAGE_KEY)) ??
      [];
    const entry: ApplicationActivityItem = {
      ...item,
      id: makeId("act"),
      timestamp: new Date().toISOString(),
    };
    const next = [entry, ...(Array.isArray(existing) ? existing : [])].slice(
      0,
      MAX_ACTIVITY_ITEMS
    );
    await this.adapter.set(ACTIVITY_STORAGE_KEY, next);
  }

  /**
   * Adds a new tracked application. Defaults to status "Interested" and
   * `submittedConfirmed: false` — never assumes submission automatically.
   */
  async addApplication(
    input: NewApplicationInput
  ): Promise<TrackedJobApplication> {
    const check = validateApplicationInput(input);
    if (!check.valid) {
      throw new Error(check.error);
    }

    const now = new Date().toISOString();
    const status: ApplicationStatus = input.status ?? "Interested";
    const confirmed = Boolean(input.submittedConfirmed);

    const record: TrackedJobApplication = {
      id: makeId("app"),
      companyName: input.companyName.trim(),
      jobTitle: input.jobTitle.trim(),
      applicationUrl: (input.applicationUrl ?? "").trim(),
      applicationDate:
        (input.applicationDate ?? "").trim() ||
        (confirmed ? now.slice(0, 10) : ""),
      resumeUsed: (input.resumeUsed ?? "").trim(),
      status,
      notes: (input.notes ?? "").trim(),
      submittedConfirmed: confirmed,
      submittedConfirmedAt: confirmed ? now : undefined,
      createdAt: now,
      updatedAt: now,
    };

    const existing = await this.listApplications();
    await this.adapter.set(APPLICATIONS_STORAGE_KEY, [record, ...existing]);

    await this.logActivity({
      applicationId: record.id,
      companyName: record.companyName,
      jobTitle: record.jobTitle,
      action: confirmed ? "submission_confirmed" : "created",
      detail: confirmed
        ? `Confirmed application to ${record.companyName}`
        : `Added ${record.jobTitle} (${record.status})`,
    });

    return record;
  }

  async updateApplication(
    id: string,
    patch: Partial<NewApplicationInput>
  ): Promise<TrackedJobApplication> {
    const existing = await this.listApplications();
    const target = existing.find((a) => a.id === id);
    if (!target) {
      throw new Error("Application record not found.");
    }

    const mergedInput: NewApplicationInput = {
      companyName: patch.companyName ?? target.companyName,
      jobTitle: patch.jobTitle ?? target.jobTitle,
      applicationUrl: patch.applicationUrl ?? target.applicationUrl,
      applicationDate: patch.applicationDate ?? target.applicationDate,
      resumeUsed: patch.resumeUsed ?? target.resumeUsed,
      status: patch.status ?? target.status,
      notes: patch.notes ?? target.notes,
      submittedConfirmed: patch.submittedConfirmed ?? target.submittedConfirmed,
    };

    const check = validateApplicationInput(mergedInput);
    if (!check.valid) {
      throw new Error(check.error);
    }

    const now = new Date().toISOString();
    const statusChanged =
      patch.status !== undefined && patch.status !== target.status;

    const updated: TrackedJobApplication = {
      ...target,
      companyName: mergedInput.companyName.trim(),
      jobTitle: mergedInput.jobTitle.trim(),
      applicationUrl: (mergedInput.applicationUrl ?? "").trim(),
      applicationDate: (mergedInput.applicationDate ?? "").trim(),
      resumeUsed: (mergedInput.resumeUsed ?? "").trim(),
      status: mergedInput.status ?? target.status,
      notes: (mergedInput.notes ?? "").trim(),
      submittedConfirmed: Boolean(mergedInput.submittedConfirmed),
      updatedAt: now,
    };

    await this.adapter.set(
      APPLICATIONS_STORAGE_KEY,
      existing.map((a) => (a.id === id ? updated : a))
    );

    await this.logActivity({
      applicationId: updated.id,
      companyName: updated.companyName,
      jobTitle: updated.jobTitle,
      action: statusChanged ? "status_changed" : "updated",
      detail: statusChanged
        ? `Status updated from ${target.status} to ${updated.status}`
        : `Updated details for ${updated.companyName}`,
    });

    return updated;
  }

  /**
   * Explicitly confirms that the user submitted the application.
   */
  async confirmSubmission(
    id: string,
    applicationDate?: string
  ): Promise<TrackedJobApplication> {
    const existing = await this.listApplications();
    const target = existing.find((a) => a.id === id);
    if (!target) {
      throw new Error("Application record not found.");
    }

    const now = new Date().toISOString();
    const nextStatus: ApplicationStatus =
      target.status === "Interested" || target.status === "Preparing"
        ? "Applied"
        : target.status;

    const updated: TrackedJobApplication = {
      ...target,
      status: nextStatus,
      applicationDate:
        applicationDate?.trim() || target.applicationDate || now.slice(0, 10),
      submittedConfirmed: true,
      submittedConfirmedAt: now,
      updatedAt: now,
    };

    await this.adapter.set(
      APPLICATIONS_STORAGE_KEY,
      existing.map((a) => (a.id === id ? updated : a))
    );

    await this.logActivity({
      applicationId: updated.id,
      companyName: updated.companyName,
      jobTitle: updated.jobTitle,
      action: "submission_confirmed",
      detail: `Confirmed submission for ${updated.jobTitle} at ${updated.companyName}`,
    });

    return updated;
  }

  async deleteApplication(id: string): Promise<void> {
    const existing = await this.listApplications();
    const target = existing.find((a) => a.id === id);
    if (!target) return;

    await this.adapter.set(
      APPLICATIONS_STORAGE_KEY,
      existing.filter((a) => a.id !== id)
    );

    await this.logActivity({
      applicationId: target.id,
      companyName: target.companyName,
      jobTitle: target.jobTitle,
      action: "deleted",
      detail: `Removed ${target.jobTitle} at ${target.companyName}`,
    });
  }
}

export const applicationStorage = new ApplicationStorageService();
