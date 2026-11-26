/**
 * ApplyMate — Application Tracker Types
 */

export const APPLICATION_STATUSES = [
  "Interested",
  "Preparing",
  "Applied",
  "Interview",
  "Rejected",
  "Offer",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export interface TrackedJobApplication {
  id: string;
  companyName: string;
  jobTitle: string;
  applicationUrl: string;
  applicationDate: string; // YYYY-MM-DD (or empty until applied)
  resumeUsed: string;
  status: ApplicationStatus;
  notes: string;
  /**
   * Explicit user confirmation that the application was actually submitted.
   * Never automatically set to true just because a form was autofilled.
   */
  submittedConfirmed: boolean;
  submittedConfirmedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationActivityItem {
  id: string;
  applicationId: string;
  companyName: string;
  jobTitle: string;
  action: "created" | "updated" | "status_changed" | "submission_confirmed" | "deleted";
  detail: string;
  timestamp: string;
}

export interface ApplicationStats {
  total: number;
  byStatus: Record<ApplicationStatus, number>;
  confirmedSubmissions: number;
}

