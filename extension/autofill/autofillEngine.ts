/**
 * ApplyMate — Autofill Execution Engine
 *
 * Scans the active DOM, classifies each input/select/textarea against candidate
 * profile data, and fills matching fields with native prototype setter bypasses
 * and reactive DOM events so React, Angular, Vue, and vanilla forms accept the values.
 */

import type { CandidateProfile } from "../../src/types/profile.ts";
import type {
  SemanticFieldType,
  AutofillFieldResult,
  AutofillExecutionResult,
} from "../src/types.ts";
import { classifyFormField } from "./fieldClassifier.ts";

/**
 * Sets native value using element prototype descriptor to ensure modern
 * virtual DOM frameworks (React 18/19, Vue, Angular, Formik) trigger their internal state setters.
 */
export function setNativeValue(
  element: HTMLInputElement | HTMLTextAreaElement,
  value: string
): void {
  const valueSetter = Object.getOwnPropertyDescriptor(element, "value")?.set;
  const prototype = Object.getPrototypeOf(element);
  const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;

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
}

export interface SelectElementLike {
  options: ArrayLike<SelectOptionLike>;
  selectedIndex?: number;
}

/**
 * Intelligently finds and selects an <option> in an HTMLSelectElement.
 */
export function selectBestOption(
  selectEl: HTMLSelectElement | SelectElementLike,
  targetValue: string
): boolean {
  const lowerTarget = targetValue.toLowerCase().trim();
  const options = Array.from(selectEl.options);

  // 1. Exact match on option text or value
  for (let i = 0; i < options.length; i++) {
    const opt = options[i];
    const text = opt.text.toLowerCase().trim();
    const val = opt.value.toLowerCase().trim();
    if (text === lowerTarget || val === lowerTarget) {
      selectEl.selectedIndex = i;
      return true;
    }
  }

  // 2. Substring / keyword match (e.g. matching "Fresher" or "1" or "India")
  for (let i = 0; i < options.length; i++) {
    const opt = options[i];
    const text = opt.text.toLowerCase().trim();
    const val = opt.value.toLowerCase().trim();
    if (
      (lowerTarget && (text.includes(lowerTarget) || lowerTarget.includes(text))) ||
      (val && (val.includes(lowerTarget) || lowerTarget.includes(val)))
    ) {
      selectEl.selectedIndex = i;
      return true;
    }
  }

  return false;
}

/**
 * Dispatches the complete sequence of browser events to trigger form validation.
 */
export function dispatchInputEvents(el: HTMLElement): void {
  el.dispatchEvent(new Event("focus", { bubbles: true }));
  el.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
  el.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
  el.dispatchEvent(new Event("blur", { bubbles: true }));
}

/**
 * Visual highlight indicator that glows emerald when an input is filled.
 */
export function highlightFilledField(el: HTMLElement): void {
  const originalOutline = el.style.outline;
  const originalBoxShadow = el.style.boxShadow;
  const originalTransition = el.style.transition;

  el.style.transition = "outline 0.2s ease, box-shadow 0.2s ease";
  el.style.outline = "2px solid #10b981";
  el.style.boxShadow = "0 0 0 3px rgba(16, 185, 129, 0.25)";

  setTimeout(() => {
    el.style.outline = originalOutline;
    el.style.boxShadow = originalBoxShadow;
    el.style.transition = originalTransition;
  }, 3500);
}

/**
 * Resolves the candidate profile data for a specific semantic field.
 */
export function resolveValueForField(
  type: SemanticFieldType,
  profile: CandidateProfile
): string | null {
  const { personal, social, experience, education, preferences, skills } = profile;

  switch (type) {
    case "fullName":
      return `${personal.firstName} ${personal.lastName}`.trim();
    case "firstName":
      return personal.firstName;
    case "lastName":
      return personal.lastName;
    case "email":
      return personal.email;
    case "phone":
      return personal.phone;
    case "city": {
      // E.g. "Delhi, India" -> "Delhi" or full string
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
    case "currentTitle":
      return personal.professionalTitle;
    case "experience": {
      // Calculate from experience history or return latest duration
      if (experience.length > 0) {
        return `${experience.length} Year${experience.length > 1 ? "s" : ""}`;
      }
      return "1 Year";
    }
    case "resumeLink":
      // If the form asks for link to CV (e.g. Credit Samadhaan "Link to your CV (Google Drive, LinkedIn")
      return social.linkedin || social.portfolio || "https://linkedin.com/in/naitik";
    case "linkedin":
      return social.linkedin;
    case "github":
      return social.github;
    case "portfolio":
      return social.portfolio;
    case "bio":
      return personal.bio;
    case "skills":
      return skills.join(", ");
    case "educationDegree":
      return education[0]?.degree ?? "B.Tech";
    case "educationSchool":
      return education[0]?.institution ?? "Bikaner Technical University";
    case "educationGradYear":
      return education[0]?.endDate ? education[0].endDate.slice(0, 4) : "2025";
    case "workAuth":
      return preferences.workAuthorization;
    case "noticePeriod":
      return preferences.noticePeriod;
    case "expectedSalary":
      return preferences.desiredSalary;
    default:
      return null;
  }
}

/**
 * Executes autofill across all classified form controls in document.
 */
export function executeAutofill(profile: CandidateProfile): AutofillExecutionResult {
  const elements = Array.from(
    document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      "input, textarea, select"
    )
  );

  const filledFields: AutofillFieldResult[] = [];
  let totalCandidates = 0;

  for (const el of elements) {
    // Skip hidden, disabled, or extension's own elements
    if (
      el.type === "hidden" ||
      el.type === "submit" ||
      el.type === "button" ||
      el.type === "reset" ||
      el.type === "file" ||
      el.disabled ||
      el.closest("#applymate-extension-root")
    ) {
      continue;
    }

    const classification = classifyFormField(el);
    if (!classification) continue;

    totalCandidates++;
    const value = resolveValueForField(classification.type, profile);
    if (!value) continue;

    let wasFilled = false;

    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      setNativeValue(el, value);
      dispatchInputEvents(el);
      highlightFilledField(el);
      wasFilled = true;
    } else if (el instanceof HTMLSelectElement) {
      const selected = selectBestOption(el, value);
      if (selected) {
        dispatchInputEvents(el);
        highlightFilledField(el);
        wasFilled = true;
      }
    }

    if (wasFilled) {
      filledFields.push({
        fieldType: classification.type,
        fieldName: classification.label,
        valueFilled: value,
        success: true,
      });
    }
  }

  // Also check consent/terms checkbox if present and not already checked
  const checkboxes = Array.from(document.querySelectorAll<HTMLInputElement>("input[type='checkbox']"));
  for (const cb of checkboxes) {
    if (cb.disabled || cb.checked || cb.closest("#applymate-extension-root")) continue;
    const parentText = (cb.closest("label")?.textContent || cb.parentElement?.textContent || "").toLowerCase();
    if (
      parentText.includes("agree") ||
      parentText.includes("consent") ||
      parentText.includes("contact") ||
      parentText.includes("terms") ||
      parentText.includes("privacy")
    ) {
      cb.checked = true;
      cb.dispatchEvent(new Event("change", { bubbles: true }));
      highlightFilledField(cb);
    }
  }

  const success = filledFields.length > 0;
  const message = success
    ? `Successfully autofilled ${filledFields.length} field${filledFields.length > 1 ? "s" : ""}!`
    : "No matching fields could be filled on this page.";

  return {
    success,
    filledCount: filledFields.length,
    totalFieldsFound: totalCandidates,
    filledFields,
    message,
  };
}
