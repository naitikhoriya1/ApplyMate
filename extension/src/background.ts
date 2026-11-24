/**
 * ApplyMate — Background Service Worker
 *
 * Runs as a Manifest V3 Service Worker.
 *
 * Responsibilities:
 *  1. Listen for install / activate lifecycle events.
 *  2. Receive PAGE_INFO messages from content scripts and cache them per tab.
 *  3. Fallback to tab querying if content script hasn't reported yet.
 *  4. Respond to popup PAGE_INFO_REQ messages with active tab URL and title.
 *  5. Answer PING health-check messages from the popup.
 */

import type {
  AnyMessage,
  PageInfoPayload,
  PongMessage,
} from "./types";

const ext = (typeof browser !== "undefined" ? browser : chrome) as typeof chrome;
const EXTENSION_VERSION = "1.0.0";

// In-memory tab cache: tabId -> PageInfoPayload
const tabPageInfo = new Map<number, PageInfoPayload>();

// ─── Lifecycle ────────────────────────────────────────────────────────────────
ext.runtime.onInstalled.addListener(({ reason }) => {
  console.log(`[ApplyMate SW] Installed/Updated — reason: ${reason}`);
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
            `[ApplyMate SW] Tab ${tabId} cached — "${message.payload.title}" (${message.payload.host})`
          );
        }
        sendResponse({ type: "PAGE_INFO_RES", payload: null });
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
            };
            tabPageInfo.set(activeTab.id, fallback);
            sendResponse({ type: "PAGE_INFO_RES", payload: fallback });
            return;
          }

          sendResponse({ type: "PAGE_INFO_RES", payload: null });
        });
        // Returning true keeps channel open for async tabs.query callback
        return true;
      }

      // Popup -> background: health check
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
