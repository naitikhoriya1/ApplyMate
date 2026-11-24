/**
 * ApplyMate — Data Sanitizer & Schema Healer
 *
 * Handles missing, corrupted, outdated, or invalid stored data.
 * Guarantees that whatever is retrieved from storage (localStorage,
 * browser.storage.local, or imported JSON) is healed into a strictly-typed,
 * valid CandidateProfile instance.
 */

import type { Experience, Education } from "@/types/profile";
import type { SanitizationResult } from "@/types/storage";
import { DEFAULT_PROFILE } from "../profile/defaultProfile.ts";

export function sanitizeProfileData(raw: unknown): SanitizationResult {
  const issues: string[] = [];

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      healed: true,
      issues: ["Stored data was empty or invalid JSON; restored default profile."],
      profile: structuredClone(DEFAULT_PROFILE),
    };
  }

  const obj = raw as Record<string, unknown>;
  const base = structuredClone(DEFAULT_PROFILE);

  // 1. Personal Info
  let personal = base.personal;
  if (!obj.personal || typeof obj.personal !== "object" || Array.isArray(obj.personal)) {
    issues.push("Missing or invalid personal section; restored default.");
  } else {
    const rawP = obj.personal as Record<string, unknown>;
    personal = {
      firstName: typeof rawP.firstName === "string" ? rawP.firstName : base.personal.firstName,
      lastName: typeof rawP.lastName === "string" ? rawP.lastName : base.personal.lastName,
      professionalTitle: typeof rawP.professionalTitle === "string" ? rawP.professionalTitle : base.personal.professionalTitle,
      email: typeof rawP.email === "string" ? rawP.email : base.personal.email,
      phone: typeof rawP.phone === "string" ? rawP.phone : base.personal.phone,
      location: typeof rawP.location === "string" ? rawP.location : base.personal.location,
      bio: typeof rawP.bio === "string" ? rawP.bio : base.personal.bio,
    };
    if (typeof rawP.firstName !== "string" || typeof rawP.email !== "string") {
      issues.push("Repaired personal fields with defaults.");
    }
  }

  // 2. Social Links
  let social = base.social;
  if (!obj.social || typeof obj.social !== "object" || Array.isArray(obj.social)) {
    issues.push("Missing social links section; restored default.");
  } else {
    const rawS = obj.social as Record<string, unknown>;
    social = {
      linkedin: typeof rawS.linkedin === "string" ? rawS.linkedin : base.social.linkedin,
      github: typeof rawS.github === "string" ? rawS.github : base.social.github,
      portfolio: typeof rawS.portfolio === "string" ? rawS.portfolio : base.social.portfolio,
    };
  }

  // 3. Experience Array
  let experience = base.experience;
  if (!Array.isArray(obj.experience)) {
    issues.push("Experience was not an array; restored default experience.");
  } else {
    experience = obj.experience.map((item, idx): Experience => {
      if (!item || typeof item !== "object") {
        issues.push(`Experience index ${idx} was corrupted; created blank entry.`);
        return {
          id: `exp-${Date.now()}-${idx}`,
          company: "",
          role: "",
          startDate: "",
          endDate: "",
          current: false,
          description: "",
          skills: [],
        };
      }
      const expObj = item as Record<string, unknown>;
      return {
        id: typeof expObj.id === "string" && expObj.id ? expObj.id : `exp-${Date.now()}-${idx}`,
        company: typeof expObj.company === "string" ? expObj.company : "",
        role: typeof expObj.role === "string" ? expObj.role : "",
        startDate: typeof expObj.startDate === "string" ? expObj.startDate : "",
        endDate: typeof expObj.endDate === "string" ? expObj.endDate : "",
        current: Boolean(expObj.current),
        description: typeof expObj.description === "string" ? expObj.description : "",
        skills: Array.isArray(expObj.skills)
          ? expObj.skills.filter((s): s is string => typeof s === "string")
          : [],
      };
    });
  }

  // 4. Education Array
  let education = base.education;
  if (!Array.isArray(obj.education)) {
    issues.push("Education was not an array; restored default education.");
  } else {
    education = obj.education.map((item, idx): Education => {
      if (!item || typeof item !== "object") {
        issues.push(`Education index ${idx} was corrupted; created blank entry.`);
        return {
          id: `edu-${Date.now()}-${idx}`,
          institution: "",
          degree: "",
          fieldOfStudy: "",
          startDate: "",
          endDate: "",
          current: false,
          grade: "",
        };
      }
      const eduObj = item as Record<string, unknown>;
      return {
        id: typeof eduObj.id === "string" && eduObj.id ? eduObj.id : `edu-${Date.now()}-${idx}`,
        institution: typeof eduObj.institution === "string" ? eduObj.institution : "",
        degree: typeof eduObj.degree === "string" ? eduObj.degree : "",
        fieldOfStudy: typeof eduObj.fieldOfStudy === "string" ? eduObj.fieldOfStudy : "",
        startDate: typeof eduObj.startDate === "string" ? eduObj.startDate : "",
        endDate: typeof eduObj.endDate === "string" ? eduObj.endDate : "",
        current: Boolean(eduObj.current),
        grade: typeof eduObj.grade === "string" ? eduObj.grade : "",
      };
    });
  }

  // 5. Skills Array
  let skills = base.skills;
  if (!Array.isArray(obj.skills)) {
    issues.push("Skills was not an array; restored default skills list.");
  } else {
    skills = obj.skills.filter((s): s is string => typeof s === "string" && s.trim().length > 0);
  }

  // 6. Application Preferences
  let preferences = base.preferences;
  if (!obj.preferences || typeof obj.preferences !== "object" || Array.isArray(obj.preferences)) {
    issues.push("Application preferences missing; initialized with defaults.");
  } else {
    const rawPref = obj.preferences as Record<string, unknown>;
    preferences = {
      workAuthorization:
        typeof rawPref.workAuthorization === "string"
          ? rawPref.workAuthorization
          : base.preferences.workAuthorization,
      requiresSponsorship:
        typeof rawPref.requiresSponsorship === "boolean"
          ? rawPref.requiresSponsorship
          : base.preferences.requiresSponsorship,
      noticePeriod:
        typeof rawPref.noticePeriod === "string"
          ? rawPref.noticePeriod
          : base.preferences.noticePeriod,
      desiredSalary:
        typeof rawPref.desiredSalary === "string"
          ? rawPref.desiredSalary
          : base.preferences.desiredSalary,
      currency:
        typeof rawPref.currency === "string" ? rawPref.currency : base.preferences.currency,
      openToRemote:
        typeof rawPref.openToRemote === "boolean"
          ? rawPref.openToRemote
          : base.preferences.openToRemote,
      preferredLocations: Array.isArray(rawPref.preferredLocations)
        ? rawPref.preferredLocations.filter((l): l is string => typeof l === "string")
        : base.preferences.preferredLocations,
      jobTitles: Array.isArray(rawPref.jobTitles)
        ? rawPref.jobTitles.filter((t): t is string => typeof t === "string")
        : base.preferences.jobTitles,
      willingToRelocate:
        typeof rawPref.willingToRelocate === "boolean"
          ? rawPref.willingToRelocate
          : base.preferences.willingToRelocate,
    };
  }

  // 7. Timestamp
  const updatedAt =
    typeof obj.updatedAt === "string" && !isNaN(Date.parse(obj.updatedAt))
      ? obj.updatedAt
      : new Date().toISOString();

  const healed = issues.length > 0;

  return {
    healed,
    issues,
    profile: {
      personal,
      social,
      experience,
      education,
      skills,
      preferences,
      updatedAt,
    },
  };
}

