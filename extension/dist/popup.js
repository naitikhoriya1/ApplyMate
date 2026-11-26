"use strict";
(() => {
  // extension/src/popup.ts
  var ext = typeof browser !== "undefined" ? browser : chrome;
  function truncate(str, max) {
    return str.length <= max ? str : str.slice(0, max - 1) + "\u2026";
  }
  function formatTimeAgo(ts) {
    const diff = Math.floor((Date.now() - ts) / 1e3);
    if (diff < 5) return "just now";
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  }
  function initials(first, last) {
    return ((first[0] ?? "") + (last[0] ?? "")).toUpperCase() || "?";
  }
  function computeCompletion(p) {
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
    return Math.round(score / max * 100);
  }
  var $ = (id) => document.getElementById(id);
  var statusDot = $("status-dot");
  var statusLabel = $("status-label");
  var versionBadge = $("version-badge");
  var errorState = $("error-state");
  var errorDesc = $("error-desc");
  var retryBtn = $("retry-btn");
  var mainContent = $("main-content");
  var profileAvatar = $("profile-avatar");
  var profileName = $("profile-name");
  var profileJobTitle = $("profile-job-title");
  var completionBar = $("completion-bar");
  var completionPct = $("completion-pct");
  var autofillBtn = $("autofill-btn");
  var autofillBtnText = $("autofill-btn-text");
  var autofillBtnSub = $("autofill-btn-sub");
  var autofillResult = $("autofill-result");
  var autofillResultMsg = $("autofill-result-msg");
  var autofillChips = $("autofill-chips");
  var pageTitle = $("page-title");
  var pageHost = $("page-host");
  var pageUrl = $("page-url");
  var formDetectBanner = $("form-detect-banner");
  var formDetectIcon = $("form-detect-icon");
  var formDetectStatus = $("form-detect-status");
  var formDetectDesc = $("form-detect-desc");
  var platformTag = $("platform-tag");
  var lastUpdated = $("last-updated");
  var refreshBtn = $("refresh-btn");
  var isLoading = false;
  var lastPageTs = 0;
  function setStatus(state, text) {
    statusDot.className = `status-dot ${state}`;
    statusLabel.textContent = text;
  }
  function showError(msg) {
    setStatus("error", "Error");
    errorDesc.textContent = msg;
    errorState.classList.remove("hidden");
    mainContent.classList.add("hidden");
  }
  function hideError() {
    errorState.classList.add("hidden");
    mainContent.classList.remove("hidden");
  }
  function renderProfile(profile) {
    const { firstName, lastName, professionalTitle } = profile.personal;
    profileAvatar.textContent = initials(firstName, lastName);
    profileName.textContent = `${firstName} ${lastName}`;
    profileJobTitle.textContent = truncate(professionalTitle, 60);
    const pct = computeCompletion(profile);
    completionBar.style.width = `${pct}%`;
    completionPct.textContent = `${pct}%`;
  }
  function renderPageInfo(payload) {
    if (!payload) {
      pageTitle.textContent = "No page data yet";
      pageTitle.className = "site-val muted";
      pageHost.textContent = "\u2014";
      pageUrl.textContent = "Navigate to any HTTPS page";
      pageUrl.className = "site-val muted";
      lastUpdated.textContent = "\u2014";
      return;
    }
    pageTitle.textContent = truncate(payload.title || "(no title)", 55);
    pageTitle.className = "site-val";
    pageHost.textContent = payload.host || "\u2014";
    pageUrl.textContent = truncate(payload.url, 48);
    pageUrl.className = "site-val url";
    lastPageTs = payload.timestamp;
    lastUpdated.textContent = formatTimeAgo(lastPageTs);
  }
  function renderFormDetection(form) {
    if (!form) {
      formDetectBanner.className = "form-detect-banner not-detected";
      formDetectStatus.textContent = "Unavailable";
      formDetectDesc.textContent = "Could not scan this page.";
      platformTag.classList.add("hidden");
      return;
    }
    if (form.detected) {
      formDetectBanner.className = "form-detect-banner detected";
      formDetectIcon.innerHTML = `<path d="M20 6 9 17l-5-5"/>`;
      formDetectIcon.setAttribute("stroke", "#10b981");
      formDetectStatus.textContent = `Form Detected \u2014 ${form.fieldsCount} field${form.fieldsCount !== 1 ? "s" : ""}`;
      formDetectDesc.textContent = form.detectedFields.length > 0 ? truncate(form.detectedFields.join(", "), 60) : "Application fields ready to fill";
      if (form.platform && form.platform !== "None") {
        platformTag.textContent = form.platform;
        platformTag.classList.remove("hidden");
      } else {
        platformTag.classList.add("hidden");
      }
    } else {
      formDetectBanner.className = "form-detect-banner not-detected";
      formDetectIcon.innerHTML = `<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>`;
      formDetectIcon.setAttribute("stroke", "#94a3b8");
      formDetectStatus.textContent = "No Application Form";
      formDetectDesc.textContent = "Navigate to a job application page to autofill.";
      platformTag.classList.add("hidden");
    }
  }
  function renderAutofillResult(result) {
    if (!result) return;
    autofillResult.style.display = "block";
    if (result.success) {
      autofillResult.className = "autofill-result success";
      document.getElementById("autofill-result-icon").innerHTML = `<path d="M20 6 9 17l-5-5"/>`;
      autofillResultMsg.textContent = result.message;
      autofillChips.innerHTML = result.filledFields.map(
        (f) => `<span class="autofill-chip">${f.fieldName}</span>`
      ).join("");
    } else {
      autofillResult.className = "autofill-result empty";
      document.getElementById("autofill-result-icon").innerHTML = `<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>`;
      autofillResultMsg.textContent = result.message;
      autofillChips.innerHTML = "";
    }
  }
  async function loadAll() {
    if (isLoading) return;
    isLoading = true;
    setStatus("loading", "Loading\u2026");
    refreshBtn.classList.add("spinning");
    hideError();
    try {
      const pong = await ext.runtime.sendMessage({ type: "PING" });
      if (pong?.type === "PONG") {
        versionBadge.textContent = `v${pong.payload?.version ?? "1.0.0"}`;
      }
    } catch {
      showError("Cannot connect to the ApplyMate background service worker. Try reloading Safari.");
      isLoading = false;
      refreshBtn.classList.remove("spinning");
      return;
    }
    const [profileRes, pageRes] = await Promise.allSettled([
      ext.runtime.sendMessage({ type: "GET_PROFILE" }),
      ext.runtime.sendMessage({ type: "PAGE_INFO_REQ" })
    ]);
    if (profileRes.status === "fulfilled" && profileRes.value?.type === "GET_PROFILE_RES" && profileRes.value.payload) {
      renderProfile(profileRes.value.payload);
    } else {
      profileName.textContent = "Profile not found";
      profileJobTitle.textContent = "Open the dashboard to set up your profile";
      completionPct.textContent = "0%";
      completionBar.style.width = "0%";
    }
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
  async function triggerAutofill() {
    autofillBtn.disabled = true;
    autofillBtn.classList.add("filling");
    autofillBtnText.textContent = "Autofilling\u2026";
    autofillBtnSub.textContent = "Please wait";
    autofillResult.style.display = "none";
    try {
      const res = await ext.runtime.sendMessage({ type: "TRIGGER_AUTOFILL" });
      if (res?.type === "AUTOFILL_RES" && res.payload) {
        const { success, filledCount, message } = res.payload;
        autofillBtn.classList.remove("filling");
        autofillBtn.classList.add(success ? "filled" : "");
        if (success) {
          autofillBtnText.textContent = `\u2713 Filled (${filledCount})`;
          autofillBtnSub.textContent = "Fields populated!";
        } else {
          autofillBtnText.textContent = "No Fields Found";
          autofillBtnSub.textContent = message.slice(0, 30);
        }
        renderAutofillResult(res.payload);
      }
    } catch {
      autofillBtn.classList.remove("filling");
      autofillBtnText.textContent = "Error";
      autofillBtnSub.textContent = "Could not reach page";
    } finally {
      setTimeout(() => {
        autofillBtn.disabled = false;
        autofillBtn.classList.remove("filling", "filled");
        autofillBtnText.textContent = "Autofill Page";
        autofillBtnSub.textContent = "Fill detected fields";
      }, 5e3);
    }
  }
  setInterval(() => {
    if (lastPageTs > 0) {
      lastUpdated.textContent = formatTimeAgo(lastPageTs);
    }
  }, 1e4);
  document.addEventListener("DOMContentLoaded", () => {
    loadAll();
    refreshBtn.addEventListener("click", loadAll);
    retryBtn.addEventListener("click", loadAll);
    autofillBtn.addEventListener("click", triggerAutofill);
  });
})();
