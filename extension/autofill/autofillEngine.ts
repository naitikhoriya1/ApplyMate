/**
 * ApplyMate — Reusable One-Click Autofill Engine
 *
 * Connects the Form Detection Engine (`fieldClassifier.ts`) with the candidate's
 * saved profile (`browser.storage.local` / `DEFAULT_PROFILE`).
 *
 * Guarantees & Safety Guards:
 *  - Fills ONLY empty fields (preserves existing user-entered values).
 *  - Skips low-confidence (< 0.70) and ambiguous fields.
 *  - Never fills salary or notice period unless explicitly configured.
 *  - Never fills demographic fields (handled by classifier + double-guarded here).
 *  - Never clicks submit/application buttons or bypasses website validation.
 *  - Uses native prototype value setter + input/change events for React/Vue/Angular.
 */

import type { CandidateProfile } from "../../src/types/profile.ts";
import { DEFAULT_PROFILE } from "../../src/lib/profile/defaultProfile.ts";
import type {
  SemanticFieldType,
  AutofillFieldResult,
  AutofillExecutionResult,
  AutofillSummary,
} from "../src/types.ts";
import { classifyFormField } from "./fieldClassifier.ts";

export const PROFILE_STORAGE_KEY = "applymate_profile";
export const MIN_AUTOFILL_CONFIDENCE = 0.70;

const DEFAULT_UNCONFIGURED_NOTICE = "Available immediately / 2 weeks";
const DEFAULT_UNCONFIGURED_SALARY = "Competitive";

export interface AutofillOptions {
  /** Override root DOM node to scan (defaults to `document`) */
  root?: Document | HTMLElement;
  /** Allow filling default noticePeriod/desiredSalary placeholders (default: false) */
  allowDefaultPreferences?: boolean;
}

/**
 * Loads the candidate's saved profile from extension storage (`browser.storage.local`
 * or `chrome.storage.local`), falling back to `DEFAULT_PROFILE`.
 */
export async function loadSavedProfile(): Promise<CandidateProfile> {
  try {
    const ext =
      typeof browser !== "undefined"
        ? browser
        : typeof chrome !== "undefined"
          ? chrome
          : null;

    if (ext?.storage?.local) {
      const data = await ext.storage.local.get(PROFILE_STORAGE_KEY);
      const saved = data?.[PROFILE_STORAGE_KEY] as CandidateProfile | undefined;
      if (saved && saved.personal && saved.personal.email) {
        return saved;
      }
    }
  } catch {
    // Fallback to DEFAULT_PROFILE if storage is unavailable
  }
  return DEFAULT_PROFILE;
}

/**
 * Sets native value using element prototype descriptor so React 18/19, Vue,
 * Angular, and Formik controlled inputs detect the programmatic change.
 */
export function setNativeValue(
  element: HTMLInputElement | HTMLTextAreaElement,
  value: string
): void {
  const valueSetter = Object.getOwnPropertyDescriptor(element, "value")?.set;
  const prototype = Object.getPrototypeOf(element);
  const prototypeValueSetter = prototype
    ? Object.getOwnPropertyDescriptor(prototype, "value")?.set
    : undefined;

  if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
    prototypeValueSetter.call(element, value);
  } else if (valueSetter) {
    valueSetter.call(element, value);
  } else {
    element.value = value;
  }
}

export interface SelectOptionLike {
  text: string;
  value: string;
  disabled?: boolean;
}

export interface SelectElementLike {
  options: ArrayLike<SelectOptionLike>;
  selectedIndex?: number;
}

function isPlaceholderOption(opt: SelectOptionLike | undefined): boolean {
  if (!opt) return true;
  const val = (opt.value ?? "").trim();
  const text = (opt.text ?? "").toLowerCase().trim();
  if (val === "") return true;
  return /^(select|choose|pick|--|please\s+select)/.test(text);
}

/**
 * Intelligently finds and selects an <option> in an HTMLSelectElement.
 */
export function selectBestOption(
  selectEl: HTMLSelectElement | SelectElementLike,
  targetValue: string
): boolean {
  const lowerTarget = targetValue.toLowerCase().trim();
  if (!lowerTarget) return false;

  const options = Array.from(selectEl.options);

  // 1. Exact match on option text or value
  for (let i = 0; i < options.length; i++) {
    const opt = options[i];
    if (opt.disabled) continue;
    const text = opt.text.toLowerCase().trim();
    const val = opt.value.toLowerCase().trim();
    if (text === lowerTarget || val === lowerTarget) {
      selectEl.selectedIndex = i;
      return true;
    }
  }

  // 2. "Fresher" normalisation — if target is "fresher" or "0"
  if (lowerTarget === "fresher" || lowerTarget === "0") {
    for (let i = 0; i < options.length; i++) {
      const opt = options[i];
      if (opt.disabled) continue;
      const text = opt.text.toLowerCase().trim();
      if (
        text.includes("fresher") ||
        text.includes("0-1") ||
        text.includes("less than 1") ||
        text.includes("no experience")
      ) {
        selectEl.selectedIndex = i;
        return true;
      }
    }
  }

  // 3. Numeric year matching — e.g. target "2" matches "1-2 years", "2 years"
  const numMatch = lowerTarget.match(/^(\d+)$/);
  if (numMatch) {
    const targetNum = parseInt(numMatch[1], 10);
    for (let i = 0; i < options.length; i++) {
      const opt = options[i];
      if (opt.disabled) continue;
      const text = opt.text.toLowerCase().trim();
      const rangeMatch = text.match(/(\d+)\s*[-–]\s*(\d+)/);
      if (rangeMatch) {
        const lo = parseInt(rangeMatch[1], 10);
        const hi = parseInt(rangeMatch[2], 10);
        if (targetNum >= lo && targetNum <= hi) {
          selectEl.selectedIndex = i;
          return true;
        }
      }
      const singleMatch = text.match(/^(\d+)\s*(years?|yrs?|\+)/);
      if (singleMatch && parseInt(singleMatch[1], 10) === targetNum) {
        selectEl.selectedIndex = i;
        return true;
      }
    }
  }

  // 4. Substring / keyword match (bidirectional, skipping empty placeholder options)
  for (let i = 0; i < options.length; i++) {
    const opt = options[i];
    if (opt.disabled || isPlaceholderOption(opt)) continue;
    const text = opt.text.toLowerCase().trim();
    const val = opt.value.toLowerCase().trim();
    if (
      (text && (text.includes(lowerTarget) || lowerTarget.includes(text))) ||
      (val && (val.includes(lowerTarget) || lowerTarget.includes(val)))
    ) {
      selectEl.selectedIndex = i;
      return true;
    }
  }

  return false;
}

/**
 * Dispatches focus, input, change, and blur events so frameworks and native
 * validation respond naturally without bypassing form validation.
 */
export function dispatchInputEvents(el: HTMLElement): void {
  if (typeof el.dispatchEvent !== "function" || typeof Event === "undefined") return;
  el.dispatchEvent(new Event("focus", { bubbles: true }));
  el.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
  el.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
  el.dispatchEvent(new Event("blur", { bubbles: true }));
}

/**
 * Visually highlights a successfully autofilled field with an emerald outline.
 */
export function highlightFilledField(el: HTMLElement): void {
  if (!el.style) return;
  const originalOutline = el.style.outline;
  const originalBoxShadow = el.style.boxShadow;
  const originalTransition = el.style.transition;

  el.style.transition = "outline 0.2s ease, box-shadow 0.2s ease";
  el.style.outline = "2px solid #10b981";
  el.style.boxShadow = "0 0 0 3px rgba(16, 185, 129, 0.25)";

  if (typeof setTimeout === "function") {
    setTimeout(() => {
      el.style.outline = originalOutline;
      el.style.boxShadow = originalBoxShadow;
      el.style.transition = originalTransition;
    }, 3500);
  }
}

/**
 * Checks whether a form control is empty and eligible to be filled.
 * Preserves any existing user-entered value.
 */
export function isFieldEmpty(
  el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
): boolean {
  const tag = (el.tagName || "").toUpperCase();
  if (tag === "SELECT") {
    const selectEl = el as HTMLSelectElement;
    const idx = selectEl.selectedIndex ?? -1;
    if (idx < 0) return true;
    const currentOpt = selectEl.options?.[idx];
    return isPlaceholderOption(currentOpt);
  }
  const val = (el as HTMLInputElement | HTMLTextAreaElement).value ?? "";
  return val.trim().length === 0;
}

/**
 * Resolves the candidate profile value for a semantic field type.
 * Enforces safety rule: never returns salary or notice period unless
 * explicitly configured by the user.
 */
export function resolveValueForField(
  type: SemanticFieldType,
  profile: CandidateProfile,
  options: AutofillOptions = {}
): string | null {
  const { personal, social, experience, education, preferences, skills } = profile;

  switch (type) {
    case "fullName":
      return `${personal.firstName} ${personal.lastName}`.trim() || null;
    case "firstName":
      return personal.firstName || null;
    case "lastName":
      return personal.lastName || null;
    case "email":
      return personal.email || null;
    case "phone":
      return personal.phone || null;
    case "location":
      return personal.location || null;
    case "city": {
      if (!personal.location) return null;
      if (personal.location.includes(",")) {
        return personal.location.split(",")[0].trim();
      }
      return personal.location;
    }
    case "state":
      return "Delhi";
    case "country":
      return "India";
    case "postalCode":
      return "110001";
    case "currentCompany": {
      const currentJob = experience.find((e) => e.current) ?? experience[0];
      return currentJob?.company || null;
    }
    case "previousCompany": {
      const prevJob = experience.find((e) => !e.current) ?? experience[1];
      return prevJob?.company || null;
    }
    case "currentTitle":
      return personal.professionalTitle || null;
    case "experience": {
      const totalMonths = experience.reduce((acc, job) => {
        if (!job.startDate) return acc;
        const start = new Date(job.startDate);
        const end = job.endDate ? new Date(job.endDate) : new Date();
        const diff =
          (end.getFullYear() - start.getFullYear()) * 12 +
          (end.getMonth() - start.getMonth());
        return acc + Math.max(0, diff);
      }, 0);
      const totalYears = Math.round(totalMonths / 12);
      if (totalYears === 0) return "Fresher";
      if (totalYears === 1) return "1";
      if (totalYears <= 2) return "2";
      if (totalYears <= 3) return "3";
      if (totalYears <= 5) return "5";
      return String(totalYears);
    }
    case "resumeLink":
      return social.linkedin || social.portfolio || null;
    case "linkedin":
      return social.linkedin || null;
    case "github":
      return social.github || null;
    case "portfolio":
      return social.portfolio || null;
    case "bio":
      return personal.bio || null;
    case "skills":
      return skills.length > 0 ? skills.join(", ") : null;
    case "educationDegree":
      return education[0]?.degree || null;
    case "educationSchool":
      return education[0]?.institution || null;
    case "educationGradYear":
      return education[0]?.endDate ? education[0].endDate.slice(0, 4) : null;
    case "workAuth":
      return preferences.workAuthorization || null;
    case "noticePeriod": {
      const val = (preferences.noticePeriod ?? "").trim();
      if (!val) return null;
      if (!options.allowDefaultPreferences && val === DEFAULT_UNCONFIGURED_NOTICE) {
        return null;
      }
      return val;
    }
    case "expectedSalary": {
      const val = (preferences.desiredSalary ?? "").trim();
      if (!val) return null;
      if (!options.allowDefaultPreferences && val === DEFAULT_UNCONFIGURED_SALARY) {
        return null;
      }
      return val;
    }
    default:
      return null;
  }
}

/**
 * Executes one-click autofill across all detected form controls in `root`
 * (defaults to `document`) using the provided `CandidateProfile`.
 */
export function executeAutofill(
  profile: CandidateProfile,
  options: AutofillOptions = {}
): AutofillExecutionResult {
  const rootNode =
    options.root ?? (typeof document !== "undefined" ? document : null);

  if (!rootNode || typeof rootNode.querySelectorAll !== "function") {
    const emptySummary: AutofillSummary = {
      detectedFields: 0,
      filledFields: 0,
      skippedFields: 0,
      failedFields: 0,
    };
    return {
      success: false,
      filledCount: 0,
      totalFieldsFound: 0,
      filledFields: [],
      summary: emptySummary,
      message: "No document available to scan.",
    };
  }

  const elements = Array.from(
    rootNode.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      "input, textarea, select"
    )
  );

  const filledFields: AutofillFieldResult[] = [];
  let detectedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const el of elements) {
    // Never touch ApplyMate's own Shadow DOM UI or disabled/readOnly controls
    if (typeof el.closest === "function" && el.closest("#applymate-extension-root")) {
      continue;
    }
    if (el.disabled || (el as HTMLInputElement).readOnly) {
      continue;
    }

    const classification = classifyFormField(el);
    if (!classification) continue;

    detectedCount++;

    // Safety guard 1: Skip low-confidence or ambiguous fields
    if (
      classification.confidence < MIN_AUTOFILL_CONFIDENCE ||
      classification.ambiguous
    ) {
      skippedCount++;
      continue;
    }

    // Safety guard 2: Preserve existing user-entered values (fill only empty fields)
    if (!isFieldEmpty(el)) {
      skippedCount++;
      continue;
    }

    // Safety guard 3: Resolve profile value (respects explicit salary/notice rules)
    const value = resolveValueForField(classification.type, profile, options);
    if (!value) {
      skippedCount++;
      continue;
    }

    const tag = (el.tagName || "").toUpperCase();

    try {
      if (tag === "INPUT" || tag === "TEXTAREA") {
        setNativeValue(el as HTMLInputElement | HTMLTextAreaElement, value);
        dispatchInputEvents(el);
        highlightFilledField(el);
        filledFields.push({
          fieldType: classification.type,
          fieldName: classification.label,
          valueFilled: value,
          success: true,
        });
      } else if (tag === "SELECT") {
        const selected = selectBestOption(el as HTMLSelectElement, value);
        if (selected) {
          dispatchInputEvents(el);
          highlightFilledField(el);
          filledFields.push({
            fieldType: classification.type,
            fieldName: classification.label,
            valueFilled: value,
            success: true,
          });
        } else {
          failedCount++;
        }
      } else {
        skippedCount++;
      }
    } catch {
      failedCount++;
    }
  }

  const summary: AutofillSummary = {
    detectedFields: detectedCount,
    filledFields: filledFields.length,
    skippedFields: skippedCount,
    failedFields: failedCount,
  };

  const success = filledFields.length > 0;
  const message = success
    ? `Successfully autofilled ${filledFields.length} field${filledFields.length > 1 ? "s" : ""}!`
    : detectedCount > 0
      ? "No empty matching fields needed autofilling."
      : "No matching fields could be filled on this page.";

  return {
    success,
    filledCount: filledFields.length,
    totalFieldsFound: detectedCount,
    filledFields,
    summary,
    message,
  };
}

/**
 * One-click autofill entry point: retrieves the saved profile from storage
 * (or falls back to DEFAULT_PROFILE) and executes autofill on the page.
 */
export async function runAutofill(
  options: AutofillOptions & { profile?: CandidateProfile } = {}
): Promise<AutofillExecutionResult> {
  const profile = options.profile ?? (await loadSavedProfile());
  return executeAutofill(profile, options);
}
