/**
 * ApplyMate — Content Script
 *
 * Runs in the context of web pages (document_idle).
 * Responsibilities:
 *  1. Read the current page title, URL, and hostname.
 *  2. Report them to the background service worker.
 *  3. Listen for dynamic SPA navigation / DOM title updates.
 *  4. Inject the floating ApplyMate trigger button into the DOM.
 *  5. Respond to messages from the background service worker / popup.
 *
 * Safari Note:
 *   Safari 15+ supports the WebExtension Messaging API (browser.runtime.*).
 *   We use the global `browser` where available and fall back to `chrome.*`.
 */

import type { PageInfoMessage, PageInfoPayload, AnyMessage } from "./types";

// ─── Namespace shim ──────────────────────────────────────────────────────────
const ext = (typeof browser !== "undefined" ? browser : chrome) as typeof chrome;

/**
 * Returns fresh snapshot of current page metadata.
 */
function getPageInfo(): PageInfoPayload {
  return {
    title: document.title || "(Untitled Page)",
    url: location.href,
    host: location.hostname,
    timestamp: Date.now(),
  };
}

let lastReportedUrl = "";

/**
 * Reports current page details to the background service worker.
 */
function reportPage(): void {
  const current = getPageInfo();
  if (current.url === lastReportedUrl && lastReportedUrl !== "") return;
  lastReportedUrl = current.url;

  console.log(
    `[ApplyMate] Page detected: "${current.title}" (${current.host})`
  );

  const msg: PageInfoMessage = {
    type: "PAGE_INFO",
    payload: current,
  };

  try {
    ext.runtime.sendMessage(msg).catch(() => {
      // Background worker might be idle; silently catch
    });
  } catch {
    // Context invalidated or extension reloaded
  }
}

// ─── 1. Initial Page Detection ────────────────────────────────────────────────
reportPage();

// ─── 2. Handle Dynamic SPA Navigation & Title Updates ─────────────────────────
// Listen for popstate / history navigation
window.addEventListener("popstate", () => setTimeout(reportPage, 100));
window.addEventListener("hashchange", () => setTimeout(reportPage, 100));

// Observe document.title changes in SPAs (React, Next.js, Vue, Angular)
const titleEl = document.querySelector("title");
if (titleEl) {
  const titleObserver = new MutationObserver(() => {
    reportPage();
  });
  titleObserver.observe(titleEl, { childList: true, subtree: true, characterData: true });
}

// ─── 3. Message listener for popup queries ────────────────────────────────────
ext.runtime.onMessage.addListener(
  (message: AnyMessage, _sender, sendResponse) => {
    if (message.type === "PAGE_INFO_REQ") {
      sendResponse({ type: "PAGE_INFO_RES", payload: getPageInfo() });
    }
    return false;
  }
);

// ─── 4. Inject floating ApplyMate indicator button ────────────────────────────
function injectButton(): void {
  if (document.getElementById("applymate-btn")) return;

  const btn = document.createElement("button");
  btn.id = "applymate-btn";
  btn.setAttribute("aria-label", "ApplyMate autofill assistant");
  btn.title = `ApplyMate · Active on ${location.hostname}`;

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

  // Explicit inline styling with all: initial for 100% isolation from host page CSS
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
    pointerEvents: "auto",
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

    // Temporary pulse effect confirming click
    btn.style.transform = "scale(0.96)";
    setTimeout(() => {
      btn.style.transform = "translateY(0)";
    }, 150);

    // Provide user feedback
    const originalText = btn.innerHTML;
    btn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
           fill="none" stroke="currentColor" stroke-width="2.5"
           stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 6 9 17l-5-5"/>
      </svg>
      <span>Ready · ${fresh.host}</span>
    `;

    setTimeout(() => {
      btn.innerHTML = originalText;
    }, 2000);
  });

  // Safe DOM injection
  if (document.body) {
    document.body.appendChild(btn);
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      document.body?.appendChild(btn);
    });
  }
}

// Inject button once page is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", injectButton);
} else {
  injectButton();
}
