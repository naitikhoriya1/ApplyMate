/**
 * ApplyMate Extension — Shared Message Types & Autofill Contracts
 *
 * Defines contracts between:
 *   content script <-> background service worker <-> popup
 */

import type { CandidateProfile } from "../../src/types/profile.ts";

export type MessageType =
  | "PAGE_INFO"           // content → background: report page title + URL + form detection
  | "PAGE_INFO_REQ"       // popup → background: request current tab info
  | "PAGE_INFO_RES"       // background → popup: respond with current tab info
  | "GET_PROFILE"         // content/popup → background: fetch stored CandidateProfile
  | "GET_PROFILE_RES"     // background → content/popup: candidate profile response
  | "TRIGGER_AUTOFILL"    // popup → content: trigger autofill in active tab
  | "AUTOFILL_RES"        // content → popup: autofill execution result
  | "UNDO_AUTOFILL"       // popup → content: undo most recent autofill
  | "UNDO_AUTOFILL_RES"   // content → popup: undo result
  | "FILL_SINGLE_FIELD"   // popup → content: manually fill a single detected field
  | "FILL_SINGLE_FIELD_RES" // content → popup: single field fill result
  | "RERUN_DETECTION"     // popup → content: re-scan DOM for form fields
  | "ANALYZE_JOB"         // popup → content: extract & analyze job listing
  | "ANALYZE_JOB_RES"     // content → popup: job analysis result
  | "INSERT_ANSWER"       // popup → content: insert edited answer into textarea
  | "INSERT_ANSWER_RES"   // content → popup: insertion result
  | "PING"                // health check
  | "PONG";               // health check response

export type JobPlatform =
  | "Greenhouse"
  | "Lever"
  | "Workday"
  | "Ashby"
  | "LinkedIn"
  | "Indeed"
  | "Naukri"
  | "SmartRecruiters"
  | "Generic Application"
  | "None";

export type SemanticFieldType =
  // ── Personal identity ───────────────────────────────────────────────────
  | "fullName"
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  // ── Location ────────────────────────────────────────────────────────────
  | "city"
  | "state"
  | "country"
  | "postalCode"
  | "location"           // generic "current location" field
  // ── Professional ────────────────────────────────────────────────────────
  | "currentTitle"
  | "currentCompany"
  | "previousCompany"
  | "experience"
  // ── Social / Links ──────────────────────────────────────────────────────
  | "resumeLink"
  | "linkedin"
  | "github"
  | "portfolio"
  // ── Narrative ───────────────────────────────────────────────────────────
  | "bio"
  | "skills"
  // ── Education ───────────────────────────────────────────────────────────
  | "educationDegree"
  | "educationSchool"
  | "educationGradYear"  // canonical: graduation year
  // ── Preferences / Administrative ────────────────────────────────────────
  | "workAuth"
  | "noticePeriod"
  | "expectedSalary";

/**
 * Full metadata extracted from a form element used to drive classification.
 * All fields are pre-normalised (lowercase, trimmed).
 */
export interface FieldMetadata {
  /** Raw element for downstream reference */
  element: HTMLElement;
  /** Normalised label text (from <label>, aria-label, aria-labelledby) */
  labelText: string;
  /** Normalised placeholder */
  placeholderText: string;
  /** Normalised name attribute */
  nameAttr: string;
  /** Normalised id attribute */
  idAttr: string;
  /** HTML autocomplete token */
  autocompleteToken: string;
  /** HTML input type (text, email, tel, url, …) */
  inputType: string;
  /** Nearby container / sibling text (paragraph, div, span) */
  contextText: string;
  /** Concatenated normalised cue string for regex sweeps */
  combined: string;
}

export interface ClassifiedFieldInfo {
  type: SemanticFieldType;
  /** Human-readable display label for the field (e.g. "Full Name") */
  label: string;
  /**
   * 0–1 confidence score.
   * ≥ 0.90  = high — fill without prompting
   * 0.70–0.89 = medium — fill but allow undo
   * 0.50–0.69 = low — flag as ambiguous, do not fill automatically
   * < 0.50  = none — ignore
   */
  confidence: number;
  /** True when multiple rules matched with similar scores (needs disambiguation) */
  ambiguous: boolean;
  /** Signal source that produced the highest score */
  matchedSignal: "inputType" | "autocomplete" | "placeholder" | "label" | "name" | "id" | "context" | "combined";
}

export interface FormDetectionResult {
  detected: boolean;
  platform: JobPlatform;
  fieldsCount: number;
  hasResumeUpload: boolean;
  detectedFields: string[]; // Human-readable field names (e.g. "Full Name", "Email", "Current city")
  classifiedTypes: SemanticFieldType[];
  confidence: "high" | "medium" | "low" | "none";
}

export interface AutofillFieldResult {
  fieldType: SemanticFieldType;
  fieldName: string;
  valueFilled: string;
  success: boolean;
}

export type FieldReviewStatus = "filled" | "skipped" | "failed" | "manual_attention";

export interface FieldReviewItem {
  fieldId: string;
  fieldType: SemanticFieldType;
  fieldName: string;
  status: FieldReviewStatus;
  confidence: number;
  ambiguous: boolean;
  valueFilled?: string;
  suggestedValue?: string;
  reason: string;
}

export interface AutofillSummary {
  detectedFields: number;
  filledFields: number;
  skippedFields: number;
  failedFields: number;
  manualAttentionFields?: number;
}

export interface AutofillExecutionResult {
  success: boolean;
  filledCount: number;
  totalFieldsFound: number;
  filledFields: AutofillFieldResult[];
  fields?: FieldReviewItem[];
  summary: AutofillSummary;
  canUndo?: boolean;
  duplicatePrevented?: boolean;
  message: string;
}

export interface UndoAutofillResult {
  success: boolean;
  restoredCount: number;
  message: string;
}

export interface FillSingleFieldPayload {
  fieldId: string;
  customValue?: string;
}

export interface FillSingleFieldResult {
  success: boolean;
  field?: FieldReviewItem;
  message: string;
}

export interface PageInfoPayload {
  title: string;
  url: string;
  host: string;
  timestamp: number;
  formDetection: FormDetectionResult;
}

export interface Message<T extends MessageType = MessageType, P = unknown> {
  type: T;
  payload?: P;
}

export type PageInfoMessage = Message<"PAGE_INFO", PageInfoPayload>;
export type PageInfoReqMessage = Message<"PAGE_INFO_REQ">;
export type PageInfoResMessage = Message<"PAGE_INFO_RES", PageInfoPayload | null>;
export type GetProfileMessage = Message<"GET_PROFILE">;
export type GetProfileResMessage = Message<"GET_PROFILE_RES", CandidateProfile>;
export interface JobAnalysisResult {
  companyName: string;
  jobTitle: string;
  jobDescription: string;
  requiredSkills: string[];
  preferredSkills: string[];
  experienceRequired: string;
  location: string;
  employmentType: string;
  platform: JobPlatform;
  sourceUrl: string;
  extractedAt: string;
  usedManualSelection?: boolean;
}

export interface AnalyzeJobPayload {
  useSelection?: boolean;
  manualText?: string;
}

export interface InsertAnswerPayload {
  answer: string;
}

export interface InsertAnswerResult {
  success: boolean;
  message: string;
}

export type TriggerAutofillMessage = Message<"TRIGGER_AUTOFILL">;
export type AutofillResMessage = Message<"AUTOFILL_RES", AutofillExecutionResult>;
export type UndoAutofillMessage = Message<"UNDO_AUTOFILL">;
export type UndoAutofillResMessage = Message<"UNDO_AUTOFILL_RES", UndoAutofillResult>;
export type FillSingleFieldMessage = Message<"FILL_SINGLE_FIELD", FillSingleFieldPayload>;
export type FillSingleFieldResMessage = Message<"FILL_SINGLE_FIELD_RES", FillSingleFieldResult>;
export type RerunDetectionMessage = Message<"RERUN_DETECTION">;
export type AnalyzeJobMessage = Message<"ANALYZE_JOB", AnalyzeJobPayload>;
export type AnalyzeJobResMessage = Message<"ANALYZE_JOB_RES", JobAnalysisResult>;
export type InsertAnswerMessage = Message<"INSERT_ANSWER", InsertAnswerPayload>;
export type InsertAnswerResMessage = Message<"INSERT_ANSWER_RES", InsertAnswerResult>;
export type PingMessage = Message<"PING">;
export type PongMessage = Message<"PONG", { version: string }>;

export type AnyMessage =
  | PageInfoMessage
  | PageInfoReqMessage
  | PageInfoResMessage
  | GetProfileMessage
  | GetProfileResMessage
  | TriggerAutofillMessage
  | AutofillResMessage
  | UndoAutofillMessage
  | UndoAutofillResMessage
  | FillSingleFieldMessage
  | FillSingleFieldResMessage
  | RerunDetectionMessage
  | AnalyzeJobMessage
  | AnalyzeJobResMessage
  | InsertAnswerMessage
  | InsertAnswerResMessage
  | PingMessage
  | PongMessage;
