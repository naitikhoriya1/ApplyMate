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
} from "./types";
import type { CandidateProfile } from "../../src/types/profile";

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
const autofillChips    = $("autofill-chips");
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
let lastPageTs = 0;

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
  const { firstName, lastName, professionalTitle } = profile.personal;
  profileAvatar.textContent = initials(firstName, lastName);
  profileName.textContent   = `${firstName} ${lastName}`;
  profileJobTitle.textContent = truncate(professionalTitle, 60);

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

// ─── Autofill result rendering ────────────────────────────────────────────────
function renderAutofillResult(result: AutofillResMessage["payload"]): void {
  if (!result) return;

  autofillResult.style.display = "block";

  if (result.success) {
    autofillResult.className = "autofill-result success";
    (document.getElementById("autofill-result-icon") as unknown as Element).innerHTML = `<path d="M20 6 9 17l-5-5"/>`;
    autofillResultMsg.textContent = result.message;
    autofillChips.innerHTML = result.filledFields.map(
      (f) => `<span class="autofill-chip">${f.fieldName}</span>`
    ).join("");
  } else {
    autofillResult.className = "autofill-result empty";
    (document.getElementById("autofill-result-icon") as unknown as Element).innerHTML = `<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>`;
    autofillResultMsg.textContent = result.message;
    autofillChips.innerHTML = "";
  }
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
  autofillBtn.disabled = true;
  autofillBtn.classList.add("filling");
  autofillBtnText.textContent = "Autofilling…";
  autofillBtnSub.textContent  = "Please wait";
  // Hide any previous result
  autofillResult.style.display = "none";

  try {
    const res = await ext.runtime.sendMessage({ type: "TRIGGER_AUTOFILL" }) as AutofillResMessage;

    if (res?.type === "AUTOFILL_RES" && res.payload) {
      const { success, filledCount, message } = res.payload;

      autofillBtn.classList.remove("filling");
      autofillBtn.classList.add(success ? "filled" : "");

      if (success) {
        autofillBtnText.textContent = `✓ Filled (${filledCount})`;
        autofillBtnSub.textContent  = "Fields populated!";
      } else {
        autofillBtnText.textContent = "No Fields Found";
        autofillBtnSub.textContent  = message.slice(0, 30);
      }

      renderAutofillResult(res.payload);
    }
  } catch {
    autofillBtn.classList.remove("filling");
    autofillBtnText.textContent = "Error";
    autofillBtnSub.textContent  = "Could not reach page";
  } finally {
    // Reset button after 5s
    setTimeout(() => {
      autofillBtn.disabled = false;
      autofillBtn.classList.remove("filling", "filled");
      autofillBtnText.textContent = "Autofill Page";
      autofillBtnSub.textContent  = "Fill detected fields";
    }, 5000);
  }
}

// ─── Live timestamp ticker ────────────────────────────────────────────────────
setInterval(() => {
  if (lastPageTs > 0) {
    lastUpdated.textContent = formatTimeAgo(lastPageTs);
  }
}, 10_000);

// ─── Boot ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  loadAll();
  refreshBtn.addEventListener("click", loadAll);
  retryBtn.addEventListener("click",   loadAll);
  autofillBtn.addEventListener("click", triggerAutofill);
});
