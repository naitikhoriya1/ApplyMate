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
        const { title, url, host } = res.payload;
        pageTitle.textContent = truncate(title || "(no title)", 60);
        pageUrl.textContent = truncate(url, 72);
        pageHost.textContent = host || "\u2014";
        setStatus("ready", "Extension active");
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
  document.addEventListener("DOMContentLoaded", () => {
    loadPageInfo();
    refreshBtn.addEventListener("click", loadPageInfo);
  });
})();
