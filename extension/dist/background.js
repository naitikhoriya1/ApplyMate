"use strict";
(() => {
  // src/lib/profile/defaultProfile.ts
  var DEFAULT_PROFILE = {
    personal: {
      firstName: "Naitik",
      lastName: "Khoriya",
      professionalTitle: "QA Automation Engineer | SDET (Frontend & API)",
      email: "ethicalkhoriya@gmail.com",
      phone: "+91 7877816484",
      location: "Delhi, India",
      bio: "QA Automation Engineer and SDET specialising in frontend and API testing. Experienced with Jest, Playwright, Selenium, and TypeScript. Passionate about building reliable test automation frameworks and improving software quality."
    },
    social: {
      linkedin: "https://linkedin.com/in/naitik",
      github: "https://github.com/naitik",
      portfolio: "https://naitik.dev"
    },
    experience: [
      {
        id: "exp-1",
        company: "Fibe India",
        role: "Software Engineer Intern (Testing & Automation Focus)",
        startDate: "2026-05",
        endDate: "",
        current: true,
        description: "Working on test automation for the Fibe consumer lending platform, covering regression testing, API testing, and CI/CD pipeline integration.",
        skills: ["Jest", "Playwright", "TypeScript", "REST APIs", "CI/CD"]
      },
      {
        id: "exp-2",
        company: "Aigetai Private Limited",
        role: "Frontend Developer (Freelance)",
        startDate: "2026-02",
        endDate: "2026-05",
        current: false,
        description: "Developed responsive React.js web interfaces and integrated REST APIs. Collaborated with the design team to deliver pixel-accurate UI components.",
        skills: ["React.js", "JavaScript", "TypeScript", "REST APIs", "Node.js"]
      }
    ],
    education: [
      {
        id: "edu-1",
        institution: "Bikaner Technical University",
        degree: "B.Tech",
        fieldOfStudy: "Computer Science and Engineering",
        startDate: "2021-08",
        endDate: "2025-05",
        current: false,
        grade: ""
      }
    ],
    skills: [
      "Jest",
      "React Testing Library",
      "Playwright",
      "Selenium WebDriver",
      "JavaScript",
      "TypeScript",
      "C++",
      "React.js",
      "Next.js",
      "Node.js",
      "Express.js",
      "REST APIs",
      "MongoDB",
      "Firebase",
      "Git",
      "GitHub",
      "CI/CD",
      "Agile/Scrum",
      "SDLC",
      "Regression Testing",
      "Unit Testing",
      "Component Testing",
      "Test Automation"
    ],
    preferences: {
      workAuthorization: "Authorized to work in India",
      requiresSponsorship: false,
      noticePeriod: "Available immediately / 2 weeks",
      desiredSalary: "Competitive",
      currency: "INR",
      openToRemote: true,
      preferredLocations: ["Delhi, India", "Remote"],
      jobTitles: [
        "QA Automation Engineer",
        "SDET",
        "Software Engineer in Test",
        "Frontend Developer"
      ],
      willingToRelocate: true
    },
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };

  // extension/src/background.ts
  var ext = typeof browser !== "undefined" ? browser : chrome;
  var EXTENSION_VERSION = "1.0.0";
  var STORAGE_PROFILE_KEY = "applymate_profile";
  var tabPageInfo = /* @__PURE__ */ new Map();
  ext.runtime.onInstalled.addListener(async ({ reason }) => {
    console.log(`[ApplyMate SW] Installed/Updated \u2014 reason: ${reason}`);
    try {
      ext.storage.local.get(STORAGE_PROFILE_KEY, (res) => {
        if (!res || !res[STORAGE_PROFILE_KEY]) {
          ext.storage.local.set({ [STORAGE_PROFILE_KEY]: DEFAULT_PROFILE });
          console.log("[ApplyMate SW] Seeded initial candidate profile into storage.");
        }
      });
    } catch (e) {
      console.warn("[ApplyMate SW] Storage seed warning:", e);
    }
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
        case "RERUN_DETECTION": {
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
