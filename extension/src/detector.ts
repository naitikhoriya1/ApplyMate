/**
 * ApplyMate — Job Application & ATS Form Detector
 *
 * Scans page URL, hostname, and DOM elements to determine:
 *  1. If the current site is a supported job application platform
 *  2. If an application form is actively present on the page
 *  3. Which input fields are available for autofill
 */

import type { FormDetectionResult, JobPlatform, SemanticFieldType } from "./types.ts";
import { classifyFormField } from "../autofill/fieldClassifier.ts";

/**
 * Known ATS platforms and job board domains
 */
const PLATFORM_PATTERNS: Array<{ platform: JobPlatform; match: (url: string, host: string) => boolean }> = [
  {
    platform: "Greenhouse",
    match: (url, host) =>
      host.includes("greenhouse.io") ||
      host.includes("grnh.se") ||
      url.includes("gh_jid=") ||
      Boolean(typeof document !== "undefined" && document.querySelector("#application_form, [data-qa='greenhouse-form']")),
  },
  {
    platform: "Lever",
    match: (url, host) =>
      host.includes("lever.co") ||
      url.includes("lever.co/") ||
      Boolean(typeof document !== "undefined" && document.querySelector(".application-form, form[action*='lever.co']")),
  },
  {
    platform: "Workday",
    match: (url, host) =>
      host.includes("myworkdayjobs.com") ||
      host.includes("workday.com") ||
      url.includes("/job/") ||
      Boolean(typeof document !== "undefined" && document.querySelector("[data-automation-id='job-posting-details'], [data-automation-id='applyButton']")),
  },
  {
    platform: "Ashby",
    match: (url, host) =>
      host.includes("ashbyhq.com") ||
      url.includes("ashbyhq.com/") ||
      Boolean(typeof document !== "undefined" && document.querySelector("[data-ashby-job-application-form]")),
  },
  {
    platform: "LinkedIn",
    match: (_url, host) => host.includes("linkedin.com") && typeof window !== "undefined" && window.location.pathname.includes("/jobs/"),
  },
  {
    platform: "Indeed",
    match: (_url, host) => host.includes("indeed.com"),
  },
  {
    platform: "SmartRecruiters",
    match: (url, host) =>
      host.includes("smartrecruiters.com") ||
      Boolean(typeof document !== "undefined" && document.querySelector("form[action*='smartrecruiters']")),
  },
  // ── Indian job portals & career sites ───────────────────────────────────
  {
    platform: "Generic Application",
    match: (url, host) =>
      host.includes("creditsamadhaan.com") ||
      host.includes("naukri.com") ||
      host.includes("internshala.com") ||
      host.includes("unstop.com") ||
      host.includes("cutshort.io") ||
      host.includes("hirist.tech") ||
      host.includes("foundit.in") ||
      host.includes("apna.co") ||
      (host.includes("angellist.com") || host.includes("wellfound.com")) ||
      Boolean(
        typeof document !== "undefined" &&
          document.querySelector(
            "form[action*='/apply'], form[action*='/careers'], form[action*='/jobs']"
          )
      ),
  },
];

/**
 * Identifies ATS provider or job board
 */
export function detectJobPlatform(urlStr: string = (typeof location !== "undefined" ? location.href : ""), host: string = (typeof location !== "undefined" ? location.hostname : "")): JobPlatform {
  for (const item of PLATFORM_PATTERNS) {
    if (item.match(urlStr, host)) {
      return item.platform;
    }
  }

  // Check generic career / application keywords in URL or title
  const lowerUrl = urlStr.toLowerCase();
  const lowerTitle = typeof document !== "undefined" ? document.title.toLowerCase() : "";
  const jobKeywords = ["/careers", "/jobs", "/apply", "job-application", "job_post", "openings", "positions"];

  if (jobKeywords.some((kw) => lowerUrl.includes(kw)) || lowerTitle.includes("apply") || lowerTitle.includes("career")) {
    return "Generic Application";
  }

  // Localhost test environments
  if (host === "localhost" || host === "127.0.0.1") {
    return "Generic Application";
  }

  return "None";
}

/**
 * Inspects DOM to detect presence of job application forms & fields.
 */
export function detectApplicationForm(): FormDetectionResult {
  const platform = typeof location !== "undefined" ? detectJobPlatform(location.href, location.hostname) : "None";
  if (typeof document === "undefined") {
    return {
      detected: false,
      platform,
      fieldsCount: 0,
      hasResumeUpload: false,
      detectedFields: [],
      classifiedTypes: [],
      confidence: "none",
    };
  }

  const detectedLabels = new Set<string>();
  const classifiedTypes = new Set<SemanticFieldType>();
  let hasResumeUpload = false;

  // Query all potential input, select, and textarea elements
  const inputs = Array.from(
    document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      "input, textarea, select"
    )
  );

  let fieldsCount = 0;

  for (const el of inputs) {
    // Skip hidden, disabled, or extension's own elements
    if (
      el.type === "hidden" ||
      el.type === "submit" ||
      el.type === "button" ||
      el.type === "reset" ||
      el.disabled ||
      el.closest("#applymate-extension-root")
    ) {
      continue;
    }

    fieldsCount++;

    // File upload for resume/CV
    if (el.type === "file") {
      hasResumeUpload = true;
      detectedLabels.add("Resume / CV File");
      continue;
    }

    // Smart classification from label, placeholder, name, id, etc.
    const classified = classifyFormField(el);
    if (classified) {
      detectedLabels.add(classified.label);
      classifiedTypes.add(classified.type);
      if (classified.type === "resumeLink") {
        hasResumeUpload = true;
      }
    }
  }

  const labelsArray = Array.from(detectedLabels);
  const typesArray = Array.from(classifiedTypes);

  const coreFieldsFound =
    typesArray.includes("email") ||
    typesArray.includes("phone") ||
    typesArray.includes("fullName") ||
    typesArray.includes("firstName") ||
    typesArray.includes("resumeLink") ||
    hasResumeUpload;

  const isKnownJobPlatform = platform !== "None";
  const hasMultipleFields = typesArray.length >= 2 || (typesArray.length >= 1 && hasResumeUpload);

  const detected = (isKnownJobPlatform && fieldsCount > 0) || (coreFieldsFound && hasMultipleFields);

  let confidence: "high" | "medium" | "low" | "none" = "none";
  if (detected && typesArray.length >= 3) {
    confidence = "high";
  } else if (detected) {
    confidence = "medium";
  } else if (typesArray.length > 0) {
    confidence = "low";
  }

  return {
    detected,
    platform: detected && platform === "None" ? "Generic Application" : platform,
    fieldsCount,
    hasResumeUpload,
    detectedFields: labelsArray,
    classifiedTypes: typesArray,
    confidence,
  };
}

/**
 * Decides whether the floating ApplyMate button should be shown.
 */
export function isSupportedJobSite(
  urlStr: string = (typeof location !== "undefined" ? location.href : ""),
  host: string = (typeof location !== "undefined" ? location.hostname : "")
): boolean {
  if (host === "localhost" || host === "127.0.0.1") return true;
  if (detectJobPlatform(urlStr, host) !== "None") return true;
  const form = detectApplicationForm();
  return form.detected;
}
