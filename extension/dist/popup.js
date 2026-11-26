"use strict";
(() => {
  // src/lib/ai/localCoverLetter.ts
  function buildSignature(profile) {
    const { personal, social } = profile;
    const fullName = `${personal.firstName} ${personal.lastName}`.trim();
    const lines = [
      fullName,
      personal.professionalTitle,
      `Email: ${personal.email}`,
      `Phone: ${personal.phone}`,
      `Location: ${personal.location}`
    ];
    const links = [social.linkedin, social.github, social.portfolio].filter(Boolean);
    if (links.length > 0) {
      lines.push(links.join(" | "));
    }
    return lines.filter(Boolean).join("\n");
  }
  function pickMatchingSkills(profileSkills, jobContext) {
    const targetPool = [
      ...jobContext?.requiredSkills ?? [],
      ...jobContext?.preferredSkills ?? []
    ].map((s) => s.toLowerCase());
    const descLower = (jobContext?.jobDescription ?? "").toLowerCase();
    const matched = profileSkills.filter((skill) => {
      const lower = skill.toLowerCase();
      return targetPool.includes(lower) || descLower && descLower.includes(lower);
    });
    if (matched.length >= 3) return matched.slice(0, 5);
    const combined = [...matched];
    for (const s of profileSkills) {
      if (!combined.includes(s)) combined.push(s);
      if (combined.length >= 5) break;
    }
    return combined;
  }
  function generateLocalCoverLetter(input) {
    const { format, profile, jobContext, variant = 0 } = input;
    const { personal, experience, education, skills } = profile;
    const fullName = `${personal.firstName} ${personal.lastName}`.trim();
    const roleTitle = jobContext?.jobTitle?.trim() || personal.professionalTitle.split("|")[0].trim();
    const company = jobContext?.companyName?.trim() || "your team";
    const hasSpecificCompany = Boolean(jobContext?.companyName?.trim());
    const topSkills = pickMatchingSkills(skills, jobContext);
    const skillsPhrase = topSkills.length > 1 ? `${topSkills.slice(0, -1).join(", ")}, and ${topSkills[topSkills.length - 1]}` : topSkills[0] ?? "";
    const latestExp = experience[0];
    const latestEdu = education[0];
    const openings = [
      hasSpecificCompany ? `I am writing to express my interest in the ${roleTitle} position at ${company}.` : `I am writing to apply for the ${roleTitle} position.`,
      hasSpecificCompany ? `I would like to submit my application for the ${roleTitle} role at ${company}.` : `I am excited to apply for the ${roleTitle} opportunity.`,
      hasSpecificCompany ? `With a background in ${personal.professionalTitle}, I am eager to be considered for the ${roleTitle} role at ${company}.` : `With my background as a ${personal.professionalTitle}, I am eager to apply for the ${roleTitle} role.`
    ];
    const closings = [
      hasSpecificCompany ? `I would welcome the opportunity to discuss how my background aligns with ${company}'s engineering goals. Thank you for your time and consideration.` : `I would welcome the chance to discuss how my skills and experience can contribute to your team. Thank you for your time and consideration.`,
      hasSpecificCompany ? `Thank you for reviewing my application. I look forward to the possibility of speaking with the ${company} hiring team.` : `Thank you for your consideration. I would be glad to share more about my work in an interview.`,
      `Thank you for your time. I am available at your convenience to discuss this role further.`
    ];
    const idx = Math.abs(variant) % openings.length;
    const opening = openings[idx];
    const closing = closings[idx];
    const expSentence = latestExp ? `Most recently, as a ${latestExp.role} at ${latestExp.company}, I worked on ${latestExp.description.charAt(0).toLowerCase() + latestExp.description.slice(1)}` : `As a ${personal.professionalTitle}, I bring hands-on experience building and testing reliable web applications.`;
    const eduAndSkillsSentence = [
      latestEdu ? `I hold a ${latestEdu.degree} in ${latestEdu.fieldOfStudy} from ${latestEdu.institution}` : "",
      skillsPhrase ? `and work regularly with ${skillsPhrase}.` : "."
    ].filter(Boolean).join(" ");
    const signature = buildSignature(profile);
    const subject = hasSpecificCompany ? `Application for ${roleTitle} \u2014 ${fullName}` : `Job Application: ${roleTitle} \u2014 ${fullName}`;
    const bodyLines = [
      "Dear Hiring Team,",
      "",
      opening,
      "",
      `${expSentence} ${eduAndSkillsSentence}`.trim(),
      "",
      closing,
      "",
      "Sincerely,",
      signature
    ];
    const content = format === "application_email" ? `Subject: ${subject}

${bodyLines.join("\n")}` : bodyLines.join("\n");
    return {
      content,
      subject: format === "application_email" ? subject : void 0,
      format,
      mode: "local"
    };
  }

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
  var statDetected = $("stat-detected");
  var statFilled = $("stat-filled");
  var statSkipped = $("stat-skipped");
  var statFailed = $("stat-failed");
  var manualBanner = $("manual-banner");
  var manualBannerText = $("manual-banner-text");
  var undoBtn = $("undo-btn");
  var rerunBtn = $("rerun-btn");
  var reviewList = $("review-list");
  var analyzeJobBtn = $("analyze-job-btn");
  var analyzeSelBtn = $("analyze-selection-btn");
  var jobFieldsWrap = $("job-fields");
  var jobTitleInput = $("job-title-input");
  var jobCompanyInput = $("job-company-input");
  var jobLocationInput = $("job-location-input");
  var jobTypeInput = $("job-type-input");
  var jobExpInput = $("job-exp-input");
  var jobReqSkillsIn = $("job-req-skills-input");
  var jobPrefSkillsIn = $("job-pref-skills-input");
  var jobDescInput = $("job-desc-input");
  var jobSaveBtn = $("job-save-btn");
  var jobSaveStatus = $("job-save-status");
  var aiQuestionSelect = $("ai-question-select");
  var aiCustomWrap = $("ai-custom-wrap");
  var aiCustomInput = $("ai-custom-question");
  var aiGenerateBtn = $("ai-generate-btn");
  var aiAnswerTextarea = $("ai-answer-textarea");
  var aiCopyBtn = $("ai-copy-btn");
  var aiInsertBtn = $("ai-insert-btn");
  var aiStatusMsg = $("ai-status-msg");
  var clFormatSelect = $("cl-format-select");
  var clGenerateBtn = $("cl-generate-btn");
  var clRegenerateBtn = $("cl-regenerate-btn");
  var clTextarea = $("cl-textarea");
  var clCopyBtn = $("cl-copy-btn");
  var clInsertBtn = $("cl-insert-btn");
  var clStatusMsg = $("cl-status-msg");
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
  var isAutofilling = false;
  var lastPageTs = 0;
  var lastAutofillResult = null;
  var loadedProfile = null;
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
  var STATUS_LABELS = {
    filled: "Filled",
    skipped: "Skipped",
    failed: "Failed",
    manual_attention: "Manual"
  };
  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function renderAutofillResult(result) {
    if (!result) return;
    lastAutofillResult = result;
    autofillResult.style.display = "block";
    autofillResult.className = `autofill-result ${result.success ? "success" : "empty"}`;
    const iconEl = document.getElementById("autofill-result-icon");
    if (iconEl) {
      iconEl.innerHTML = result.success ? `<path d="M20 6 9 17l-5-5"/>` : `<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>`;
    }
    autofillResultMsg.textContent = result.message;
    const summary = result.summary ?? {
      detectedFields: result.totalFieldsFound,
      filledFields: result.filledCount,
      skippedFields: 0,
      failedFields: 0,
      manualAttentionFields: 0
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
    reviewList.innerHTML = fields.map((f) => {
      const subText = f.status === "filled" && f.valueFilled ? truncate(f.valueFilled, 38) : f.reason;
      const needsManual = f.status !== "filled";
      const defaultVal = escapeHtml(f.suggestedValue ?? "");
      return `
        <div class="review-item" data-field-id="${escapeHtml(f.fieldId)}">
          <div class="review-item-top">
            <span class="review-item-name">${escapeHtml(f.fieldName)}</span>
            <span class="review-badge ${f.status}">${STATUS_LABELS[f.status]}</span>
          </div>
          <div class="review-item-sub">${escapeHtml(subText)}</div>
          ${needsManual ? `<div class="review-manual-row">
                   <input class="review-manual-input" type="text" value="${defaultVal}" placeholder="Enter value\u2026" />
                   <button class="review-manual-btn" type="button" data-fill-id="${escapeHtml(f.fieldId)}">Fill</button>
                 </div>` : ""}
        </div>
      `;
    }).join("");
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
      loadedProfile = profileRes.value.payload;
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
    if (isAutofilling) return;
    isAutofilling = true;
    autofillBtn.disabled = true;
    autofillBtn.classList.add("filling");
    autofillBtnText.textContent = "Autofilling\u2026";
    autofillBtnSub.textContent = "Please wait";
    try {
      const res = await ext.runtime.sendMessage({ type: "TRIGGER_AUTOFILL" });
      if (res?.type === "AUTOFILL_RES" && res.payload) {
        const { success, filledCount, duplicatePrevented, message } = res.payload;
        autofillBtn.classList.remove("filling");
        if (success) autofillBtn.classList.add("filled");
        if (duplicatePrevented) {
          autofillBtnText.textContent = "Already Filled";
          autofillBtnSub.textContent = "Undo or rerun below";
        } else if (success) {
          autofillBtnText.textContent = `\u2713 Filled (${filledCount})`;
          autofillBtnSub.textContent = "Review below";
        } else {
          autofillBtnText.textContent = "No Fields Filled";
          autofillBtnSub.textContent = truncate(message, 28);
        }
        renderAutofillResult(res.payload);
      }
    } catch {
      autofillBtn.classList.remove("filling");
      autofillBtnText.textContent = "Error";
      autofillBtnSub.textContent = "Could not reach page";
    } finally {
      isAutofilling = false;
      setTimeout(() => {
        autofillBtn.disabled = false;
        autofillBtn.classList.remove("filling", "filled");
        autofillBtnText.textContent = "Autofill Page";
        autofillBtnSub.textContent = "Fill detected fields";
      }, 3500);
    }
  }
  async function handleUndo() {
    undoBtn.disabled = true;
    try {
      const res = await ext.runtime.sendMessage({ type: "UNDO_AUTOFILL" });
      if (res?.type === "UNDO_AUTOFILL_RES" && res.payload) {
        autofillResultMsg.textContent = res.payload.message;
        if (res.payload.success && lastAutofillResult) {
          lastAutofillResult.canUndo = false;
          lastAutofillResult.success = false;
          lastAutofillResult.filledCount = 0;
          lastAutofillResult.summary = {
            ...lastAutofillResult.summary,
            filledFields: 0
          };
          if (lastAutofillResult.fields) {
            lastAutofillResult.fields = lastAutofillResult.fields.map(
              (f) => f.status === "filled" ? { ...f, status: "skipped", reason: "Undone by user", valueFilled: void 0 } : f
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
  async function handleRerunDetection() {
    rerunBtn.disabled = true;
    try {
      const res = await ext.runtime.sendMessage({ type: "RERUN_DETECTION" });
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
  async function handleManualFieldFill(fieldId, customValue) {
    try {
      const res = await ext.runtime.sendMessage({
        type: "FILL_SINGLE_FIELD",
        payload: { fieldId, customValue }
      });
      if (res?.type === "FILL_SINGLE_FIELD_RES" && res.payload) {
        if (res.payload.success && res.payload.field && lastAutofillResult) {
          const updated = res.payload.field;
          lastAutofillResult.canUndo = true;
          lastAutofillResult.success = true;
          if (lastAutofillResult.fields) {
            lastAutofillResult.fields = lastAutofillResult.fields.map(
              (f) => f.fieldId === fieldId ? updated : f
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
              manualAttentionFields: manual
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
  setInterval(() => {
    if (lastPageTs > 0) {
      lastUpdated.textContent = formatTimeAgo(lastPageTs);
    }
  }, 1e4);
  var currentJobAnalysis = null;
  var JOB_ANALYSIS_KEY = "applymate_last_job_analysis";
  function renderJobAnalysis(job) {
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
  async function runJobAnalysis(useSelection) {
    analyzeJobBtn.disabled = true;
    analyzeSelBtn.disabled = true;
    jobSaveStatus.textContent = "Analyzing\u2026";
    try {
      const res = await ext.runtime.sendMessage({
        type: "ANALYZE_JOB",
        payload: { useSelection }
      });
      if (res?.type === "ANALYZE_JOB_RES" && res.payload) {
        renderJobAnalysis(res.payload);
      }
    } catch {
      jobFieldsWrap.classList.remove("hidden");
      jobSaveStatus.textContent = "Could not scan page \u2014 edit manually below.";
    } finally {
      analyzeJobBtn.disabled = false;
      analyzeSelBtn.disabled = false;
    }
  }
  async function saveEditedJobAnalysis() {
    const splitSkills = (raw) => raw.split(",").map((s) => s.trim()).filter(Boolean);
    const updated = {
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
      extractedAt: (/* @__PURE__ */ new Date()).toISOString(),
      usedManualSelection: currentJobAnalysis?.usedManualSelection
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
  var AI_API_ENDPOINT = "http://localhost:3000/api/ai/answer";
  function getSelectedQuestion() {
    if (aiQuestionSelect.value === "__custom__") {
      return aiCustomInput.value.trim();
    }
    return aiQuestionSelect.value;
  }
  async function handleGenerateAiAnswer() {
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
    aiStatusMsg.textContent = "Generating\u2026";
    try {
      const res = await fetch(AI_API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          profile: loadedProfile,
          jobContext: currentJobAnalysis ?? void 0
        })
      });
      const data = await res.json();
      if (!res.ok || !data.answer) {
        aiStatusMsg.textContent = truncate(
          data.error ?? "AI unavailable \u2014 write/edit manually.",
          45
        );
        return;
      }
      aiAnswerTextarea.value = data.answer;
      aiStatusMsg.textContent = "Ready to review";
    } catch {
      aiStatusMsg.textContent = "Dashboard API offline \u2014 edit manually.";
    } finally {
      aiGenerateBtn.disabled = false;
    }
  }
  async function handleCopyAiAnswer() {
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
      }, 2e3);
    } catch {
      aiStatusMsg.textContent = "Copy failed.";
    }
  }
  async function handleInsertAiAnswer() {
    const text = aiAnswerTextarea.value.trim();
    if (!text) {
      aiStatusMsg.textContent = "Write or generate an answer first.";
      return;
    }
    try {
      const res = await ext.runtime.sendMessage({
        type: "INSERT_ANSWER",
        payload: { answer: text }
      });
      aiStatusMsg.textContent = res?.payload?.message ?? "Insert failed.";
    } catch {
      aiStatusMsg.textContent = "Could not reach page.";
    }
  }
  var coverLetterVariant = 0;
  function generateCoverLetterDraft(regenerate) {
    if (!loadedProfile) {
      clStatusMsg.textContent = "Profile not loaded yet.";
      return;
    }
    if (regenerate) {
      coverLetterVariant++;
    } else {
      coverLetterVariant = 0;
    }
    const format = clFormatSelect.value;
    const result = generateLocalCoverLetter({
      format,
      profile: loadedProfile,
      jobContext: currentJobAnalysis ?? void 0,
      variant: coverLetterVariant
    });
    clTextarea.value = result.content;
    clStatusMsg.textContent = regenerate ? "Regenerated" : "Generated";
  }
  async function handleCopyCoverLetter() {
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
      }, 2e3);
    } catch {
      clStatusMsg.textContent = "Copy failed.";
    }
  }
  async function handleInsertCoverLetter() {
    const text = clTextarea.value.trim();
    if (!text) {
      clStatusMsg.textContent = "Generate or write text first.";
      return;
    }
    try {
      const res = await ext.runtime.sendMessage({
        type: "INSERT_ANSWER",
        payload: { answer: text }
      });
      clStatusMsg.textContent = res?.payload?.message ?? "Insert failed.";
    } catch {
      clStatusMsg.textContent = "Could not reach page.";
    }
  }
  document.addEventListener("DOMContentLoaded", () => {
    loadAll();
    refreshBtn.addEventListener("click", loadAll);
    retryBtn.addEventListener("click", loadAll);
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
      const target = e.target;
      const btn = target?.closest?.("[data-fill-id]");
      if (!btn) return;
      const fieldId = btn.dataset.fillId;
      if (!fieldId) return;
      const row = btn.closest(".review-item");
      const input = row?.querySelector(".review-manual-input");
      const customValue = input?.value ?? "";
      handleManualFieldFill(fieldId, customValue);
    });
  });
})();
