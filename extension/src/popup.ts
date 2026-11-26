/**
 * ApplyMate — Popup Script (v2)
 *
 * Runs inside extension/popup/popup.html when the user clicks
 * the browser toolbar action button.
 *
 * Responsibilities:
 *  1. Health-ping background service worker on boot.
 *  2. Fetch and display the real candidate profile from storage.
 *  3. Fetch and display active tab page info (title, host, URL).
 *  4. Show application form detection status.
 *  5. Handle "Autofill Page" action — send TRIGGER_AUTOFILL to content script.
 *  6. Full loading / error / empty states.
 */

import type {
  PageInfoResMessage,
  PongMessage,
  GetProfileResMessage,
  AutofillResMessage,
  AutofillExecutionResult,
  FieldReviewItem,
  UndoAutofillResMessage,
  FillSingleFieldResMessage,
  AnalyzeJobResMessage,
  JobAnalysisResult,
  InsertAnswerResMessage,
} from "./types";
import type { CandidateProfile } from "../../src/types/profile";
import {
  generateLocalCoverLetter,
  type CoverLetterFormat,
} from "../../src/lib/ai/localCoverLetter";

// ─── Extension API shim (Safari / Chrome) ───────────────────────────────────
const ext = (typeof browser !== "undefined" ? browser : chrome) as typeof chrome;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function truncate(str: string, max: number): string {
  return str.length <= max ? str : str.slice(0, max - 1) + "…";
}

function formatTimeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 5)  return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function initials(first: string, last: string): string {
  return ((first[0] ?? "") + (last[0] ?? "")).toUpperCase() || "?";
}

/** Rough profile completeness score 0–100 */
function computeCompletion(p: CandidateProfile): number {
  let score = 0;
  const max = 10;

  if (p.personal.firstName && p.personal.lastName) score++;
  if (p.personal.email) score++;
  if (p.personal.phone) score++;
  if (p.personal.location) score++;
  if (p.personal.professionalTitle) score++;
  if (p.personal.bio && p.personal.bio.length > 20) score++;
  if (p.social.linkedin) score++;
  if (p.social.github || p.social.portfolio) score++;
  if (p.experience.length > 0) score++;
  if (p.education.length > 0) score++;

  return Math.round((score / max) * 100);
}

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const $  = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const statusDot        = $("status-dot");
const statusLabel      = $("status-label");
const versionBadge     = $("version-badge");
const errorState       = $("error-state");
const errorDesc        = $<HTMLElement>("error-desc");
const retryBtn         = $<HTMLButtonElement>("retry-btn");
const mainContent      = $("main-content");
const profileAvatar    = $("profile-avatar");
const profileName      = $("profile-name");
const profileJobTitle  = $("profile-job-title");
const completionBar    = $("completion-bar");
const completionPct    = $("completion-pct");
const autofillBtn      = $<HTMLButtonElement>("autofill-btn");
const autofillBtnText  = $("autofill-btn-text");
const autofillBtnSub   = $("autofill-btn-sub");
const autofillResult   = $("autofill-result");
const autofillResultMsg = $("autofill-result-msg");
const statDetected     = $("stat-detected");
const statFilled       = $("stat-filled");
const statSkipped      = $("stat-skipped");
const statFailed       = $("stat-failed");
const manualBanner     = $("manual-banner");
const manualBannerText = $("manual-banner-text");
const undoBtn          = $<HTMLButtonElement>("undo-btn");
const rerunBtn         = $<HTMLButtonElement>("rerun-btn");
const reviewList       = $("review-list");
const analyzeJobBtn    = $<HTMLButtonElement>("analyze-job-btn");
const analyzeSelBtn    = $<HTMLButtonElement>("analyze-selection-btn");
const jobFieldsWrap    = $("job-fields");
const jobTitleInput    = $<HTMLInputElement>("job-title-input");
const jobCompanyInput  = $<HTMLInputElement>("job-company-input");
const jobLocationInput = $<HTMLInputElement>("job-location-input");
const jobTypeInput     = $<HTMLInputElement>("job-type-input");
const jobExpInput      = $<HTMLInputElement>("job-exp-input");
const jobReqSkillsIn   = $<HTMLInputElement>("job-req-skills-input");
const jobPrefSkillsIn  = $<HTMLInputElement>("job-pref-skills-input");
const jobDescInput     = $<HTMLTextAreaElement>("job-desc-input");
const jobSaveBtn       = $<HTMLButtonElement>("job-save-btn");
const jobSaveStatus    = $("job-save-status");
const aiQuestionSelect = $<HTMLSelectElement>("ai-question-select");
const aiCustomWrap     = $("ai-custom-wrap");
const aiCustomInput    = $<HTMLInputElement>("ai-custom-question");
const aiGenerateBtn    = $<HTMLButtonElement>("ai-generate-btn");
const aiAnswerTextarea = $<HTMLTextAreaElement>("ai-answer-textarea");
const aiCopyBtn        = $<HTMLButtonElement>("ai-copy-btn");
const aiInsertBtn      = $<HTMLButtonElement>("ai-insert-btn");
const aiStatusMsg      = $("ai-status-msg");
const clFormatSelect   = $<HTMLSelectElement>("cl-format-select");
const clGenerateBtn    = $<HTMLButtonElement>("cl-generate-btn");
const clRegenerateBtn  = $<HTMLButtonElement>("cl-regenerate-btn");
const clTextarea       = $<HTMLTextAreaElement>("cl-textarea");
const clCopyBtn        = $<HTMLButtonElement>("cl-copy-btn");
const clInsertBtn      = $<HTMLButtonElement>("cl-insert-btn");
const clStatusMsg      = $("cl-status-msg");
const pageTitle        = $("page-title");
const pageHost         = $("page-host");
const pageUrl          = $("page-url");
const formDetectBanner = $("form-detect-banner");
const formDetectIcon   = $("form-detect-icon");
const formDetectStatus = $("form-detect-status");
const formDetectDesc   = $("form-detect-desc");
const platformTag      = $("platform-tag");
const lastUpdated      = $("last-updated");
const refreshBtn       = $<HTMLButtonElement>("refresh-btn");

// ─── State ────────────────────────────────────────────────────────────────────
let isLoading = false;
let isAutofilling = false;
let lastPageTs = 0;
let lastAutofillResult: AutofillExecutionResult | null = null;
let loadedProfile: CandidateProfile | null = null;

// ─── Status helpers ───────────────────────────────────────────────────────────
function setStatus(state: "active" | "loading" | "error", text: string): void {
  statusDot.className = `status-dot ${state}`;
  statusLabel.textContent = text;
}

function showError(msg: string): void {
  setStatus("error", "Error");
  errorDesc.textContent = msg;
  errorState.classList.remove("hidden");
  mainContent.classList.add("hidden");
}

function hideError(): void {
  errorState.classList.add("hidden");
  mainContent.classList.remove("hidden");
}

// ─── Profile rendering ────────────────────────────────────────────────────────
function renderProfile(profile: CandidateProfile): void {
  const { firstName, lastName, professionalTitle, email } = profile.personal;
  const isBlank = !firstName.trim() && !email.trim();
  if (isBlank) {
    profileAvatar.textContent = "+";
    profileName.textContent = "Complete Initial Setup";
    profileJobTitle.textContent =
      "Set up manually or import your PDF resume in the dashboard";
    completionBar.style.width = "0%";
    completionPct.textContent = "0%";
    return;
  }

  profileAvatar.textContent = initials(firstName, lastName);
  profileName.textContent   = `${firstName} ${lastName}`.trim();
  profileJobTitle.textContent = truncate(professionalTitle || "Candidate", 60);

  const pct = computeCompletion(profile);
  completionBar.style.width = `${pct}%`;
  completionPct.textContent = `${pct}%`;
}

// ─── Page info rendering ──────────────────────────────────────────────────────
function renderPageInfo(payload: { title: string; url: string; host: string; timestamp: number } | null): void {
  if (!payload) {
    pageTitle.textContent = "No page data yet";
    pageTitle.className = "site-val muted";
    pageHost.textContent = "—";
    pageUrl.textContent = "Navigate to any HTTPS page";
    pageUrl.className = "site-val muted";
    lastUpdated.textContent = "—";
    return;
  }

  pageTitle.textContent = truncate(payload.title || "(no title)", 55);
  pageTitle.className = "site-val";
  pageHost.textContent = payload.host || "—";
  pageUrl.textContent  = truncate(payload.url, 48);
  pageUrl.className    = "site-val url";
  lastPageTs           = payload.timestamp;
  lastUpdated.textContent = formatTimeAgo(lastPageTs);
}

// ─── Form detection rendering ─────────────────────────────────────────────────
function renderFormDetection(form: { detected: boolean; platform: string; fieldsCount: number; detectedFields: string[] } | null): void {
  if (!form) {
    formDetectBanner.className = "form-detect-banner not-detected";
    formDetectStatus.textContent = "Unavailable";
    formDetectDesc.textContent = "Could not scan this page.";
    platformTag.classList.add("hidden");
    return;
  }

  if (form.detected) {
    formDetectBanner.className = "form-detect-banner detected";
    (formDetectIcon as unknown as Element).innerHTML = `<path d="M20 6 9 17l-5-5"/>`;
    formDetectIcon.setAttribute("stroke", "#10b981");
    formDetectStatus.textContent = `Form Detected — ${form.fieldsCount} field${form.fieldsCount !== 1 ? "s" : ""}`;
    formDetectDesc.textContent = form.detectedFields.length > 0
      ? truncate(form.detectedFields.join(", "), 60)
      : "Application fields ready to fill";

    if (form.platform && form.platform !== "None") {
      platformTag.textContent = form.platform;
      platformTag.classList.remove("hidden");
    } else {
      platformTag.classList.add("hidden");
    }
  } else {
    formDetectBanner.className = "form-detect-banner not-detected";
    (formDetectIcon as unknown as Element).innerHTML = `<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>`;
    formDetectIcon.setAttribute("stroke", "#94a3b8");
    formDetectStatus.textContent = "No Application Form";
    formDetectDesc.textContent = "Navigate to a job application page to autofill.";
    platformTag.classList.add("hidden");
  }
}

// ─── Autofill Review Interface rendering ──────────────────────────────────────
const STATUS_LABELS: Record<FieldReviewItem["status"], string> = {
  filled: "Filled",
  skipped: "Skipped",
  failed: "Failed",
  manual_attention: "Manual",
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderAutofillResult(result: AutofillExecutionResult | null | undefined): void {
  if (!result) return;
  lastAutofillResult = result;

  autofillResult.style.display = "block";
  autofillResult.className = `autofill-result ${result.success ? "success" : "empty"}`;

  const iconEl = document.getElementById("autofill-result-icon") as unknown as Element | null;
  if (iconEl) {
    iconEl.innerHTML = result.success
      ? `<path d="M20 6 9 17l-5-5"/>`
      : `<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>`;
  }

  autofillResultMsg.textContent = result.message;

  const summary = result.summary ?? {
    detectedFields: result.totalFieldsFound,
    filledFields: result.filledCount,
    skippedFields: 0,
    failedFields: 0,
    manualAttentionFields: 0,
  };

  statDetected.textContent = String(summary.detectedFields);
  statFilled.textContent = String(summary.filledFields);
  statSkipped.textContent = String(summary.skippedFields);
  statFailed.textContent = String(summary.failedFields);

  const manualCount = summary.manualAttentionFields ?? 0;
  if (manualCount > 0) {
    manualBanner.classList.remove("hidden");
    manualBannerText.textContent = `${manualCount} field${manualCount !== 1 ? "s" : ""} require manual attention`;
  } else {
    manualBanner.classList.add("hidden");
  }

  undoBtn.disabled = !result.canUndo;

  const fields = result.fields ?? [];
  if (fields.length === 0) {
    reviewList.innerHTML = "";
    return;
  }

  reviewList.innerHTML = fields
    .map((f) => {
      const subText =
        f.status === "filled" && f.valueFilled
          ? truncate(f.valueFilled, 38)
          : f.reason;
      const needsManual = f.status !== "filled";
      const defaultVal = escapeHtml(f.suggestedValue ?? "");
      return `
        <div class="review-item" data-field-id="${escapeHtml(f.fieldId)}">
          <div class="review-item-top">
            <span class="review-item-name">${escapeHtml(f.fieldName)}</span>
            <span class="review-badge ${f.status}">${STATUS_LABELS[f.status]}</span>
          </div>
          <div class="review-item-sub">${escapeHtml(subText)}</div>
          ${
            needsManual
              ? `<div class="review-manual-row">
                   <input class="review-manual-input" type="text" value="${defaultVal}" placeholder="Enter value…" />
                   <button class="review-manual-btn" type="button" data-fill-id="${escapeHtml(f.fieldId)}">Fill</button>
                 </div>`
              : ""
          }
        </div>
      `;
    })
    .join("");
}

// ─── Main data fetch ──────────────────────────────────────────────────────────
async function loadAll(): Promise<void> {
  if (isLoading) return;
  isLoading = true;

  setStatus("loading", "Loading…");
  refreshBtn.classList.add("spinning");
  hideError();

  // 1. Health ping
  try {
    const pong = await ext.runtime.sendMessage({ type: "PING" }) as PongMessage;
    if (pong?.type === "PONG") {
      versionBadge.textContent = `v${pong.payload?.version ?? "1.0.0"}`;
    }
  } catch {
    showError("Cannot connect to the ApplyMate background service worker. Try reloading Safari.");
    isLoading = false;
    refreshBtn.classList.remove("spinning");
    return;
  }

  // 2. Load profile from storage in parallel with page info
  const [profileRes, pageRes] = await Promise.allSettled([
    ext.runtime.sendMessage({ type: "GET_PROFILE" }) as Promise<GetProfileResMessage>,
    ext.runtime.sendMessage({ type: "PAGE_INFO_REQ" }) as Promise<PageInfoResMessage>,
  ]);

  // Render profile
  if (profileRes.status === "fulfilled" && profileRes.value?.type === "GET_PROFILE_RES" && profileRes.value.payload) {
    loadedProfile = profileRes.value.payload;
    renderProfile(profileRes.value.payload);
  } else {
    profileName.textContent = "Profile not found";
    profileJobTitle.textContent = "Open the dashboard to set up your profile";
    completionPct.textContent = "0%";
    completionBar.style.width = "0%";
  }

  // Render page info and form detection
  if (pageRes.status === "fulfilled" && pageRes.value?.type === "PAGE_INFO_RES" && pageRes.value.payload) {
    const payload = pageRes.value.payload;
    renderPageInfo(payload);
    renderFormDetection(payload.formDetection);
  } else {
    renderPageInfo(null);
    renderFormDetection(null);
  }

  setStatus("active", "Ready");
  refreshBtn.classList.remove("spinning");
  isLoading = false;
}

// ─── Autofill handler ─────────────────────────────────────────────────────────
async function triggerAutofill(): Promise<void> {
  if (isAutofilling) return;
  isAutofilling = true;

  autofillBtn.disabled = true;
  autofillBtn.classList.add("filling");
  autofillBtnText.textContent = "Autofilling…";
  autofillBtnSub.textContent  = "Please wait";

  try {
    const res = await ext.runtime.sendMessage({ type: "TRIGGER_AUTOFILL" }) as AutofillResMessage;

    if (res?.type === "AUTOFILL_RES" && res.payload) {
      const { success, filledCount, duplicatePrevented, message } = res.payload;

      autofillBtn.classList.remove("filling");
      if (success) autofillBtn.classList.add("filled");

      if (duplicatePrevented) {
        autofillBtnText.textContent = "Already Filled";
        autofillBtnSub.textContent  = "Undo or rerun below";
      } else if (success) {
        autofillBtnText.textContent = `✓ Filled (${filledCount})`;
        autofillBtnSub.textContent  = "Review below";
      } else {
        autofillBtnText.textContent = "No Fields Filled";
        autofillBtnSub.textContent  = truncate(message, 28);
      }

      renderAutofillResult(res.payload);
    }
  } catch {
    autofillBtn.classList.remove("filling");
    autofillBtnText.textContent = "Error";
    autofillBtnSub.textContent  = "Could not reach page";
  } finally {
    isAutofilling = false;
    setTimeout(() => {
      autofillBtn.disabled = false;
      autofillBtn.classList.remove("filling", "filled");
      autofillBtnText.textContent = "Autofill Page";
      autofillBtnSub.textContent  = "Fill detected fields";
    }, 3500);
  }
}

async function handleUndo(): Promise<void> {
  undoBtn.disabled = true;
  try {
    const res = await ext.runtime.sendMessage({ type: "UNDO_AUTOFILL" }) as UndoAutofillResMessage;
    if (res?.type === "UNDO_AUTOFILL_RES" && res.payload) {
      autofillResultMsg.textContent = res.payload.message;
      if (res.payload.success && lastAutofillResult) {
        lastAutofillResult.canUndo = false;
        lastAutofillResult.success = false;
        lastAutofillResult.filledCount = 0;
        lastAutofillResult.summary = {
          ...lastAutofillResult.summary,
          filledFields: 0,
        };
        if (lastAutofillResult.fields) {
          lastAutofillResult.fields = lastAutofillResult.fields.map((f) =>
            f.status === "filled"
              ? { ...f, status: "skipped", reason: "Undone by user", valueFilled: undefined }
              : f
          );
        }
        renderAutofillResult(lastAutofillResult);
        autofillResultMsg.textContent = res.payload.message;
      }
    }
  } catch {
    autofillResultMsg.textContent = "Failed to undo autofill.";
  }
}

async function handleRerunDetection(): Promise<void> {
  rerunBtn.disabled = true;
  try {
    const res = await ext.runtime.sendMessage({ type: "RERUN_DETECTION" }) as PageInfoResMessage;
    if (res?.type === "PAGE_INFO_RES" && res.payload) {
      renderPageInfo(res.payload);
      renderFormDetection(res.payload.formDetection);
      autofillResultMsg.textContent = `Detection refreshed: ${res.payload.formDetection.fieldsCount} field(s) found.`;
    }
  } catch {
    autofillResultMsg.textContent = "Could not rerun detection.";
  } finally {
    rerunBtn.disabled = false;
  }
}

async function handleManualFieldFill(fieldId: string, customValue: string): Promise<void> {
  try {
    const res = await ext.runtime.sendMessage({
      type: "FILL_SINGLE_FIELD",
      payload: { fieldId, customValue },
    }) as FillSingleFieldResMessage;

    if (res?.type === "FILL_SINGLE_FIELD_RES" && res.payload) {
      if (res.payload.success && res.payload.field && lastAutofillResult) {
        const updated = res.payload.field;
        lastAutofillResult.canUndo = true;
        lastAutofillResult.success = true;
        if (lastAutofillResult.fields) {
          lastAutofillResult.fields = lastAutofillResult.fields.map((f) =>
            f.fieldId === fieldId ? updated : f
          );
          const filled = lastAutofillResult.fields.filter((f) => f.status === "filled").length;
          const skipped = lastAutofillResult.fields.filter((f) => f.status === "skipped").length;
          const failed = lastAutofillResult.fields.filter((f) => f.status === "failed").length;
          const manual = lastAutofillResult.fields.filter((f) => f.status === "manual_attention").length;
          lastAutofillResult.filledCount = filled;
          lastAutofillResult.summary = {
            detectedFields: lastAutofillResult.fields.length,
            filledFields: filled,
            skippedFields: skipped + manual,
            failedFields: failed,
            manualAttentionFields: manual,
          };
        }
        renderAutofillResult(lastAutofillResult);
      } else {
        autofillResultMsg.textContent = res.payload.message;
      }
    }
  } catch {
    autofillResultMsg.textContent = "Failed to fill field manually.";
  }
}

// ─── Live timestamp ticker ────────────────────────────────────────────────────
setInterval(() => {
  if (lastPageTs > 0) {
    lastUpdated.textContent = formatTimeAgo(lastPageTs);
  }
}, 10_000);

// ─── Job Description Analyzer handlers ───────────────────────────────────────
let currentJobAnalysis: JobAnalysisResult | null = null;
const JOB_ANALYSIS_KEY = "applymate_last_job_analysis";

function renderJobAnalysis(job: JobAnalysisResult): void {
  currentJobAnalysis = job;
  jobFieldsWrap.classList.remove("hidden");
  jobTitleInput.value = job.jobTitle ?? "";
  jobCompanyInput.value = job.companyName ?? "";
  jobLocationInput.value = job.location ?? "";
  jobTypeInput.value = job.employmentType ?? "";
  jobExpInput.value = job.experienceRequired ?? "";
  jobReqSkillsIn.value = (job.requiredSkills ?? []).join(", ");
  jobPrefSkillsIn.value = (job.preferredSkills ?? []).join(", ");
  jobDescInput.value = job.jobDescription ?? "";
  jobSaveStatus.textContent = job.usedManualSelection ? "Extracted from selection" : "";
}

async function runJobAnalysis(useSelection: boolean): Promise<void> {
  analyzeJobBtn.disabled = true;
  analyzeSelBtn.disabled = true;
  jobSaveStatus.textContent = "Analyzing…";

  try {
    const res = (await ext.runtime.sendMessage({
      type: "ANALYZE_JOB",
      payload: { useSelection },
    })) as AnalyzeJobResMessage;

    if (res?.type === "ANALYZE_JOB_RES" && res.payload) {
      renderJobAnalysis(res.payload);
    }
  } catch {
    jobFieldsWrap.classList.remove("hidden");
    jobSaveStatus.textContent = "Could not scan page — edit manually below.";
  } finally {
    analyzeJobBtn.disabled = false;
    analyzeSelBtn.disabled = false;
  }
}

async function saveEditedJobAnalysis(): Promise<void> {
  const splitSkills = (raw: string) =>
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  const updated: JobAnalysisResult = {
    companyName: jobCompanyInput.value.trim(),
    jobTitle: jobTitleInput.value.trim(),
    jobDescription: jobDescInput.value.trim(),
    requiredSkills: splitSkills(jobReqSkillsIn.value),
    preferredSkills: splitSkills(jobPrefSkillsIn.value),
    experienceRequired: jobExpInput.value.trim(),
    location: jobLocationInput.value.trim(),
    employmentType: jobTypeInput.value.trim(),
    platform: currentJobAnalysis?.platform ?? "Generic Application",
    sourceUrl: currentJobAnalysis?.sourceUrl ?? "",
    extractedAt: new Date().toISOString(),
    usedManualSelection: currentJobAnalysis?.usedManualSelection,
  };

  currentJobAnalysis = updated;
  try {
    await ext.storage.local.set({ [JOB_ANALYSIS_KEY]: updated });
    jobSaveStatus.textContent = "Saved!";
    setTimeout(() => {
      if (jobSaveStatus.textContent === "Saved!") jobSaveStatus.textContent = "";
    }, 2500);
  } catch {
    jobSaveStatus.textContent = "Updated in memory";
  }
}

// ─── AI Answer Generator handlers ─────────────────────────────────────────────
const AI_API_ENDPOINT = "http://localhost:3000/api/ai/answer";

function getSelectedQuestion(): string {
  if (aiQuestionSelect.value === "__custom__") {
    return aiCustomInput.value.trim();
  }
  return aiQuestionSelect.value;
}

async function handleGenerateAiAnswer(): Promise<void> {
  const question = getSelectedQuestion();
  if (!question) {
    aiStatusMsg.textContent = "Enter a question first.";
    return;
  }
  if (!loadedProfile) {
    aiStatusMsg.textContent = "Profile not loaded yet.";
    return;
  }

  aiGenerateBtn.disabled = true;
  aiStatusMsg.textContent = "Generating…";

  try {
    const res = await fetch(AI_API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        profile: loadedProfile,
        jobContext: currentJobAnalysis ?? undefined,
      }),
    });

    const data = (await res.json()) as { answer?: string; error?: string };
    if (!res.ok || !data.answer) {
      aiStatusMsg.textContent = truncate(
        data.error ?? "AI unavailable — write/edit manually.",
        45
      );
      return;
    }

    aiAnswerTextarea.value = data.answer;
    aiStatusMsg.textContent = "Ready to review";
  } catch {
    aiStatusMsg.textContent = "Dashboard API offline — edit manually.";
  } finally {
    aiGenerateBtn.disabled = false;
  }
}

async function handleCopyAiAnswer(): Promise<void> {
  const text = aiAnswerTextarea.value.trim();
  if (!text) {
    aiStatusMsg.textContent = "Nothing to copy.";
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    aiStatusMsg.textContent = "Copied!";
    setTimeout(() => {
      if (aiStatusMsg.textContent === "Copied!") aiStatusMsg.textContent = "";
    }, 2000);
  } catch {
    aiStatusMsg.textContent = "Copy failed.";
  }
}

async function handleInsertAiAnswer(): Promise<void> {
  const text = aiAnswerTextarea.value.trim();
  if (!text) {
    aiStatusMsg.textContent = "Write or generate an answer first.";
    return;
  }
  try {
    const res = (await ext.runtime.sendMessage({
      type: "INSERT_ANSWER",
      payload: { answer: text },
    })) as InsertAnswerResMessage;
    aiStatusMsg.textContent = res?.payload?.message ?? "Insert failed.";
  } catch {
    aiStatusMsg.textContent = "Could not reach page.";
  }
}

// ─── Cover Letter & Application Email Generator ──────────────────────────────
let coverLetterVariant = 0;

function generateCoverLetterDraft(regenerate: boolean): void {
  if (!loadedProfile) {
    clStatusMsg.textContent = "Profile not loaded yet.";
    return;
  }

  if (regenerate) {
    coverLetterVariant++;
  } else {
    coverLetterVariant = 0;
  }

  const format = clFormatSelect.value as CoverLetterFormat;
  const result = generateLocalCoverLetter({
    format,
    profile: loadedProfile,
    jobContext: currentJobAnalysis ?? undefined,
    variant: coverLetterVariant,
  });

  clTextarea.value = result.content;
  clStatusMsg.textContent = regenerate ? "Regenerated" : "Generated";
}

async function handleCopyCoverLetter(): Promise<void> {
  const text = clTextarea.value.trim();
  if (!text) {
    clStatusMsg.textContent = "Nothing to copy.";
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    clStatusMsg.textContent = "Copied!";
    setTimeout(() => {
      if (clStatusMsg.textContent === "Copied!") clStatusMsg.textContent = "";
    }, 2000);
  } catch {
    clStatusMsg.textContent = "Copy failed.";
  }
}

async function handleInsertCoverLetter(): Promise<void> {
  const text = clTextarea.value.trim();
  if (!text) {
    clStatusMsg.textContent = "Generate or write text first.";
    return;
  }
  try {
    const res = (await ext.runtime.sendMessage({
      type: "INSERT_ANSWER",
      payload: { answer: text },
    })) as InsertAnswerResMessage;
    clStatusMsg.textContent = res?.payload?.message ?? "Insert failed.";
  } catch {
    clStatusMsg.textContent = "Could not reach page.";
  }
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  loadAll();
  refreshBtn.addEventListener("click", loadAll);
  retryBtn.addEventListener("click",   loadAll);
  autofillBtn.addEventListener("click", triggerAutofill);
  undoBtn.addEventListener("click", handleUndo);
  rerunBtn.addEventListener("click", handleRerunDetection);
  analyzeJobBtn.addEventListener("click", () => runJobAnalysis(false));
  analyzeSelBtn.addEventListener("click", () => runJobAnalysis(true));
  jobSaveBtn.addEventListener("click", saveEditedJobAnalysis);
  aiQuestionSelect.addEventListener("change", () => {
    aiCustomWrap.classList.toggle("hidden", aiQuestionSelect.value !== "__custom__");
  });
  aiGenerateBtn.addEventListener("click", handleGenerateAiAnswer);
  aiCopyBtn.addEventListener("click", handleCopyAiAnswer);
  aiInsertBtn.addEventListener("click", handleInsertAiAnswer);
  clGenerateBtn.addEventListener("click", () => generateCoverLetterDraft(false));
  clRegenerateBtn.addEventListener("click", () => generateCoverLetterDraft(true));
  clCopyBtn.addEventListener("click", handleCopyCoverLetter);
  clInsertBtn.addEventListener("click", handleInsertCoverLetter);
  reviewList.addEventListener("click", (e) => {
    const target = e.target as HTMLElement | null;
    const btn = target?.closest?.<HTMLButtonElement>("[data-fill-id]");
    if (!btn) return;
    const fieldId = btn.dataset.fillId;
    if (!fieldId) return;
    const row = btn.closest(".review-item");
    const input = row?.querySelector<HTMLInputElement>(".review-manual-input");
    const customValue = input?.value ?? "";
    handleManualFieldFill(fieldId, customValue);
  });
});
