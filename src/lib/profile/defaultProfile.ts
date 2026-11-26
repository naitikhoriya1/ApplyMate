/**
 * ApplyMate — Clean Initial Profile Template
 *
 * Production runs always start from a blank `EMPTY_PROFILE` so each user
 * configures their own profile manually or via PDF resume import.
 */

import type { CandidateProfile } from "@/types/profile";

export const EMPTY_PROFILE: CandidateProfile = {
  personal: {
    firstName: "",
    lastName: "",
    professionalTitle: "",
    email: "",
    phone: "",
    location: "",
    bio: "",
  },
  social: {
    linkedin: "",
    github: "",
    portfolio: "",
  },
  experience: [],
  education: [],
  skills: [],
  preferences: {
    workAuthorization: "",
    requiresSponsorship: false,
    noticePeriod: "",
    desiredSalary: "",
    currency: "INR",
    openToRemote: true,
    preferredLocations: [],
    jobTitles: [],
    willingToRelocate: false,
  },
  updatedAt: "",
};

/**
 * Default fallback profile used when storage has not yet been initialized.
 * Kept identical to EMPTY_PROFILE so no hardcoded user details leak into runtime.
 */
export const DEFAULT_PROFILE: CandidateProfile = EMPTY_PROFILE;
