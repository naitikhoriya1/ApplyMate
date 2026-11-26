/**
 * ApplyMate — Shared Dashboard Types & Clean Initial Defaults
 *
 * Kept clean/empty so the dashboard never surfaces hardcoded mock user data.
 */

export interface UserProfileData {
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  location: string;
  headline: string;
  linkedinUrl: string;
  githubUrl: string;
  portfolioUrl: string;
  workAuthorization: string;
  noticePeriod: string;
  expectedSalary: string;
  skills: string[];
  completionRate: number;
}

export interface ExperienceItem {
  id: string;
  role: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  highlights: string[];
}

export interface EducationItem {
  id: string;
  degree: string;
  institution: string;
  startDate: string;
  endDate: string;
  gpa?: string;
}

export interface ResumeItem {
  id: string;
  title: string;
  fileName: string;
  fileSize: string;
  uploadedAt: string;
  isDefault: boolean;
  atsScore: number;
  extractedSkillsCount: number;
}

export interface TrackedApplication {
  id: string;
  company: string;
  position: string;
  platform: "Greenhouse" | "Lever" | "Workday" | "Ashby" | "LinkedIn" | "Custom";
  location: string;
  appliedAt: string;
  status: "Applied" | "In Review" | "Interviewing" | "Offer" | "Rejected";
  url: string;
  resumeUsed: string;
  autofillTimeSeconds?: number;
}

export interface ActivityEvent {
  id: string;
  type: "autofill" | "resume" | "profile" | "status_change";
  title: string;
  description: string;
  timestamp: string;
}

export const initialProfile: UserProfileData = {
  firstName: "",
  lastName: "",
  fullName: "",
  email: "",
  phone: "",
  location: "",
  headline: "",
  linkedinUrl: "",
  githubUrl: "",
  portfolioUrl: "",
  workAuthorization: "",
  noticePeriod: "",
  expectedSalary: "",
  skills: [],
  completionRate: 0,
};

export const initialExperience: ExperienceItem[] = [];
export const initialEducation: EducationItem[] = [];
export const initialResumes: ResumeItem[] = [];
export const initialApplications: TrackedApplication[] = [];
export const initialActivities: ActivityEvent[] = [];
