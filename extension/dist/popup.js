"use strict";
(() => {
  // extension/src/popup.ts
  var ext = typeof browser !== "undefined" ? browser : chrome;
  var statusDot = document.getElementById("status-dot");
  var statusLabel = document.getElementById("status-label");
  var versionLabel = document.getElementById("version");
  var pageTitle = document.getElementById("page-title");
  var pageUrl = document.getElementById("page-url");
  var pageHost = document.getElementById("page-host");
  var refreshBtn = document.getElementById("refresh-btn");
  var autofillBtn = document.getElementById("autofill-btn");
  var formStatusBadge = document.getElementById("form-status-badge");
  var formPlatformTag = document.getElementById("form-platform-tag");
  var formDetailsText = document.getElementById("form-details-text");
  var autofillResultBanner = document.getElementById("autofill-result-banner");
  var autofillResultTitle = document.getElementById("autofill-result-title");
  var autofillResultFields = document.getElementById("autofill-result-fields");
  function setStatus(state, text) {
    statusDot.className = `status-dot ${state}`;
    statusLabel.textContent = text;
  }
  function truncate(str, max) {
    return str.length <= max ? str : str.slice(0, max - 1) + "\u2026";
  }
  async function loadPageInfo() {
    setStatus("loading", "Connecting\u2026");
    try {
      const pong = await ext.runtime.sendMessage({ type: "PING" });
      if (pong?.type === "PONG") {
        versionLabel.textContent = `v${pong.payload?.version ?? "1.0.0"}`;
      }
    } catch {
      setStatus("error", "Extension not responding");
      return;
    }
    try {
      const res = await ext.runtime.sendMessage({
        type: "PAGE_INFO_REQ"
      });
      if (res?.type === "PAGE_INFO_RES" && res.payload) {
        const { title, url, host, formDetection } = res.payload;
        pageTitle.textContent = truncate(title || "(no title)", 60);
        pageUrl.textContent = truncate(url, 72);
        pageHost.textContent = host || "\u2014";
        setStatus("ready", "Extension active");
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
        pageHost.textContent = "\u2014";
        setStatus("ready", "Waiting for a page\u2026");
      }
    } catch {
      setStatus("error", "Could not reach background");
    }
  }
  async function handleAutofill() {
    if (!autofillBtn) return;
    const originalText = autofillBtn.innerHTML;
    autofillBtn.innerHTML = `<span>Autofilling\u2026</span>`;
    autofillBtn.disabled = true;
    try {
      const res = await ext.runtime.sendMessage({
        type: "TRIGGER_AUTOFILL"
      });
      if (res?.type === "AUTOFILL_RES" && res.payload) {
        const payload = res.payload;
        if (payload.success) {
          autofillBtn.style.background = "#10b981";
          autofillBtn.innerHTML = `<span>\u2713 Filled (${payload.filledCount})</span>`;
          if (autofillResultBanner && autofillResultTitle && autofillResultFields) {
            autofillResultBanner.style.display = "block";
            autofillResultBanner.style.background = "#ecfdf5";
            autofillResultBanner.style.border = "1px solid #a7f3d0";
            autofillResultBanner.style.color = "#065f46";
            autofillResultTitle.textContent = payload.message;
            autofillResultFields.innerHTML = payload.filledFields.map(
              (f) => `<span style="background: #ffffff; border: 1px solid #6ee7b7; color: #047857; font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px;">${f.fieldName}</span>`
            ).join("");
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
        autofillBtn.disabled = false;
        autofillBtn.style.background = "";
        autofillBtn.innerHTML = originalText;
      }, 4e3);
    }
  }
  document.addEventListener("DOMContentLoaded", () => {
    loadPageInfo();
    refreshBtn.addEventListener("click", loadPageInfo);
    autofillBtn?.addEventListener("click", handleAutofill);
  });
})();
