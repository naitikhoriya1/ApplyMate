"use strict";
(() => {
  // extension/src/background.ts
  var ext = typeof browser !== "undefined" ? browser : chrome;
  var EXTENSION_VERSION = "1.0.0";
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
      switch (message.type) {
        // Content script -> background: store detected page metadata
        case "PAGE_INFO": {
          const tabId = sender.tab?.id;
          if (tabId !== void 0 && message.payload) {
            tabPageInfo.set(tabId, message.payload);
            console.log(
              `[ApplyMate SW] Tab ${tabId} cached \u2014 "${message.payload.title}" (${message.payload.host})`
            );
          }
          sendResponse({ type: "PAGE_INFO_RES", payload: null });
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
                timestamp: Date.now()
              };
              tabPageInfo.set(activeTab.id, fallback);
              sendResponse({ type: "PAGE_INFO_RES", payload: fallback });
              return;
            }
            sendResponse({ type: "PAGE_INFO_RES", payload: null });
          });
          return true;
        }
        // Popup -> background: health check
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
