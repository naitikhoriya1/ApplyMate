/**
 * ApplyMate — Background Service Worker
 *
 * Runs as a Manifest V3 Service Worker.
 *
 * Responsibilities:
 *  1. Seed default candidate profile into browser.storage.local on install.
 *  2. Receive PAGE_INFO messages from content scripts and cache them per tab.
 *  3. Serve GET_PROFILE requests to content scripts & popup.
 *  4. Route TRIGGER_AUTOFILL messages between popup and active content script.
 *  5. Answer PING health-check messages.
 */

import type {
  AnyMessage,
  PageInfoPayload,
  PageInfoResMessage,
  GetProfileResMessage,
  PongMessage,
  AutofillResMessage,
} from "./types.ts";
import type { CandidateProfile } from "../../src/types/profile.ts";
import { DEFAULT_PROFILE } from "../../src/lib/profile/defaultProfile.ts";

const ext = (typeof browser !== "undefined" ? browser : chrome) as typeof chrome;
const EXTENSION_VERSION = "1.0.0";
const STORAGE_PROFILE_KEY = "applymate_profile";

// In-memory tab cache: tabId -> PageInfoPayload
const tabPageInfo = new Map<number, PageInfoPayload>();

// ─── Lifecycle ────────────────────────────────────────────────────────────────
ext.runtime.onInstalled.addListener(async ({ reason }) => {
  console.log(`[ApplyMate SW] Installed/Updated — reason: ${reason}`);

  // Seed default candidate profile if not present
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

// ─── Tab cleanup on close ─────────────────────────────────────────────────────
ext.tabs.onRemoved.addListener((tabId) => {
  tabPageInfo.delete(tabId);
});

// ─── Helper to parse host safely ──────────────────────────────────────────────
function getHost(urlStr: string): string {
  try {
    return new URL(urlStr).hostname;
  } catch {
    return "—";
  }
}

// ─── Message router ───────────────────────────────────────────────────────────
ext.runtime.onMessage.addListener(
  (
    message: AnyMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: AnyMessage) => void
  ) => {
    switch (message.type) {
      // Content script -> background: store detected page metadata
      case "PAGE_INFO": {
        const tabId = sender.tab?.id;
        if (tabId !== undefined && message.payload) {
          tabPageInfo.set(tabId, message.payload);
          console.log(
            `[ApplyMate SW] Tab ${tabId} cached — "${message.payload.title}" (${message.payload.host}) — Form: ${message.payload.formDetection?.detected}`
          );
        }
        const res: PageInfoResMessage = { type: "PAGE_INFO_RES", payload: null };
        sendResponse(res);
        return false;
      }

      // Popup -> background: return current active tab page info
      case "PAGE_INFO_REQ": {
        ext.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const activeTab = tabs[0];
          if (!activeTab || activeTab.id === undefined) {
            sendResponse({ type: "PAGE_INFO_RES", payload: null });
            return;
          }

          // 1. Check in-memory cache from content script
          const cached = tabPageInfo.get(activeTab.id);
          if (cached) {
            sendResponse({ type: "PAGE_INFO_RES", payload: cached });
            return;
          }

          // 2. Fallback: extract directly from tab object if content script hasn't reported
          if (activeTab.url) {
            const fallback: PageInfoPayload = {
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
                confidence: "none",
              },
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
            const profile: CandidateProfile = (res?.[STORAGE_PROFILE_KEY] as CandidateProfile) ?? DEFAULT_PROFILE;
            const response: GetProfileResMessage = {
              type: "GET_PROFILE_RES",
              payload: profile,
            };
            sendResponse(response);
          });
        } catch {
          const response: GetProfileResMessage = {
            type: "GET_PROFILE_RES",
            payload: DEFAULT_PROFILE,
          };
          sendResponse(response);
        }
        return true;
      }

      // Popup -> background: route autofill trigger to active tab
      case "TRIGGER_AUTOFILL": {
        ext.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const activeTab = tabs[0];
          if (!activeTab || activeTab.id === undefined) {
            const errRes: AutofillResMessage = {
              type: "AUTOFILL_RES",
              payload: {
                success: false,
                filledCount: 0,
                totalFieldsFound: 0,
                filledFields: [],
                message: "No active tab found.",
              },
            };
            sendResponse(errRes);
            return;
          }

          ext.tabs.sendMessage(activeTab.id, { type: "TRIGGER_AUTOFILL" }, (response) => {
            sendResponse(response ?? {
              type: "AUTOFILL_RES",
              payload: {
                success: false,
                filledCount: 0,
                totalFieldsFound: 0,
                filledFields: [],
                message: "Could not trigger autofill on this page.",
              },
            });
          });
        });
        return true;
      }

      // Health check
      case "PING": {
        const pong: PongMessage = {
          type: "PONG",
          payload: { version: EXTENSION_VERSION },
        };
        sendResponse(pong);
        return false;
      }

      default:
        return false;
    }
  }
);
