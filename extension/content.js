"use strict";
// ApplyMate Content Script
// Purpose: Reads and interacts with the current webpage
// 1. Detect webpage and log its title to the browser console
console.log(`[ApplyMate] Webpage detected: "${document.title}" (${window.location.href})`);
// Optional notification to background script
try {
    chrome.runtime.sendMessage({
        type: "WEBPAGE_DETECTED",
        title: document.title,
        url: window.location.href,
    });
}
catch {
    // Background service worker might not be active or listening
}
// 2. Display a small ApplyMate floating button on the webpage
function injectApplyMateButton() {
    // Prevent duplicate injection
    if (document.getElementById("applymate-floating-button")) {
        return;
    }
    const button = document.createElement("button");
    button.id = "applymate-floating-button";
    button.setAttribute("aria-label", "ApplyMate Assistant");
    button.innerHTML = `
    <span style="display: flex; align-items: center; gap: 6px;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
        <rect width="20" height="14" x="2" y="6" rx="2"></rect>
      </svg>
      <span>ApplyMate</span>
    </span>
  `;
    // Apply isolated inline styles to prevent host website CSS interference
    Object.assign(button.style, {
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: "2147483647",
        padding: "10px 16px",
        backgroundColor: "#2563eb",
        color: "#ffffff",
        border: "none",
        borderRadius: "9999px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
        cursor: "pointer",
        fontSize: "13px",
        fontWeight: "600",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        transition: "all 0.2s ease-in-out",
        userSelect: "none",
    });
    button.addEventListener("mouseenter", () => {
        button.style.backgroundColor = "#1d4ed8";
        button.style.transform = "scale(1.05)";
    });
    button.addEventListener("mouseleave", () => {
        button.style.backgroundColor = "#2563eb";
        button.style.transform = "scale(1)";
    });
    button.addEventListener("click", (e) => {
        e.stopPropagation();
        console.log("[ApplyMate] ApplyMate button clicked on:", document.title);
    });
    document.body.appendChild(button);
}
// Inject button once DOM is ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectApplyMateButton);
}
else {
    injectApplyMateButton();
}
