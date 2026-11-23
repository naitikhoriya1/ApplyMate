/**
 * ApplyMate — Content Script
 *
 * Runs in the context of every HTTPS page (document_idle).
 * Responsibilities:
 *  1. Read the current page title and URL.
 *  2. Report them to the background service worker.
 *  3. Inject the floating ApplyMate button into the DOM.
 *  4. Listen for messages from the background / popup.
 *
 * Safari Note:
 *   Safari supports the WebExtension Messaging API (browser.runtime.*)
 *   identically to Firefox via the global `browser` namespace.
 *   It also exposes `chrome.*` as an alias. We use `browser.*` where
 *   it is available and fall back to `chrome.*` gracefully.
 */

import type { PageInfoMessage, PageInfoPayload, AnyMessage } from "./types";

// ─── Namespace shim ──────────────────────────────────────────────────────────
// Safari 15+ exposes `browser` natively. For environments where only
// `chrome` is available (e.g. bundled Chromium builds for testing),
// we fall back to that namespace. Never assume chrome === browser.
const ext = (typeof browser !== "undefined" ? browser : chrome) as typeof chrome;

// ─── 1. Collect page metadata ────────────────────────────────────────────────
const pageInfo: PageInfoPayload = {
  title: document.title,
  url: location.href,
  host: location.hostname,
  timestamp: Date.now(),
};

console.log(
  `[ApplyMate] Page detected: "${pageInfo.title}" (${pageInfo.host})`
);

// ─── 2. Report to background service worker ───────────────────────────────────
const reportMessage: PageInfoMessage = {
  type: "PAGE_INFO",
  payload: pageInfo,
};

try {
  ext.runtime.sendMessage(reportMessage).catch(() => {
    // Background may not be active on the first inject; silently ignore.
  });
} catch {
  // Extension context invalidated or background not ready.
}

// ─── 3. Listen for messages from background / popup ───────────────────────────
ext.runtime.onMessage.addListener(
  (message: AnyMessage, _sender, sendResponse) => {
    if (message.type === "PAGE_INFO_REQ") {
      sendResponse({ type: "PAGE_INFO_RES", payload: pageInfo });
    }
    // Returning false means we respond synchronously.
    return false;
  }
);

// ─── 4. Inject the floating ApplyMate button ──────────────────────────────────
function injectButton(): void {
  if (document.getElementById("applymate-btn")) return;

  const btn = document.createElement("button");
  btn.id = "applymate-btn";
  btn.setAttribute("aria-label", "ApplyMate autofill assistant");
  btn.title = `ApplyMate — ${pageInfo.title}`;

  btn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
         fill="none" stroke="currentColor" stroke-width="2.5"
         stroke-linecap="round" stroke-linejoin="round"
         aria-hidden="true" focusable="false">
      <rect width="20" height="14" x="2" y="6" rx="2"/>
      <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
    </svg>
    <span>ApplyMate</span>
  `;

  // All styles are inline — zero risk of host page CSS interference.
  Object.assign(btn.style, {
    all: "initial",
    position: "fixed",
    bottom: "20px",
    right: "20px",
    zIndex: "2147483647",
    display: "inline-flex",
    alignItems: "center",
    gap: "7px",
    padding: "10px 18px",
    background: "#2563eb",
    color: "#ffffff",
    border: "none",
    borderRadius: "9999px",
    boxShadow: "0 4px 14px rgba(37, 99, 235, 0.35)",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif",
    letterSpacing: "0.01em",
    userSelect: "none",
    transition: "background 0.15s ease, transform 0.15s ease",
    // Reset any body/global styles
    boxSizing: "border-box",
    lineHeight: "1",
  });

  btn.addEventListener("mouseenter", () => {
    btn.style.background = "#1d4ed8";
    btn.style.transform = "scale(1.04)";
  });
  btn.addEventListener("mouseleave", () => {
    btn.style.background = "#2563eb";
    btn.style.transform = "scale(1)";
  });

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    console.log(
      `[ApplyMate] Button clicked — Page: "${pageInfo.title}" | URL: ${pageInfo.url}`
    );
    // Phase 2: trigger autofill panel here.
  });

  document.body.appendChild(btn);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", injectButton);
} else {
  injectButton();
}

