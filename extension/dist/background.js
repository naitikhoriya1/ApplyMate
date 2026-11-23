"use strict";
(() => {
  // extension/src/background.ts
  var ext = typeof browser !== "undefined" ? browser : chrome;
  var EXTENSION_VERSION = "1.0.0";
  var tabPageInfo = /* @__PURE__ */ new Map();
  ext.runtime.onInstalled.addListener(({ reason }) => {
    console.log(`[ApplyMate SW] Installed \u2014 reason: ${reason}`);
  });
  ext.tabs.onRemoved.addListener((tabId) => {
    tabPageInfo.delete(tabId);
  });
  ext.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {
      switch (message.type) {
        // Content script → background: store page metadata.
        case "PAGE_INFO": {
          const tabId = sender.tab?.id;
          if (tabId !== void 0 && message.payload) {
            tabPageInfo.set(tabId, message.payload);
            console.log(
              `[ApplyMate SW] Tab ${tabId} page info cached \u2014 "${message.payload.title}" (${message.payload.host})`
            );
          }
          sendResponse({ type: "PAGE_INFO_RES", payload: null });
          return false;
        }
        // Popup → background: return cached page info for the active tab.
        case "PAGE_INFO_REQ": {
          ext.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs[0];
            const info = tab?.id !== void 0 ? tabPageInfo.get(tab.id) : void 0;
            const response = {
              type: "PAGE_INFO_RES",
              payload: info ?? null
            };
            sendResponse(response);
          });
          return true;
        }
        // Popup → background: health check.
        case "PING": {
          const response = {
            type: "PONG",
            payload: { version: EXTENSION_VERSION }
          };
          sendResponse(response);
          return false;
        }
        default:
          return false;
      }
    }
  );
})();
