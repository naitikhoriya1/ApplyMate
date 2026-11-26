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
  | "fullName"
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "city"
  | "state"
  | "country"
  | "postalCode"
  | "currentTitle"
  | "experience"
  | "resumeLink"
  | "linkedin"
  | "github"
  | "portfolio"
  | "bio"
  | "skills"
  | "educationDegree"
  | "educationSchool"
  | "educationGradYear"
  | "workAuth"
  | "noticePeriod"
  | "expectedSalary";

export interface ClassifiedFieldInfo {
  type: SemanticFieldType;
  label: string;
  confidence: number;
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

export interface AutofillExecutionResult {
  success: boolean;
  filledCount: number;
  totalFieldsFound: number;
  filledFields: AutofillFieldResult[];
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
