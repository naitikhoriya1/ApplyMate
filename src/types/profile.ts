/**
 * ApplyMate — Canonical Profile Types
 *
 * Single source of truth for all candidate data shapes.
 * Used by: dashboard, profile page, resume manager, extension autofill.
 */

// ─── Personal / Contact ──────────────────────────────────────────────────────

export interface PersonalInfo {
  firstName: string;
  lastName: string;
  professionalTitle: string;
  email: string;
  phone: string;
  location: string;
  bio: string;
}

export interface SocialLinks {
  linkedin: string;
  github: string;
  portfolio: string;
}

// ─── Experience ───────────────────────────────────────────────────────────────

export interface Experience {
  id: string;
  company: string;
  role: string;
  startDate: string; // e.g. "2026-05"
  endDate: string;   // e.g. "2026-08" | "" (empty = current)
  current: boolean;
  description: string;
  skills: string[];
}

// ─── Education ────────────────────────────────────────────────────────────────

export interface Education {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate: string;
  current: boolean;
  grade?: string;
}

// ─── Application Preferences ──────────────────────────────────────────────────

export interface ApplicationPreferences {
  workAuthorization: string;
  requiresSponsorship: boolean;
  noticePeriod: string;
  desiredSalary: string;
  currency: string;
  openToRemote: boolean;
  preferredLocations: string[];
  jobTitles: string[];
  willingToRelocate: boolean;
}

// ─── Root Profile ─────────────────────────────────────────────────────────────

export interface CandidateProfile {
  personal: PersonalInfo;
  social: SocialLinks;
  experience: Experience[];
  education: Education[];
  skills: string[];
  preferences: ApplicationPreferences;
  updatedAt: string; // ISO timestamp
}

// ─── Validation errors map ────────────────────────────────────────────────────

export type ValidationErrors<T> = Partial<Record<keyof T, string>>;
