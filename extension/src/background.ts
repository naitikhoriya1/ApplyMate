/**
 * ApplyMate — Background Service Worker
 *
 * Runs as a Manifest V3 Service Worker — there is no persistent DOM
 * or long-lived window. The worker may be suspended by the browser
 * at any time and restarted on the next event.
 *
 * Responsibilities:
 *  1. Listen for install / activate lifecycle events.
 *  2. Receive PAGE_INFO messages from content scripts and cache them
 *     per tab so the popup can query them quickly.
 *  3. Respond to popup PAGE_INFO_REQ messages.
 *  4. Answer PING health-check messages.
 *
 * Safari Note:
 *   Safari 15.4+ supports background service workers in Manifest V3.
 *   The `browser` namespace is available; we use it with a chrome shim.
 *   Avoid any APIs that require a persistent event page (they won't
 *   work in a service worker context).
 */

import type {
  AnyMessage,
  PageInfoPayload,
  PageInfoResMessage,
  PongMessage,
} from "./types";

const ext = (typeof browser !== "undefined" ? browser : chrome) as typeof chrome;
const EXTENSION_VERSION = "1.0.0";

// In-memory tab cache. Keyed by tab ID.
// Because service workers can be suspended, this is intentionally
// kept lean — a full persistence layer will come in Phase 2 via
// ext.storage.local.
const tabPageInfo = new Map<number, PageInfoPayload>();

// ─── Lifecycle ────────────────────────────────────────────────────────────────
ext.runtime.onInstalled.addListener(({ reason }) => {
  console.log(`[ApplyMate SW] Installed — reason: ${reason}`);
});

// ─── Tab cleanup ─────────────────────────────────────────────────────────────
ext.tabs.onRemoved.addListener((tabId) => {
  tabPageInfo.delete(tabId);
});

// ─── Message handler ─────────────────────────────────────────────────────────
ext.runtime.onMessage.addListener(
  (
    message: AnyMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: AnyMessage) => void
  ) => {
    switch (message.type) {
      // Content script → background: store page metadata.
      case "PAGE_INFO": {
        const tabId = sender.tab?.id;
        if (tabId !== undefined && message.payload) {
          tabPageInfo.set(tabId, message.payload);
          console.log(
            `[ApplyMate SW] Tab ${tabId} page info cached — "${message.payload.title}" (${message.payload.host})`
          );
        }
        sendResponse({ type: "PAGE_INFO_RES", payload: null });
        return false;
      }

      // Popup → background: return cached page info for the active tab.
      case "PAGE_INFO_REQ": {
        // Retrieve the currently focused tab.
        ext.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const tab = tabs[0];
          const info = tab?.id !== undefined ? tabPageInfo.get(tab.id) : undefined;
          const response: PageInfoResMessage = {
            type: "PAGE_INFO_RES",
            payload: info ?? null,
          };
          sendResponse(response);
        });
        // Returning true keeps the message channel open for the async response.
        return true;
      }

      // Popup → background: health check.
      case "PING": {
        const response: PongMessage = {
          type: "PONG",
          payload: { version: EXTENSION_VERSION },
        };
        sendResponse(response);
        return false;
      }

      default:
        return false;
    }
  }
);

