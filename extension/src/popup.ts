/**
 * ApplyMate — Popup Script
 *
 * Runs inside extension/popup/popup.html when the user clicks
 * the browser toolbar action button.
 *
 * Responsibilities:
 *  1. Ping the background worker to confirm the extension is alive.
 *  2. Query the background for the active tab's page info.
 *  3. Display the detected URL & title in the popup UI.
 */

import type {
  PageInfoResMessage,
  PongMessage,
  AutofillResMessage,
} from "./types";

const ext = (typeof browser !== "undefined" ? browser : chrome) as typeof chrome;

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const statusDot = document.getElementById("status-dot")!;
const statusLabel = document.getElementById("status-label")!;
const versionLabel = document.getElementById("version")!;
const pageTitle = document.getElementById("page-title")!;
const pageUrl = document.getElementById("page-url")!;
const pageHost = document.getElementById("page-host")!;
const refreshBtn = document.getElementById("refresh-btn")!;
const autofillBtn = document.getElementById("autofill-btn")!;
const formStatusBadge = document.getElementById("form-status-badge")!;
const formPlatformTag = document.getElementById("form-platform-tag")!;
const formDetailsText = document.getElementById("form-details-text")!;
const autofillResultBanner = document.getElementById("autofill-result-banner");
const autofillResultTitle = document.getElementById("autofill-result-title");
const autofillResultFields = document.getElementById("autofill-result-fields");

function setStatus(state: "ready" | "loading" | "error", text: string): void {
  statusDot.className = `status-dot ${state}`;
  statusLabel.textContent = text;
}

function truncate(str: string, max: number): string {
  return str.length <= max ? str : str.slice(0, max - 1) + "…";
}

async function loadPageInfo(): Promise<void> {
  setStatus("loading", "Connecting…");

  // 1. Health check.
  try {
    const pong = await ext.runtime.sendMessage({ type: "PING" }) as PongMessage;
    if (pong?.type === "PONG") {
      versionLabel.textContent = `v${pong.payload?.version ?? "1.0.0"}`;
    }
  } catch {
    setStatus("error", "Extension not responding");
    return;
  }

  // 2. Request active tab page info from background.
  try {
    const res = await ext.runtime.sendMessage({
      type: "PAGE_INFO_REQ",
    }) as PageInfoResMessage;

    if (res?.type === "PAGE_INFO_RES" && res.payload) {
      const { title, url, host, formDetection } = res.payload;
      pageTitle.textContent = truncate(title || "(no title)", 60);
      pageUrl.textContent = truncate(url, 72);
      pageHost.textContent = host || "—";
      setStatus("ready", "Extension active");

      // Update Form Detection details
      if (formDetection?.detected) {
        formStatusBadge.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 6 9 17l-5-5"/>
          </svg>
          <span style="color: #065f46; font-weight: 700;">Form Detected</span>
        `;
        if (formDetection.platform && formDetection.platform !== "None") {
          formPlatformTag.style.display = "inline-block";
          formPlatformTag.textContent = formDetection.platform;
        } else {
          formPlatformTag.style.display = "none";
        }
        formDetailsText.textContent = `Found ${formDetection.fieldsCount} field(s): ${formDetection.detectedFields.join(", ")}`;
      } else {
        formStatusBadge.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span style="color: #64748b;">No Application Form</span>
        `;
        formPlatformTag.style.display = "none";
        formDetailsText.textContent = "Navigate to an online job application or posting to begin.";
      }
    } else {
      pageTitle.textContent = "No page info available yet.";
      pageUrl.textContent = "Navigate to any HTTPS page to begin.";
      pageHost.textContent = "—";
      setStatus("ready", "Waiting for a page…");
    }
  } catch {
    setStatus("error", "Could not reach background");
  }
}

async function handleAutofill(): Promise<void> {
  if (!autofillBtn) return;
  const originalText = autofillBtn.innerHTML;
  autofillBtn.innerHTML = `<span>Autofilling…</span>`;
  (autofillBtn as HTMLButtonElement).disabled = true;

  try {
    const res = (await ext.runtime.sendMessage({
      type: "TRIGGER_AUTOFILL",
    })) as AutofillResMessage;

    if (res?.type === "AUTOFILL_RES" && res.payload) {
      const payload = res.payload;
      if (payload.success) {
        autofillBtn.style.background = "#10b981";
        autofillBtn.innerHTML = `<span>✓ Filled (${payload.filledCount})</span>`;

        if (autofillResultBanner && autofillResultTitle && autofillResultFields) {
          autofillResultBanner.style.display = "block";
          autofillResultBanner.style.background = "#ecfdf5";
          autofillResultBanner.style.border = "1px solid #a7f3d0";
          autofillResultBanner.style.color = "#065f46";
          autofillResultTitle.textContent = payload.message;
          autofillResultFields.innerHTML = payload.filledFields
            .map(
              (f) =>
                `<span style="background: #ffffff; border: 1px solid #6ee7b7; color: #047857; font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px;">${f.fieldName}</span>`
            )
            .join("");
        }
      } else {
        autofillBtn.innerHTML = `<span>No Fields</span>`;
        if (autofillResultBanner && autofillResultTitle && autofillResultFields) {
          autofillResultBanner.style.display = "block";
          autofillResultBanner.style.background = "#f8fafc";
          autofillResultBanner.style.border = "1px solid #e2e8f0";
          autofillResultBanner.style.color = "#475569";
          autofillResultTitle.textContent = payload.message;
          autofillResultFields.innerHTML = "";
        }
      }
    }
  } catch {
    autofillBtn.innerHTML = `<span>Error</span>`;
  } finally {
    setTimeout(() => {
      (autofillBtn as HTMLButtonElement).disabled = false;
      autofillBtn.style.background = "";
      autofillBtn.innerHTML = originalText;
    }, 4000);
  }
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  loadPageInfo();
  refreshBtn.addEventListener("click", loadPageInfo);
  autofillBtn?.addEventListener("click", handleAutofill);
});
