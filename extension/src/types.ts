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
  | "PING"                // health check
  | "PONG";               // health check response

export type JobPlatform =
  | "Greenhouse"
  | "Lever"
  | "Workday"
  | "Ashby"
  | "LinkedIn"
  | "Indeed"
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

export interface AutofillSummary {
  detectedFields: number;
  filledFields: number;
  skippedFields: number;
  failedFields: number;
}

export interface AutofillExecutionResult {
  success: boolean;
  filledCount: number;
  totalFieldsFound: number;
  filledFields: AutofillFieldResult[];
  summary: AutofillSummary;
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
export type TriggerAutofillMessage = Message<"TRIGGER_AUTOFILL">;
export type AutofillResMessage = Message<"AUTOFILL_RES", AutofillExecutionResult>;
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
  | PingMessage
  | PongMessage;
