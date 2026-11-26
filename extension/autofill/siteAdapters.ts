/**
 * ApplyMate — Multi-Site Form Adapters
 *
 * Provides resilient, attribute-based field hints and modal/container scoping
 * for major ATS platforms and job portals:
 *  - LinkedIn (Easy Apply multi-step modal)
 *  - Naukri
 *  - Indeed (Indeed Apply multi-step)
 *  - Greenhouse
 *  - Lever
 *  - Workday (data-automation-id tokens & multi-step wizard)
 *  - SmartRecruiters
 *  - Generic Application (default fallback for custom career sites)
 *
 * Design principles:
 *  - Avoid brittle positional / generated CSS selectors.
 *  - Always fall back to the generic `classifyFormField()` engine when
 *    a site-specific hint does not match.
 *  - Respect `shouldSkipElement()` safety guards (never touch passwords,
 *    demographics, CAPTCHAs, or login walls).
 */

import type {
  JobPlatform,
  SemanticFieldType,
  ClassifiedFieldInfo,
} from "../src/types.ts";
import {
  classifyFormField,
  extractFieldMetadata,
  shouldSkipElement,
} from "./fieldClassifier.ts";

export interface SiteAdapter {
  platform: JobPlatform;
  isMultiStep: boolean;
  /**
   * Optional container scoping (e.g. LinkedIn Easy Apply modal) so we don't
   * accidentally scan background search bars. Falls back to `doc`.
   */
  getFormRoot?: (doc: Document) => HTMLElement | Document;
  /**
   * Resilient site-specific field hint. Returns null to delegate to the
   * generic `classifyFormField()` engine.
   */
  classifyElementHint?: (el: HTMLElement) => ClassifiedFieldInfo | null;
}

function hint(
  type: SemanticFieldType,
  label: string,
  confidence = 0.94
): ClassifiedFieldInfo {
  return {
    type,
    label,
    confidence,
    ambiguous: false,
    matchedSignal: "name",
  };
}

function attr(el: HTMLElement, name: string): string {
  return (
    (typeof el.getAttribute === "function" ? el.getAttribute(name) : null) ?? ""
  )
    .toLowerCase()
    .trim();
}

// ─── 1. LinkedIn Easy Apply ──────────────────────────────────────────────────

const linkedInAdapter: SiteAdapter = {
  platform: "LinkedIn",
  isMultiStep: true,
  getFormRoot(doc) {
    return (
      doc.querySelector<HTMLElement>(
        ".jobs-easy-apply-modal, [data-test-modal-id='easy-apply-modal'], [role='dialog']"
      ) ?? doc
    );
  },
  classifyElementHint(el) {
    const id = attr(el, "id");
    const name = attr(el, "name");
    const combined = `${id} ${name}`;

    if (combined.includes("phonenumber") || combined.includes("nationalnumber")) {
      return hint("phone", "Phone / Mobile Number", 0.95);
    }
    if (combined.includes("email")) {
      return hint("email", "Email Address", 0.96);
    }
    if (combined.includes("city") || combined.includes("location-geo")) {
      return hint("city", "City", 0.92);
    }
    return null;
  },
};

// ─── 2. Naukri ───────────────────────────────────────────────────────────────

const naukriAdapter: SiteAdapter = {
  platform: "Naukri",
  isMultiStep: true,
  classifyElementHint(el) {
    const name = attr(el, "name");
    const id = attr(el, "id");
    const combined = `${name} ${id}`;

    if (/\b(totalexp|total_exp|experience)\b/i.test(combined)) {
      return hint("experience", "Work Experience", 0.93);
    }
    if (/\b(noticeperiod|notice_period)\b/i.test(combined)) {
      return hint("noticePeriod", "Notice Period", 0.93);
    }
    if (/\b(expectedctc|expected_ctc|expectedsalary)\b/i.test(combined)) {
      return hint("expectedSalary", "Expected Salary / CTC", 0.92);
    }
    if (/\b(currentlocation|curr_loc|city)\b/i.test(combined)) {
      return hint("city", "City", 0.92);
    }
    if (/\b(keyskills|key_skills)\b/i.test(combined)) {
      return hint("skills", "Skills / Technologies", 0.93);
    }
    return null;
  },
};

// ─── 3. Indeed Apply ─────────────────────────────────────────────────────────

const indeedAdapter: SiteAdapter = {
  platform: "Indeed",
  isMultiStep: true,
  getFormRoot(doc) {
    return (
      doc.querySelector<HTMLElement>(
        "#ia-container, [data-testid='ia-form'], main"
      ) ?? doc
    );
  },
  classifyElementHint(el) {
    const testId = attr(el, "data-testid");
    const name = attr(el, "name");
    const combined = `${testId} ${name}`;

    if (combined.includes("applicant.name") || combined.includes("input-applicant.name")) {
      return hint("fullName", "Full Name", 0.95);
    }
    if (combined.includes("applicant.firstname")) {
      return hint("firstName", "First Name", 0.95);
    }
    if (combined.includes("applicant.lastname")) {
      return hint("lastName", "Last Name", 0.95);
    }
    if (combined.includes("applicant.email")) {
      return hint("email", "Email Address", 0.96);
    }
    if (combined.includes("applicant.phonenumber")) {
      return hint("phone", "Phone / Mobile Number", 0.95);
    }
    if (combined.includes("applicant.location.city")) {
      return hint("city", "City", 0.94);
    }
    return null;
  },
};

// ─── 4. Greenhouse ───────────────────────────────────────────────────────────

const greenhouseAdapter: SiteAdapter = {
  platform: "Greenhouse",
  isMultiStep: false,
  getFormRoot(doc) {
    return (
      doc.querySelector<HTMLElement>("#application_form, [data-qa='greenhouse-form']") ??
      doc
    );
  },
  classifyElementHint(el) {
    const id = attr(el, "id");
    const name = attr(el, "name");

    if (id === "first_name" || name === "job_application[first_name]") {
      return hint("firstName", "First Name", 0.97);
    }
    if (id === "last_name" || name === "job_application[last_name]") {
      return hint("lastName", "Last Name", 0.97);
    }
    if (id === "email" || name === "job_application[email]") {
      return hint("email", "Email Address", 0.98);
    }
    if (id === "phone" || name === "job_application[phone]") {
      return hint("phone", "Phone / Mobile Number", 0.97);
    }
    if (id === "job_application_location" || name === "job_application[location]") {
      return hint("location", "Current Location", 0.94);
    }
    return null;
  },
};

// ─── 5. Lever ────────────────────────────────────────────────────────────────

const leverAdapter: SiteAdapter = {
  platform: "Lever",
  isMultiStep: false,
  getFormRoot(doc) {
    return doc.querySelector<HTMLElement>(".application-form, form[action*='lever.co']") ?? doc;
  },
  classifyElementHint(el) {
    const name = attr(el, "name");

    if (name === "name") return hint("fullName", "Full Name", 0.96);
    if (name === "email") return hint("email", "Email Address", 0.98);
    if (name === "phone") return hint("phone", "Phone / Mobile Number", 0.96);
    if (name === "org") return hint("currentCompany", "Current Company", 0.94);
    if (name === "location") return hint("location", "Current Location", 0.94);
    if (name === "urls[linkedin]") return hint("linkedin", "LinkedIn Profile URL", 0.97);
    if (name === "urls[github]") return hint("github", "GitHub Profile URL", 0.97);
    if (name === "urls[portfolio]" || name === "urls[website]") {
      return hint("portfolio", "Portfolio / Website", 0.95);
    }
    if (name === "comments") return hint("bio", "Bio / About Yourself", 0.90);
    return null;
  },
};

// ─── 6. Workday ──────────────────────────────────────────────────────────────

const workdayAdapter: SiteAdapter = {
  platform: "Workday",
  isMultiStep: true,
  classifyElementHint(el) {
    const autoId = attr(el, "data-automation-id");
    if (!autoId) return null;

    if (autoId.includes("firstname")) return hint("firstName", "First Name", 0.96);
    if (autoId.includes("lastname")) return hint("lastName", "Last Name", 0.96);
    if (autoId === "email") return hint("email", "Email Address", 0.98);
    if (autoId.includes("phone-number") || autoId.includes("phonenumber")) {
      return hint("phone", "Phone / Mobile Number", 0.96);
    }
    if (autoId.includes("addresssection_city") || autoId === "city") {
      return hint("city", "City", 0.95);
    }
    if (autoId.includes("postalcode")) return hint("postalCode", "Postal / Pin Code", 0.95);
    if (autoId.includes("country")) return hint("country", "Country", 0.94);
    if (autoId.includes("linkedin")) return hint("linkedin", "LinkedIn Profile URL", 0.95);
    if (autoId.includes("school")) return hint("educationSchool", "University / College", 0.93);
    if (autoId.includes("degree")) return hint("educationDegree", "Degree / Qualification", 0.93);
    return null;
  },
};

// ─── 7. SmartRecruiters ──────────────────────────────────────────────────────

const smartRecruitersAdapter: SiteAdapter = {
  platform: "SmartRecruiters",
  isMultiStep: true,
  classifyElementHint(el) {
    const testAttr = attr(el, "data-test");
    const name = attr(el, "name");
    const combined = `${testAttr} ${name}`;

    if (combined.includes("first-name") || combined === "firstname") {
      return hint("firstName", "First Name", 0.96);
    }
    if (combined.includes("last-name") || combined === "lastname") {
      return hint("lastName", "Last Name", 0.96);
    }
    if (combined.includes("email")) return hint("email", "Email Address", 0.97);
    if (combined.includes("phone")) return hint("phone", "Phone / Mobile Number", 0.96);
    if (combined.includes("linkedin")) return hint("linkedin", "LinkedIn Profile URL", 0.95);
    if (combined.includes("website") || combined.includes("portfolio")) {
      return hint("portfolio", "Portfolio / Website", 0.93);
    }
    return null;
  },
};

// ─── 8. Generic Default Adapter ──────────────────────────────────────────────

const genericAdapter: SiteAdapter = {
  platform: "Generic Application",
  isMultiStep: false,
};

const ADAPTER_MAP: Partial<Record<JobPlatform, SiteAdapter>> = {
  LinkedIn: linkedInAdapter,
  Naukri: naukriAdapter,
  Indeed: indeedAdapter,
  Greenhouse: greenhouseAdapter,
  Lever: leverAdapter,
  Workday: workdayAdapter,
  SmartRecruiters: smartRecruitersAdapter,
  "Generic Application": genericAdapter,
};

/**
 * Returns the SiteAdapter for a detected platform, defaulting to `genericAdapter`.
 */
export function getSiteAdapter(platform: JobPlatform): SiteAdapter {
  return ADAPTER_MAP[platform] ?? genericAdapter;
}

/**
 * Classifies an element using the active site adapter's resilient hints first,
 * then always falls back to the generic `classifyFormField()` engine.
 * Safety exclusions (`shouldSkipElement`) are enforced regardless of adapter.
 */
export function classifyFieldForPlatform(
  el: HTMLElement,
  platform: JobPlatform
): ClassifiedFieldInfo | null {
  const meta = extractFieldMetadata(el);
  if (shouldSkipElement(meta)) return null;

  const adapter = getSiteAdapter(platform);
  if (adapter.classifyElementHint) {
    const siteMatch = adapter.classifyElementHint(el);
    if (siteMatch) return siteMatch;
  }

  return classifyFormField(el);
}

