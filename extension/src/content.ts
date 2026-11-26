/**
 * ApplyMate — Content Script
 *
 * Runs on supported job application websites and pages.
 * Features:
 *  - Shadow DOM isolation (zero conflicts with host webpage CSS)
 *  - Floating trigger button at bottom-right corner
 *  - Hover interactions, smooth animations, and responsive layout
 *  - In-page ApplyMate card showing active URL, title, and Form Detection status
 *  - Form detection engine identifying ATS platforms and candidate input fields
 *  - Dynamic SPA support via MutationObserver & navigation listeners
 *  - User hide/minimize toggle with session persistence
 *  - Idempotent root injection preventing duplicates
 */

import { detectApplicationForm, isSupportedJobSite } from "./detector";
import type {
  PageInfoMessage,
  PageInfoPayload,
  AnyMessage,
  FormDetectionResult,
  GetProfileResMessage,
  AutofillResMessage,
  AutofillExecutionResult,
  UndoAutofillResMessage,
  FillSingleFieldResMessage,
  FillSingleFieldPayload,
  AnalyzeJobPayload,
  AnalyzeJobResMessage,
  InsertAnswerPayload,
  InsertAnswerResMessage,
} from "./types";
import { analyzeJobPage, analyzeSelectedText } from "../analyzer/jobAnalyzer";
import {
  setNativeValue,
  dispatchInputEvents,
  highlightField,
} from "../autofill/autofillEngine";
import {
  executeAutofill,
  undoLastAutofill,
  fillSingleField,
  resetAutofillState,
} from "../autofill/autofillEngine";
import type { CandidateProfile } from "../../src/types/profile";
import { DEFAULT_PROFILE } from "../../src/lib/profile/defaultProfile";

// ─── Namespace shim ──────────────────────────────────────────────────────────
const ext = (typeof browser !== "undefined" ? browser : chrome) as typeof chrome;

const HOST_ID = "applymate-extension-root";
const SESSION_HIDE_KEY = "applymate_btn_hidden";

let shadowRoot: ShadowRoot | null = null;
let isCardOpen = false;
let isButtonHidden = false;
let currentFormDetection: FormDetectionResult = detectApplicationForm();

/**
 * Returns latest page info snapshot
 */
function getPageSnapshot(): PageInfoPayload {
  currentFormDetection = detectApplicationForm();
  return {
    title: document.title || "(Untitled Page)",
    url: location.href,
    host: location.hostname,
    timestamp: Date.now(),
    formDetection: currentFormDetection,
  };
}

/**
 * Reports page details to background service worker
 */
function reportToBackground(): void {
  const info = getPageSnapshot();
  console.log(
    `[ApplyMate] Page detected: "${info.title}" (${info.host}) — Form detected: ${info.formDetection.detected} (${info.formDetection.platform})`
  );

  const msg: PageInfoMessage = {
    type: "PAGE_INFO",
    payload: info,
  };

  try {
    ext.runtime.sendMessage(msg).catch(() => {});
  } catch {
    // Background not yet ready or context invalidated
  }
}

/**
 * Stylesheet for Shadow DOM (completely isolated from host website)
 */
const SHADOW_STYLES = `
:host {
  all: initial;
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 2147483647;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  color: #0f172a;
  -webkit-font-smoothing: antialiased;
  box-sizing: border-box;
}

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* ── Floating Trigger Button ────────────────────────────────────────── */
.applymate-trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #2563eb;
  color: #ffffff;
  border: none;
  border-radius: 9999px;
  padding: 10px 18px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.01em;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(37, 99, 235, 0.35), 0 2px 6px rgba(0, 0, 0, 0.08);
  transition: transform 0.18s cubic-bezier(0.16, 1, 0.3, 1),
              box-shadow 0.18s cubic-bezier(0.16, 1, 0.3, 1),
              background 0.15s ease;
  user-select: none;
  outline: none;
}

.applymate-trigger:hover {
  transform: translateY(-2px);
  background: #1d4ed8;
  box-shadow: 0 8px 24px rgba(37, 99, 235, 0.45), 0 3px 8px rgba(0, 0, 0, 0.12);
}

.applymate-trigger:active {
  transform: translateY(0) scale(0.97);
}

.trigger-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
}

.trigger-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #10b981;
  color: #ffffff;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 9999px;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.badge-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #ffffff;
}

/* ── In-Page Card / Overlay ─────────────────────────────────────────── */
.applymate-card {
  position: absolute;
  bottom: calc(100% + 12px);
  right: 0;
  width: 340px;
  max-width: calc(100vw - 32px);
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  box-shadow: 0 16px 40px -10px rgba(15, 23, 42, 0.18),
              0 6px 16px -4px rgba(15, 23, 42, 0.08);
  overflow: hidden;
  opacity: 0;
  transform: translateY(10px) scale(0.98);
  pointer-events: none;
  transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.applymate-card.open {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}

/* Header */
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 8px;
}

.brand-icon-box {
  width: 26px;
  height: 26px;
  border-radius: 7px;
  background: #2563eb;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-title {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #0f172a;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.icon-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 5px;
  border-radius: 6px;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s;
}

.icon-btn:hover {
  background: #e2e8f0;
  color: #0f172a;
}

/* Body */
.card-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Section cards */
.info-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px;
}

.info-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
  margin-bottom: 4px;
}

.page-title-text {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.page-url-text {
  font-size: 11px;
  color: #64748b;
  margin-top: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

/* Detection status banner */
.detection-banner {
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detection-banner.detected {
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
}

.detection-banner.not-detected {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.banner-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.banner-status-text {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
}

.detection-banner.detected .banner-status-text {
  color: #065f46;
}

.detection-banner.not-detected .banner-status-text {
  color: #475569;
}

.platform-pill {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 9999px;
  background: #2563eb;
  color: #fff;
}

.detection-desc {
  font-size: 11px;
  color: #475569;
  line-height: 1.4;
}

.fields-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 2px;
}

.field-chip {
  font-size: 10px;
  font-weight: 600;
  padding: 3px 7px;
  border-radius: 6px;
  background: #ffffff;
  border: 1px solid #d1fae5;
  color: #047857;
}

/* Card footer */
.card-footer {
  padding: 12px 16px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.btn-autofill {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 9px 14px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  border: none;
  background: #2563eb;
  color: #ffffff;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.1s ease;
}

.btn-autofill:hover {
  background: #1d4ed8;
}

.btn-autofill:active {
  transform: scale(0.97);
}

.btn-autofill.success {
  background: #059669;
}

.btn-autofill:disabled {
  background: #94a3b8;
  cursor: not-allowed;
  opacity: 0.85;
}

.autofill-feedback {
  margin-top: 10px;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 11px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  animation: fadeIn 0.2s ease-out;
}

.autofill-feedback.success {
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  color: #065f46;
}

.autofill-feedback.empty {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #475569;
}

.autofill-summary-header {
  display: flex;
  align-items: center;
  gap: 5px;
  font-weight: 700;
}

.autofill-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 2px;
}

.autofill-chip {
  font-size: 10px;
  font-weight: 600;
  background: #ffffff;
  border: 1px solid #6ee7b7;
  color: #047857;
  padding: 2px 6px;
  border-radius: 4px;
}

.btn-dashboard {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 9px 12px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  background: #ffffff;
  color: #2563eb;
  border: 1px solid #cbd5e1;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.btn-dashboard:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
}

/* Minimized Restore Pill (shown if hidden) */
.restore-pill {
  display: none;
  background: #0f172a;
  color: #ffffff;
  padding: 6px 10px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

.restore-pill:hover {
  background: #1e293b;
}

/* Responsive adjustments */
@media (max-width: 480px) {
  :host {
    bottom: 16px;
    right: 16px;
  }
  .applymate-card {
    right: -4px;
    width: calc(100vw - 24px);
  }
}
`;

/**
 * Builds and renders the ApplyMate Shadow DOM content
 */
function renderUI(): void {
  if (!shadowRoot) return;

  const info = getPageSnapshot();
  const form = info.formDetection;

  shadowRoot.innerHTML = `
    <style>${SHADOW_STYLES}</style>

    <!-- Floating Trigger Button -->
    <div id="trigger-container" style="${isButtonHidden ? "display: none;" : "display: block;"}">
      <button class="applymate-trigger" id="btn-trigger" aria-label="Open ApplyMate">
        <span class="trigger-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="20" height="14" x="2" y="6" rx="2"/>
            <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
          </svg>
        </span>
        <span>ApplyMate</span>
        ${
          form.detected
            ? `<span class="trigger-badge"><span class="badge-dot"></span> Form</span>`
            : ""
        }
      </button>

      <!-- In-Page Card (Popover) -->
      <div class="applymate-card ${isCardOpen ? "open" : ""}" id="applymate-card" role="dialog" aria-modal="true" aria-label="ApplyMate Assistant">
        <!-- Header -->
        <div class="card-header">
          <div class="header-brand">
            <div class="brand-icon-box">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <rect width="20" height="14" x="2" y="6" rx="2"/>
                <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
              </svg>
            </div>
            <span class="brand-title">ApplyMate</span>
          </div>
          <div class="header-actions">
            <button class="icon-btn" id="btn-hide" title="Hide floating button for this session" aria-label="Hide button">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            </button>
            <button class="icon-btn" id="btn-close" title="Close" aria-label="Close card">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Body -->
        <div class="card-body">
          <!-- Page Info -->
          <div class="info-box">
            <div class="info-label">Current Page</div>
            <div class="page-title-text" title="${info.title}">${info.title}</div>
            <div class="page-url-text" title="${info.url}">${info.url}</div>
          </div>

          <!-- Form Detection Status -->
          <div class="detection-banner ${form.detected ? "detected" : "not-detected"}">
            <div class="banner-title-row">
              <div class="banner-status-text">
                ${
                  form.detected
                    ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                       <span>Application Form Detected</span>`
                    : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                       <span>No Form Detected</span>`
                }
              </div>
              ${
                form.platform !== "None"
                  ? `<span class="platform-pill">${form.platform}</span>`
                  : ""
              }
            </div>

            <div class="detection-desc">
              ${
                form.detected
                  ? `Identified ${form.fieldsCount} form input(s) matching candidate profile fields.`
                  : `Navigate to an online job application or posting form to autofill.`
              }
            </div>

            ${
              form.detected && form.detectedFields.length > 0
                ? `<div class="fields-chip-list">
                    ${form.detectedFields.map((f) => `<span class="field-chip">${f}</span>`).join("")}
                  </div>`
                : ""
            }
          </div>

          <!-- Autofill Feedback Slot -->
          <div id="autofill-feedback"></div>
        </div>

        <!-- Footer -->
        <div class="card-footer">
          <button class="btn-autofill" id="btn-autofill" title="Autofill form with ApplyMate profile">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
            </svg>
            <span id="btn-autofill-text">Autofill Form</span>
          </button>
          <a href="http://localhost:3000/profile" target="_blank" rel="noreferrer" class="btn-dashboard" title="Open ApplyMate Candidate Profile">
            <span>Profile</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </a>
        </div>
      </div>
    </div>

    <!-- Hidden Restore Pill -->
    <div id="btn-restore" class="restore-pill" style="${isButtonHidden ? "display: flex;" : "display: none;"}">
      <span>ApplyMate</span>
    </div>
  `;

  attachEventHandlers();
}

/**
 * Displays visual result banner in the card
 */
function displayAutofillFeedback(result: AutofillExecutionResult): void {
  if (!shadowRoot) return;
  const feedbackContainer = shadowRoot.getElementById("autofill-feedback");
  const btnAutofill = shadowRoot.getElementById("btn-autofill");

  if (btnAutofill) {
    if (result.success) {
      btnAutofill.classList.add("success");
      btnAutofill.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 6 9 17l-5-5"/>
        </svg>
        <span>Autofilled (${result.filledCount})</span>
      `;
    } else {
      btnAutofill.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span>No Fields Found</span>
      `;
    }
  }

  if (feedbackContainer) {
    if (result.success) {
      feedbackContainer.className = "autofill-feedback success";
      feedbackContainer.innerHTML = `
        <div class="autofill-summary-header">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 6 9 17l-5-5"/>
          </svg>
          <span>${result.message}</span>
        </div>
        <div class="autofill-chips">
          ${result.filledFields
            .map(
              (f) =>
                `<span class="autofill-chip">${f.fieldName}: ${
                  f.valueFilled.length > 20 ? f.valueFilled.slice(0, 18) + "…" : f.valueFilled
                }</span>`
            )
            .join("")}
        </div>
      `;
    } else {
      feedbackContainer.className = "autofill-feedback empty";
      feedbackContainer.innerHTML = `
        <div class="autofill-summary-header">
          <span>${result.message}</span>
        </div>
      `;
    }
  }
}

/**
 * Triggers full autofill against candidate profile
 */
async function triggerAutofill(): Promise<AutofillExecutionResult> {
  let profile: CandidateProfile | null = null;
  try {
    const res = (await ext.runtime.sendMessage({ type: "GET_PROFILE" })) as GetProfileResMessage;
    if (res?.type === "GET_PROFILE_RES" && res.payload) {
      profile = res.payload;
    }
  } catch {}

  const profileToUse: CandidateProfile = profile ?? DEFAULT_PROFILE;
  const result = executeAutofill(profileToUse);
  displayAutofillFeedback(result);
  return result;
}

/**
 * Attaches interactive listeners to Shadow DOM elements
 */
function attachEventHandlers(): void {
  if (!shadowRoot) return;

  const btnTrigger = shadowRoot.getElementById("btn-trigger");
  const btnClose = shadowRoot.getElementById("btn-close");
  const btnHide = shadowRoot.getElementById("btn-hide");
  const btnRestore = shadowRoot.getElementById("btn-restore");
  const btnAutofill = shadowRoot.getElementById("btn-autofill");
  const card = shadowRoot.getElementById("applymate-card");

  btnTrigger?.addEventListener("click", (e) => {
    e.stopPropagation();
    isCardOpen = !isCardOpen;
    if (isCardOpen) {
      card?.classList.add("open");
      reportToBackground();
    } else {
      card?.classList.remove("open");
    }
  });

  btnAutofill?.addEventListener("click", async (e) => {
    e.stopPropagation();
    const btnText = shadowRoot?.getElementById("btn-autofill-text");
    if (btnText) btnText.textContent = "Autofilling…";
    await triggerAutofill();
  });

  btnClose?.addEventListener("click", (e) => {
    e.stopPropagation();
    isCardOpen = false;
    card?.classList.remove("open");
  });

  btnHide?.addEventListener("click", (e) => {
    e.stopPropagation();
    isButtonHidden = true;
    isCardOpen = false;
    try {
      sessionStorage.setItem(SESSION_HIDE_KEY, "true");
    } catch {}
    renderUI();
  });

  btnRestore?.addEventListener("click", (e) => {
    e.stopPropagation();
    isButtonHidden = false;
    try {
      sessionStorage.removeItem(SESSION_HIDE_KEY);
    } catch {}
    renderUI();
  });

  // Close card when clicking outside inside window
  window.addEventListener(
    "click",
    (e) => {
      if (!isCardOpen) return;
      const path = e.composedPath();
      const host = document.getElementById(HOST_ID);
      if (host && !path.includes(host)) {
        isCardOpen = false;
        card?.classList.remove("open");
      }
    },
    { capture: true }
  );
}

/**
 * Injects or updates the ApplyMate isolated host in the page DOM
 */
function initApplyMate(): void {
  // Check if current site is supported (job site, detected form, or local test server)
  const isSupported = isSupportedJobSite();
  if (!isSupported) {
    // If not supported, do not clutter page
    return;
  }

  // Check session hide state
  try {
    isButtonHidden = sessionStorage.getItem(SESSION_HIDE_KEY) === "true";
  } catch {
    isButtonHidden = false;
  }

  // Prevent duplicate injection
  let host = document.getElementById(HOST_ID);
  if (!host) {
    host = document.createElement("div");
    host.id = HOST_ID;
    shadowRoot = host.attachShadow({ mode: "open" });
    document.documentElement.appendChild(host);
  } else if (!shadowRoot && host.shadowRoot) {
    shadowRoot = host.shadowRoot;
  }

  renderUI();
  reportToBackground();
}

// ─── Lifecycle & Dynamic SPA Monitoring ───────────────────────────────────────
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApplyMate);
} else {
  initApplyMate();
}

// Monitor dynamic SPA route changes, multi-step wizard transitions, and DOM mutations
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
function handleDomChange(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const prevDetected = currentFormDetection.detected;
    const prevFieldsCount = currentFormDetection.fieldsCount;
    const prevTypesSig = currentFormDetection.classifiedTypes.join(",");

    currentFormDetection = detectApplicationForm();
    const nextTypesSig = currentFormDetection.classifiedTypes.join(",");

    const stepOrFormChanged =
      prevDetected !== currentFormDetection.detected ||
      prevFieldsCount !== currentFormDetection.fieldsCount ||
      prevTypesSig !== nextTypesSig;

    if (stepOrFormChanged) {
      resetAutofillState();
    }

    if (stepOrFormChanged || !document.getElementById(HOST_ID)) {
      initApplyMate();
    }
  }, 350);
}

// Detect clicks on multi-step "Next" / "Continue" / "Review" buttons and rescan
document.addEventListener(
  "click",
  (e) => {
    const target = e.target as HTMLElement | null;
    const btn = target?.closest?.("button, [role='button'], input[type='button']");
    if (!btn || btn.closest("#applymate-extension-root")) return;
    const label = (
      btn.textContent ||
      btn.getAttribute("aria-label") ||
      (btn as HTMLInputElement).value ||
      ""
    )
      .toLowerCase()
      .trim();
    if (/\b(next|continue|save\s*and\s*continue|proceed|review)\b/.test(label)) {
      setTimeout(handleDomChange, 450);
    }
  },
  { capture: true }
);

window.addEventListener("popstate", handleDomChange);
window.addEventListener("hashchange", handleDomChange);

const observer = new MutationObserver(handleDomChange);
observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
});

// ─── WebExtension Message Listener (Toolbar Popup queries) ────────────────────
ext.runtime.onMessage.addListener(
  (message: AnyMessage, _sender, sendResponse) => {
    if (message.type === "PAGE_INFO_REQ") {
      sendResponse({ type: "PAGE_INFO_RES", payload: getPageSnapshot() });
      return false;
    }

    if (message.type === "INSERT_ANSWER") {
      const payload = message.payload as InsertAnswerPayload | undefined;
      const text = payload?.answer?.trim() ?? "";
      if (!text) {
        sendResponse({
          type: "INSERT_ANSWER_RES",
          payload: { success: false, message: "Answer text is empty." },
        } satisfies InsertAnswerResMessage);
        return false;
      }

      // Prefer currently focused textarea, otherwise first visible textarea outside ApplyMate
      const active = document.activeElement;
      const target =
        active &&
        active.tagName === "TEXTAREA" &&
        !active.closest("#applymate-extension-root")
          ? (active as HTMLTextAreaElement)
          : Array.from(document.querySelectorAll<HTMLTextAreaElement>("textarea")).find(
              (ta) => !ta.disabled && !ta.readOnly && !ta.closest("#applymate-extension-root")
            );

      if (!target) {
        sendResponse({
          type: "INSERT_ANSWER_RES",
          payload: {
            success: false,
            message: "No target textarea found on this page. Use Copy instead.",
          },
        } satisfies InsertAnswerResMessage);
        return false;
      }

      setNativeValue(target, text);
      dispatchInputEvents(target);
      highlightField(target, "success");

      sendResponse({
        type: "INSERT_ANSWER_RES",
        payload: { success: true, message: "Inserted answer into page textarea." },
      } satisfies InsertAnswerResMessage);
      return false;
    }

    if (message.type === "ANALYZE_JOB") {
      const payload = message.payload as AnalyzeJobPayload | undefined;
      const selectionText =
        payload?.manualText?.trim() ||
        (payload?.useSelection ? window.getSelection()?.toString().trim() ?? "" : "");

      const analysis = selectionText
        ? analyzeSelectedText(selectionText, {
            url: location.href,
            platform: currentFormDetection.platform,
          })
        : analyzeJobPage();

      const response: AnalyzeJobResMessage = {
        type: "ANALYZE_JOB_RES",
        payload: analysis,
      };
      sendResponse(response);
      return false;
    }

    if (message.type === "RERUN_DETECTION") {
      resetAutofillState();
      const snapshot = getPageSnapshot();
      reportToBackground();
      sendResponse({ type: "PAGE_INFO_RES", payload: snapshot });
      return false;
    }

    if (message.type === "UNDO_AUTOFILL") {
      const undoRes = undoLastAutofill();
      const response: UndoAutofillResMessage = {
        type: "UNDO_AUTOFILL_RES",
        payload: undoRes,
      };
      sendResponse(response);
      return false;
    }

    if (message.type === "FILL_SINGLE_FIELD") {
      const payload = message.payload as FillSingleFieldPayload | undefined;
      (async () => {
        let profile: CandidateProfile | null = null;
        try {
          const res = (await ext.runtime.sendMessage({ type: "GET_PROFILE" })) as GetProfileResMessage;
          if (res?.type === "GET_PROFILE_RES" && res.payload) profile = res.payload;
        } catch {}
        const result = payload
          ? fillSingleField(payload.fieldId, profile ?? DEFAULT_PROFILE, payload.customValue)
          : { success: false, message: "Missing fieldId." };
        const response: FillSingleFieldResMessage = {
          type: "FILL_SINGLE_FIELD_RES",
          payload: result,
        };
        sendResponse(response);
      })();
      return true;
    }

    if (message.type === "TRIGGER_AUTOFILL") {
      triggerAutofill().then((res) => {
        const response: AutofillResMessage = {
          type: "AUTOFILL_RES",
          payload: res,
        };
        sendResponse(response);
      });
      return true;
    }

    return false;
  }
);
