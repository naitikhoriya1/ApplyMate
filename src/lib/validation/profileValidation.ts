/**
 * ApplyMate — Profile Validation
 *
 * Pure validation functions — no side effects.
 * Returns a map of field → error message, or {} if valid.
 */

import type {
  PersonalInfo,
  SocialLinks,
  Experience,
  Education,
  ApplicationPreferences,
  CandidateProfile,
  ValidationErrors,
} from "@/types/profile";
import type { ValidationResult } from "@/types/storage";
import { validateEmail } from "../../utils/index.ts";

// ─── Personal info ────────────────────────────────────────────────────────────

export function validatePersonal(
  data: PersonalInfo
): ValidationErrors<PersonalInfo> {
  const errors: ValidationErrors<PersonalInfo> = {};

  if (!data.firstName?.trim()) errors.firstName = "First name is required.";
  else if (data.firstName.trim().length < 2)
    errors.firstName = "Must be at least 2 characters.";

  if (!data.lastName?.trim()) errors.lastName = "Last name is required.";
  else if (data.lastName.trim().length < 2)
    errors.lastName = "Must be at least 2 characters.";

  if (!data.professionalTitle?.trim())
    errors.professionalTitle = "Professional title is required.";

  if (!data.email?.trim()) {
    errors.email = "Email is required.";
  } else if (!validateEmail(data.email)) {
    errors.email = "Enter a valid email address.";
  }

  if (data.phone && !/^[+\d\s\-().]{7,20}$/.test(data.phone.trim())) {
    errors.phone = "Enter a valid phone number.";
  }

  if (!data.location?.trim()) errors.location = "Location is required.";

  return errors;
}

// ─── Social links ─────────────────────────────────────────────────────────────

export function validateSocial(
  data: SocialLinks
): ValidationErrors<SocialLinks> {
  const errors: ValidationErrors<SocialLinks> = {};
  const urlRe = /^https?:\/\/.+/;

  if (data.linkedin && !urlRe.test(data.linkedin.trim()))
    errors.linkedin = "Must start with http:// or https://";

  if (data.github && !urlRe.test(data.github.trim()))
    errors.github = "Must start with http:// or https://";

  if (data.portfolio && !urlRe.test(data.portfolio.trim()))
    errors.portfolio = "Must start with http:// or https://";

  return errors;
}

// ─── Experience ───────────────────────────────────────────────────────────────

export function validateExperience(
  data: Experience
): ValidationErrors<Experience> {
  const errors: ValidationErrors<Experience> = {};

  if (!data.company?.trim()) errors.company = "Company name is required.";
  if (!data.role?.trim()) errors.role = "Role / title is required.";
  if (!data.startDate) errors.startDate = "Start date is required.";
  if (!data.current && !data.endDate)
    errors.endDate = "End date is required (or mark as current).";
  if (
    data.startDate &&
    data.endDate &&
    !data.current &&
    data.endDate < data.startDate
  ) {
    errors.endDate = "End date must be after start date.";
  }

  return errors;
}

// ─── Education ────────────────────────────────────────────────────────────────

export function validateEducation(
  data: Education
): ValidationErrors<Education> {
  const errors: ValidationErrors<Education> = {};

  if (!data.institution?.trim())
    errors.institution = "Institution name is required.";
  if (!data.degree?.trim()) errors.degree = "Degree is required.";
  if (!data.fieldOfStudy?.trim())
    errors.fieldOfStudy = "Field of study is required.";
  if (!data.startDate) errors.startDate = "Start date is required.";
  if (!data.current && !data.endDate)
    errors.endDate = "End date is required (or mark as current).";

  return errors;
}

// ─── Application Preferences ──────────────────────────────────────────────────

export function validatePreferences(
  data: ApplicationPreferences
): ValidationErrors<ApplicationPreferences> {
  const errors: ValidationErrors<ApplicationPreferences> = {};

  if (!data.workAuthorization?.trim()) {
    errors.workAuthorization = "Work authorization status is required.";
  }
  if (!data.noticePeriod?.trim()) {
    errors.noticePeriod = "Notice period is required.";
  }

  return errors;
}

/** Returns true when an errors object is empty (no validation failures). */
export function isValid<T>(errors: ValidationErrors<T>): boolean {
  return Object.keys(errors).length === 0;
}

// ─── Complete Candidate Profile Validation ────────────────────────────────────

export function validateCandidateProfile(profile: CandidateProfile): ValidationResult {
  const personalErrors = validatePersonal(profile.personal);
  const socialErrors = validateSocial(profile.social);
  const preferencesErrors = profile.preferences ? validatePreferences(profile.preferences) : {};

  const experienceErrors: Record<string, ValidationErrors<Experience>> = {};
  for (const exp of profile.experience) {
    const errs = validateExperience(exp);
    if (!isValid(errs)) {
      experienceErrors[exp.id] = errs;
    }
  }

  const educationErrors: Record<string, ValidationErrors<Education>> = {};
  for (const edu of profile.education) {
    const errs = validateEducation(edu);
    if (!isValid(errs)) {
      educationErrors[edu.id] = errs;
    }
  }

  const general: string[] = [];
  if (!Array.isArray(profile.skills)) {
    general.push("Skills must be an array of strings.");
  }

  const isAllValid =
    isValid(personalErrors) &&
    isValid(socialErrors) &&
    isValid(preferencesErrors) &&
    Object.keys(experienceErrors).length === 0 &&
    Object.keys(educationErrors).length === 0 &&
    general.length === 0;

  return {
    valid: isAllValid,
    errors: {
      personal: isValid(personalErrors) ? undefined : personalErrors,
      social: isValid(socialErrors) ? undefined : socialErrors,
      experience: Object.keys(experienceErrors).length > 0 ? experienceErrors : undefined,
      education: Object.keys(educationErrors).length > 0 ? educationErrors : undefined,
      preferences: isValid(preferencesErrors) ? undefined : preferencesErrors,
      general: general.length > 0 ? general : undefined,
    },
  };
}
