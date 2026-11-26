/**
 * ApplyMate — Reusable One-Click Autofill Engine (v2)
 *
 * Connects the Form Detection Engine (`fieldClassifier.ts`) with the candidate's
 * saved profile (`browser.storage.local` / `DEFAULT_PROFILE`).
 *
 * Features & Safety Guards:
 *  - Fills ONLY empty fields (preserves existing user-entered values).
 *  - Skips low-confidence (< 0.70) and ambiguous fields, flagging them for manual attention.
 *  - Never fills salary or notice period unless explicitly configured.
 *  - Never fills demographic fields or clicks submit buttons.
 *  - Visual feedback: green (filled), neutral slate (skipped), red (error/failed).
 *  - Detailed review items (`fields[]`) + summary counts.
 *  - Single-field manual fill (`fillSingleField`), Undo (`undoLastAutofill`),
 *    and duplicate autofill prevention (`resetAutofillState`).
 */

import type { CandidateProfile } from "../../src/types/profile.ts";
import { DEFAULT_PROFILE } from "../../src/lib/profile/defaultProfile.ts";
import type {
  JobPlatform,
  SemanticFieldType,
  ClassifiedFieldInfo,
  AutofillFieldResult,
  AutofillExecutionResult,
  AutofillSummary,
  FieldReviewItem,
  UndoAutofillResult,
  FillSingleFieldResult,
} from "../src/types.ts";
import { detectJobPlatform } from "../src/detector.ts";
import { classifyFieldForPlatform, getSiteAdapter } from "./siteAdapters.ts";

export const PROFILE_STORAGE_KEY = "applymate_profile";
export const MIN_AUTOFILL_CONFIDENCE = 0.70;

const DEFAULT_UNCONFIGURED_NOTICE = "Available immediately / 2 weeks";
const DEFAULT_UNCONFIGURED_SALARY = "Competitive";

export type HighlightKind = "success" | "skipped" | "error";

export interface AutofillOptions {
  /** Override root DOM node to scan (defaults to site adapter root or `document`) */
  root?: Document | HTMLElement;
  /** Override detected platform (useful in tests) */
  platform?: JobPlatform;
  /** Allow filling default noticePeriod/desiredSalary placeholders (default: false) */
  allowDefaultPreferences?: boolean;
  /** Bypass duplicate-autofill guard (e.g. after explicit rerun) */
  force?: boolean;
}

// ─── Module-level state for Undo, Manual Fill, & Duplicate Prevention ────────

interface UndoEntry {
  element: HTMLElement;
  tag: string;
  prevValue: string;
  prevSelectedIndex: number;
}

interface RegisteredField {
  element: HTMLElement;
  classification: ClassifiedFieldInfo;
  reviewItem: FieldReviewItem;
}

const scannedFieldRegistry = new Map<string, RegisteredField>();
const originalStyleMap = new WeakMap<
  HTMLElement,
  { outline: string; boxShadow: string; transition: string }
>();

let undoStack: UndoEntry[] = [];
let isAutofillRunning = false;
let lastAutofilledRoot: Document | HTMLElement | null = null;
let lastExecutionResult: AutofillExecutionResult | null = null;

/**
 * Clears duplicate-autofill lock & field registry (called on Undo or Rerun Detection).
 */
export function resetAutofillState(): void {
  lastAutofilledRoot = null;
  lastExecutionResult = null;
  scannedFieldRegistry.clear();
}

export function canUndoAutofill(): boolean {
  return undoStack.length > 0;
}

// ─── Storage ─────────────────────────────────────────────────────────────────

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

// ─── DOM Helpers ─────────────────────────────────────────────────────────────

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

  // 2. "Fresher" normalisation
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

  // 3. Numeric year matching
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

  // 4. Substring / keyword match
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

const HIGHLIGHT_STYLES: Record<HighlightKind, { outline: string; boxShadow: string }> = {
  success: {
    outline: "2px solid #10b981",
    boxShadow: "0 0 0 3px rgba(16, 185, 129, 0.25)",
  },
  skipped: {
    outline: "2px solid #94a3b8",
    boxShadow: "0 0 0 3px rgba(148, 163, 184, 0.18)",
  },
  error: {
    outline: "2px solid #ef4444",
    boxShadow: "0 0 0 3px rgba(239, 68, 68, 0.22)",
  },
};

/**
 * Visually highlights a field based on outcome:
 *  - "success": green (#10b981)
 *  - "skipped": neutral slate (#94a3b8)
 *  - "error":   red (#ef4444)
 */
export function highlightField(el: HTMLElement, kind: HighlightKind): void {
  if (!el.style) return;
  if (!originalStyleMap.has(el)) {
    originalStyleMap.set(el, {
      outline: el.style.outline,
      boxShadow: el.style.boxShadow,
      transition: el.style.transition,
    });
  }

  const palette = HIGHLIGHT_STYLES[kind];
  el.style.transition = "outline 0.2s ease, box-shadow 0.2s ease";
  el.style.outline = palette.outline;
  el.style.boxShadow = palette.boxShadow;
}

export function clearFieldHighlight(el: HTMLElement): void {
  if (!el.style) return;
  const orig = originalStyleMap.get(el);
  if (orig) {
    el.style.outline = orig.outline;
    el.style.boxShadow = orig.boxShadow;
    el.style.transition = orig.transition;
    originalStyleMap.delete(el);
  } else {
    el.style.outline = "";
    el.style.boxShadow = "";
  }
}

/** Backward-compatible alias */
export function highlightFilledField(el: HTMLElement): void {
  highlightField(el, "success");
}

/**
 * Checks whether a form control is empty and eligible to be filled.
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
      return social.portfolio || social.github || null;
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

// ─── Core Autofill Execution ─────────────────────────────────────────────────

/**
 * Executes one-click autofill across all detected form controls in `root`.
 * Prevents duplicate runs on the same form unless undone or forced.
 */
export function executeAutofill(
  profile: CandidateProfile,
  options: AutofillOptions = {}
): AutofillExecutionResult {
  const activePlatform: JobPlatform =
    options.platform ??
    (typeof location !== "undefined"
      ? detectJobPlatform(location.href, location.hostname)
      : "Generic Application");

  const adapter = getSiteAdapter(activePlatform);
  const rootNode =
    options.root ??
    (typeof document !== "undefined"
      ? (adapter.getFormRoot?.(document) ?? document)
      : null);

  if (!rootNode || typeof rootNode.querySelectorAll !== "function") {
    return {
      success: false,
      filledCount: 0,
      totalFieldsFound: 0,
      filledFields: [],
      fields: [],
      summary: {
        detectedFields: 0,
        filledFields: 0,
        skippedFields: 0,
        failedFields: 0,
        manualAttentionFields: 0,
      },
      canUndo: canUndoAutofill(),
      message: "No document available to scan.",
    };
  }

  // Prevent concurrent or duplicate autofill operations on the same root
  if (isAutofillRunning) {
    return {
      success: false,
      filledCount: 0,
      totalFieldsFound: 0,
      filledFields: [],
      fields: lastExecutionResult?.fields ?? [],
      summary: lastExecutionResult?.summary ?? {
        detectedFields: 0,
        filledFields: 0,
        skippedFields: 0,
        failedFields: 0,
        manualAttentionFields: 0,
      },
      canUndo: canUndoAutofill(),
      duplicatePrevented: true,
      message: "Autofill is already in progress.",
    };
  }

  if (!options.force && lastAutofilledRoot === rootNode && lastExecutionResult) {
    return {
      ...lastExecutionResult,
      duplicatePrevented: true,
      canUndo: canUndoAutofill(),
      message: "Autofill already completed for this form. Use Undo or Rerun Detection to run again.",
    };
  }

  isAutofillRunning = true;

  try {
    const elements = Array.from(
      rootNode.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
        "input, textarea, select"
      )
    );

    const filledFields: AutofillFieldResult[] = [];
    const reviewItems: FieldReviewItem[] = [];
    const newUndoEntries: UndoEntry[] = [];

    scannedFieldRegistry.clear();

    let detectedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    let manualAttentionCount = 0;

    for (const el of elements) {
      if (typeof el.closest === "function" && el.closest("#applymate-extension-root")) {
        continue;
      }
      if (el.disabled || (el as HTMLInputElement).readOnly) {
        continue;
      }

      const classification = classifyFieldForPlatform(el, activePlatform);
      if (!classification) continue;

      const fieldId = `am-field-${detectedCount}`;
      detectedCount++;

      const tag = (el.tagName || "").toUpperCase();
      const suggested =
        resolveValueForField(classification.type, profile, {
          ...options,
          allowDefaultPreferences: true,
        }) ?? undefined;

      // Guard 1: Low-confidence or ambiguous fields -> manual attention
      if (
        classification.confidence < MIN_AUTOFILL_CONFIDENCE ||
        classification.ambiguous
      ) {
        manualAttentionCount++;
        skippedCount++;
        highlightField(el, "skipped");
        const item: FieldReviewItem = {
          fieldId,
          fieldType: classification.type,
          fieldName: classification.label,
          status: "manual_attention",
          confidence: classification.confidence,
          ambiguous: classification.ambiguous,
          suggestedValue: suggested,
          reason: classification.ambiguous
            ? "Ambiguous field — please review & fill manually"
            : "Low confidence — please verify manually",
        };
        reviewItems.push(item);
        scannedFieldRegistry.set(fieldId, { element: el, classification, reviewItem: item });
        continue;
      }

      // Guard 2: Preserve existing user-entered values
      if (!isFieldEmpty(el)) {
        skippedCount++;
        highlightField(el, "skipped");
        const currentVal =
          tag === "SELECT"
            ? (el as HTMLSelectElement).options?.[(el as HTMLSelectElement).selectedIndex]?.text ?? ""
            : (el as HTMLInputElement | HTMLTextAreaElement).value ?? "";
        const item: FieldReviewItem = {
          fieldId,
          fieldType: classification.type,
          fieldName: classification.label,
          status: "skipped",
          confidence: classification.confidence,
          ambiguous: false,
          valueFilled: currentVal,
          suggestedValue: suggested,
          reason: "Preserved existing value",
        };
        reviewItems.push(item);
        scannedFieldRegistry.set(fieldId, { element: el, classification, reviewItem: item });
        continue;
      }

      // Guard 3: Resolve profile value (respects explicit salary/notice rules)
      const value = resolveValueForField(classification.type, profile, options);
      if (!value) {
        const isPref =
          classification.type === "expectedSalary" ||
          classification.type === "noticePeriod";
        if (isPref) manualAttentionCount++;
        skippedCount++;
        highlightField(el, "skipped");
        const item: FieldReviewItem = {
          fieldId,
          fieldType: classification.type,
          fieldName: classification.label,
          status: isPref ? "manual_attention" : "skipped",
          confidence: classification.confidence,
          ambiguous: false,
          suggestedValue: suggested,
          reason: isPref
            ? "Not explicitly configured — fill manually if needed"
            : "No saved value in profile",
        };
        reviewItems.push(item);
        scannedFieldRegistry.set(fieldId, { element: el, classification, reviewItem: item });
        continue;
      }

      const prevValue =
        tag === "SELECT" ? "" : (el as HTMLInputElement | HTMLTextAreaElement).value ?? "";
      const prevSelectedIndex =
        tag === "SELECT" ? (el as HTMLSelectElement).selectedIndex ?? 0 : -1;

      try {
        if (tag === "INPUT" || tag === "TEXTAREA") {
          setNativeValue(el as HTMLInputElement | HTMLTextAreaElement, value);
          dispatchInputEvents(el);
          highlightField(el, "success");
          newUndoEntries.push({ element: el, tag, prevValue, prevSelectedIndex });
          filledFields.push({
            fieldType: classification.type,
            fieldName: classification.label,
            valueFilled: value,
            success: true,
          });
          const item: FieldReviewItem = {
            fieldId,
            fieldType: classification.type,
            fieldName: classification.label,
            status: "filled",
            confidence: classification.confidence,
            ambiguous: false,
            valueFilled: value,
            reason: "Autofilled from profile",
          };
          reviewItems.push(item);
          scannedFieldRegistry.set(fieldId, { element: el, classification, reviewItem: item });
        } else if (tag === "SELECT") {
          const selected = selectBestOption(el as HTMLSelectElement, value);
          if (selected) {
            dispatchInputEvents(el);
            highlightField(el, "success");
            newUndoEntries.push({ element: el, tag, prevValue, prevSelectedIndex });
            filledFields.push({
              fieldType: classification.type,
              fieldName: classification.label,
              valueFilled: value,
              success: true,
            });
            const item: FieldReviewItem = {
              fieldId,
              fieldType: classification.type,
              fieldName: classification.label,
              status: "filled",
              confidence: classification.confidence,
              ambiguous: false,
              valueFilled: value,
              reason: "Matched dropdown option",
            };
            reviewItems.push(item);
            scannedFieldRegistry.set(fieldId, { element: el, classification, reviewItem: item });
          } else {
            failedCount++;
            highlightField(el, "error");
            const item: FieldReviewItem = {
              fieldId,
              fieldType: classification.type,
              fieldName: classification.label,
              status: "failed",
              confidence: classification.confidence,
              ambiguous: false,
              suggestedValue: value,
              reason: `No matching option for "${value}"`,
            };
            reviewItems.push(item);
            scannedFieldRegistry.set(fieldId, { element: el, classification, reviewItem: item });
          }
        } else {
          skippedCount++;
        }
      } catch {
        failedCount++;
        highlightField(el, "error");
        const item: FieldReviewItem = {
          fieldId,
          fieldType: classification.type,
          fieldName: classification.label,
          status: "failed",
          confidence: classification.confidence,
          ambiguous: false,
          suggestedValue: value,
          reason: "Failed to write value to element",
        };
        reviewItems.push(item);
        scannedFieldRegistry.set(fieldId, { element: el, classification, reviewItem: item });
      }
    }

    if (newUndoEntries.length > 0) {
      undoStack = newUndoEntries;
    }

    const summary: AutofillSummary = {
      detectedFields: detectedCount,
      filledFields: filledFields.length,
      skippedFields: skippedCount,
      failedFields: failedCount,
      manualAttentionFields: manualAttentionCount,
    };

    const success = filledFields.length > 0;
    const message = success
      ? `Autofilled ${filledFields.length} of ${detectedCount} detected field${detectedCount !== 1 ? "s" : ""}.`
      : detectedCount > 0
        ? "No empty matching fields needed autofilling."
        : "No matching fields could be filled on this page.";

    const result: AutofillExecutionResult = {
      success,
      filledCount: filledFields.length,
      totalFieldsFound: detectedCount,
      filledFields,
      fields: reviewItems,
      summary,
      canUndo: undoStack.length > 0,
      duplicatePrevented: false,
      message,
    };

    lastAutofilledRoot = rootNode;
    lastExecutionResult = result;
    return result;
  } finally {
    isAutofillRunning = false;
  }
}

/**
 * Manually fills a single registered field (by `fieldId`) with either `customValue`
 * or the resolved profile value. Records the change in `undoStack`.
 */
export function fillSingleField(
  fieldId: string,
  profile: CandidateProfile,
  customValue?: string
): FillSingleFieldResult {
  const entry = scannedFieldRegistry.get(fieldId);
  if (!entry) {
    return {
      success: false,
      message: "Field is no longer available. Try rerunning detection.",
    };
  }

  const { element: el, classification, reviewItem } = entry;
  const value =
    customValue !== undefined && customValue.trim() !== ""
      ? customValue.trim()
      : resolveValueForField(classification.type, profile, {
          allowDefaultPreferences: true,
        });

  if (!value) {
    return {
      success: false,
      message: `No value available for ${classification.label}.`,
    };
  }

  const tag = (el.tagName || "").toUpperCase();
  const prevValue =
    tag === "SELECT" ? "" : (el as HTMLInputElement | HTMLTextAreaElement).value ?? "";
  const prevSelectedIndex =
    tag === "SELECT" ? (el as HTMLSelectElement).selectedIndex ?? 0 : -1;

  try {
    if (tag === "INPUT" || tag === "TEXTAREA") {
      setNativeValue(el as HTMLInputElement | HTMLTextAreaElement, value);
      dispatchInputEvents(el);
      highlightField(el, "success");
    } else if (tag === "SELECT") {
      const ok = selectBestOption(el as HTMLSelectElement, value);
      if (!ok) {
        highlightField(el, "error");
        return {
          success: false,
          message: `No dropdown option matches "${value}".`,
        };
      }
      dispatchInputEvents(el);
      highlightField(el, "success");
    } else {
      return { success: false, message: "Unsupported element type." };
    }

    undoStack.push({ element: el, tag, prevValue, prevSelectedIndex });

    const updatedItem: FieldReviewItem = {
      ...reviewItem,
      status: "filled",
      valueFilled: value,
      reason: "Manually filled via review",
    };
    entry.reviewItem = updatedItem;

    return {
      success: true,
      field: updatedItem,
      message: `Filled ${classification.label}.`,
    };
  } catch {
    highlightField(el, "error");
    return {
      success: false,
      message: `Could not fill ${classification.label}.`,
    };
  }
}

/**
 * Undoes the most recent autofill operation, restoring every modified field's
 * previous value/selection, dispatching events, and clearing highlights.
 */
export function undoLastAutofill(): UndoAutofillResult {
  if (undoStack.length === 0) {
    return {
      success: false,
      restoredCount: 0,
      message: "Nothing to undo.",
    };
  }

  let restoredCount = 0;
  for (const item of undoStack) {
    try {
      if (item.tag === "SELECT") {
        (item.element as HTMLSelectElement).selectedIndex = item.prevSelectedIndex;
      } else {
        setNativeValue(
          item.element as HTMLInputElement | HTMLTextAreaElement,
          item.prevValue
        );
      }
      dispatchInputEvents(item.element);
      clearFieldHighlight(item.element);
      restoredCount++;
    } catch {
      // Continue restoring remaining elements
    }
  }

  undoStack = [];
  // Allow autofill to run again after undo
  lastAutofilledRoot = null;
  lastExecutionResult = null;

  return {
    success: restoredCount > 0,
    restoredCount,
    message: `Undid autofill for ${restoredCount} field${restoredCount !== 1 ? "s" : ""}.`,
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
