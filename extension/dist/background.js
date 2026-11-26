"use strict";
(() => {
  // src/lib/profile/defaultProfile.ts
  var EMPTY_PROFILE = {
    personal: {
      firstName: "",
      lastName: "",
      professionalTitle: "",
      email: "",
      phone: "",
      location: "",
      bio: ""
    },
    social: {
      linkedin: "",
      github: "",
      portfolio: ""
    },
    experience: [],
    education: [],
    skills: [],
    preferences: {
      workAuthorization: "",
      requiresSponsorship: false,
      noticePeriod: "",
      desiredSalary: "",
      currency: "INR",
      openToRemote: true,
      preferredLocations: [],
      jobTitles: [],
      willingToRelocate: false
    },
    updatedAt: ""
  };
  var DEFAULT_PROFILE = EMPTY_PROFILE;

  // extension/src/background.ts
  var ext = typeof browser !== "undefined" ? browser : chrome;
  var EXTENSION_VERSION = "1.0.0";
  var STORAGE_PROFILE_KEY = "applymate_profile";
  var tabPageInfo = /* @__PURE__ */ new Map();
  ext.runtime.onInstalled.addListener(({ reason }) => {
    console.log(`[ApplyMate SW] Installed/Updated \u2014 reason: ${reason}`);
  });
  ext.tabs.onRemoved.addListener((tabId) => {
    tabPageInfo.delete(tabId);
  });
  function getHost(urlStr) {
    try {
      return new URL(urlStr).hostname;
    } catch {
      return "\u2014";
    }
  }
  ext.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {
      if (sender.id && ext.runtime?.id && sender.id !== ext.runtime.id) {
        return false;
      }
      switch (message.type) {
        // Content script -> background: store detected page metadata
        case "PAGE_INFO": {
          const tabId = sender.tab?.id;
          if (tabId !== void 0 && message.payload) {
            tabPageInfo.set(tabId, message.payload);
            console.log(
              `[ApplyMate SW] Tab ${tabId} cached \u2014 "${message.payload.title}" (${message.payload.host}) \u2014 Form: ${message.payload.formDetection?.detected}`
            );
          }
          const res = { type: "PAGE_INFO_RES", payload: null };
          sendResponse(res);
          return false;
        }
        // Popup -> background: return current active tab page info
        case "PAGE_INFO_REQ": {
          ext.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const activeTab = tabs[0];
            if (!activeTab || activeTab.id === void 0) {
              sendResponse({ type: "PAGE_INFO_RES", payload: null });
              return;
            }
            const cached = tabPageInfo.get(activeTab.id);
            if (cached) {
              sendResponse({ type: "PAGE_INFO_RES", payload: cached });
              return;
            }
            if (activeTab.url) {
              const fallback = {
                title: activeTab.title || "(Untitled Page)",
                url: activeTab.url,
                host: getHost(activeTab.url),
                timestamp: Date.now(),
                formDetection: {
                  detected: false,
                  platform: "None",
                  fieldsCount: 0,
                  hasResumeUpload: false,
                  detectedFields: [],
                  classifiedTypes: [],
                  confidence: "none"
                }
              };
              tabPageInfo.set(activeTab.id, fallback);
              sendResponse({ type: "PAGE_INFO_RES", payload: fallback });
              return;
            }
            sendResponse({ type: "PAGE_INFO_RES", payload: null });
          });
          return true;
        }
        // Content or Popup -> background: get candidate profile from storage
        case "GET_PROFILE": {
          try {
            ext.storage.local.get(STORAGE_PROFILE_KEY, (res) => {
              const profile = res?.[STORAGE_PROFILE_KEY] ?? DEFAULT_PROFILE;
              const response = {
                type: "GET_PROFILE_RES",
                payload: profile
              };
              sendResponse(response);
            });
          } catch {
            const response = {
              type: "GET_PROFILE_RES",
              payload: DEFAULT_PROFILE
            };
            sendResponse(response);
          }
          return true;
        }
        // Popup -> background: route autofill / undo / manual fill / rerun to active tab
        case "TRIGGER_AUTOFILL":
        case "UNDO_AUTOFILL":
        case "FILL_SINGLE_FIELD":
        case "RERUN_DETECTION":
        case "ANALYZE_JOB":
        case "INSERT_ANSWER": {
          ext.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const activeTab = tabs[0];
            const makeFallback = (reason) => {
              if (message.type === "TRIGGER_AUTOFILL") {
                return {
                  type: "AUTOFILL_RES",
                  payload: {
                    success: false,
                    filledCount: 0,
                    totalFieldsFound: 0,
                    filledFields: [],
                    summary: {
                      detectedFields: 0,
                      filledFields: 0,
                      skippedFields: 0,
                      failedFields: 0,
                      manualAttentionFields: 0
                    },
                    message: reason
                  }
                };
              }
              if (message.type === "RERUN_DETECTION") {
                return { type: "PAGE_INFO_RES", payload: null };
              }
              if (message.type === "ANALYZE_JOB") {
                return {
                  type: "ANALYZE_JOB_RES",
                  payload: {
                    companyName: "",
                    jobTitle: "",
                    jobDescription: "",
                    requiredSkills: [],
                    preferredSkills: [],
                    experienceRequired: "",
                    location: "",
                    employmentType: "",
                    platform: "None",
                    sourceUrl: "",
                    extractedAt: (/* @__PURE__ */ new Date()).toISOString()
                  }
                };
              }
              if (message.type === "INSERT_ANSWER") {
                return {
                  type: "INSERT_ANSWER_RES",
                  payload: { success: false, message: reason }
                };
              }
              if (message.type === "UNDO_AUTOFILL") {
                return {
                  type: "UNDO_AUTOFILL_RES",
                  payload: { success: false, restoredCount: 0, message: reason }
                };
              }
              return {
                type: "FILL_SINGLE_FIELD_RES",
                payload: { success: false, message: reason }
              };
            };
            if (!activeTab || activeTab.id === void 0) {
              sendResponse(makeFallback("No active tab found."));
              return;
            }
            ext.tabs.sendMessage(activeTab.id, message, (response) => {
              sendResponse(response ?? makeFallback("Could not reach page content script."));
            });
          });
          return true;
        }
        // Health check
        case "PING": {
          const pong = {
            type: "PONG",
            payload: { version: EXTENSION_VERSION }
          };
          sendResponse(pong);
          return false;
        }
        default:
          return false;
      }
    }
  );
})();
