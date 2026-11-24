"use strict";
(() => {
  // extension/src/content.ts
  var ext = typeof browser !== "undefined" ? browser : chrome;
  function getPageInfo() {
    return {
      title: document.title || "(Untitled Page)",
      url: location.href,
      host: location.hostname,
      timestamp: Date.now()
    };
  }
  var lastReportedUrl = "";
  function reportPage() {
    const current = getPageInfo();
    if (current.url === lastReportedUrl && lastReportedUrl !== "") return;
    lastReportedUrl = current.url;
    console.log(
      `[ApplyMate] Page detected: "${current.title}" (${current.host})`
    );
    const msg = {
      type: "PAGE_INFO",
      payload: current
    };
    try {
      ext.runtime.sendMessage(msg).catch(() => {
      });
    } catch {
    }
  }
  reportPage();
  window.addEventListener("popstate", () => setTimeout(reportPage, 100));
  window.addEventListener("hashchange", () => setTimeout(reportPage, 100));
  var titleEl = document.querySelector("title");
  if (titleEl) {
    const titleObserver = new MutationObserver(() => {
      reportPage();
    });
    titleObserver.observe(titleEl, { childList: true, subtree: true, characterData: true });
  }
  ext.runtime.onMessage.addListener(
    (message, _sender, sendResponse) => {
      if (message.type === "PAGE_INFO_REQ") {
        sendResponse({ type: "PAGE_INFO_RES", payload: getPageInfo() });
      }
      return false;
    }
  );
  function injectButton() {
    if (document.getElementById("applymate-btn")) return;
    const btn = document.createElement("button");
    btn.id = "applymate-btn";
    btn.setAttribute("aria-label", "ApplyMate autofill assistant");
    btn.title = `ApplyMate \xB7 Active on ${location.hostname}`;
    btn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
         fill="none" stroke="currentColor" stroke-width="2.5"
         stroke-linecap="round" stroke-linejoin="round"
         aria-hidden="true" focusable="false">
      <rect width="20" height="14" x="2" y="6" rx="2"/>
      <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
    </svg>
    <span>ApplyMate</span>
  `;
    Object.assign(btn.style, {
      all: "initial",
      position: "fixed",
      bottom: "20px",
      right: "20px",
      zIndex: "2147483647",
      display: "inline-flex",
      alignItems: "center",
      gap: "7px",
      padding: "9px 16px",
      background: "#2563eb",
      color: "#ffffff",
      border: "none",
      borderRadius: "9999px",
      boxShadow: "0 4px 14px rgba(37, 99, 235, 0.35)",
      cursor: "pointer",
      fontSize: "12px",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif",
      fontWeight: "600",
      letterSpacing: "-0.01em",
      transition: "transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease",
      userSelect: "none",
      pointerEvents: "auto"
    });
    btn.addEventListener("mouseenter", () => {
      btn.style.transform = "translateY(-1px)";
      btn.style.background = "#1d4ed8";
      btn.style.boxShadow = "0 6px 18px rgba(37, 99, 235, 0.45)";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.transform = "translateY(0)";
      btn.style.background = "#2563eb";
      btn.style.boxShadow = "0 4px 14px rgba(37, 99, 235, 0.35)";
    });
    btn.addEventListener("click", () => {
      const fresh = getPageInfo();
      console.log(`[ApplyMate] Button clicked on "${fresh.title}" (${fresh.url})`);
      btn.style.transform = "scale(0.96)";
      setTimeout(() => {
        btn.style.transform = "translateY(0)";
      }, 150);
      const originalText = btn.innerHTML;
      btn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
           fill="none" stroke="currentColor" stroke-width="2.5"
           stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 6 9 17l-5-5"/>
      </svg>
      <span>Ready \xB7 ${fresh.host}</span>
    `;
      setTimeout(() => {
        btn.innerHTML = originalText;
      }, 2e3);
    });
    if (document.body) {
      document.body.appendChild(btn);
    } else {
      document.addEventListener("DOMContentLoaded", () => {
        document.body?.appendChild(btn);
      });
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectButton);
  } else {
    injectButton();
  }
})();
