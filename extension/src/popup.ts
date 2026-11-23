/**
 * ApplyMate — Popup Script
 *
 * Runs inside extension/popup/popup.html when the user clicks
 * the browser toolbar action button.
 *
 * Responsibilities:
 *  1. Ping the background worker to confirm the extension is alive.
 *  2. Query the background for the active tab's page info.
 *  3. Display the detected URL & title in the popup UI.
 */

import type {
  PageInfoResMessage,
  PongMessage,
} from "./types";

const ext = (typeof browser !== "undefined" ? browser : chrome) as typeof chrome;

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const statusDot = document.getElementById("status-dot")!;
const statusLabel = document.getElementById("status-label")!;
const versionLabel = document.getElementById("version")!;
const pageTitle = document.getElementById("page-title")!;
const pageUrl = document.getElementById("page-url")!;
const pageHost = document.getElementById("page-host")!;
const refreshBtn = document.getElementById("refresh-btn")!;

function setStatus(state: "ready" | "loading" | "error", text: string): void {
  statusDot.className = `status-dot ${state}`;
  statusLabel.textContent = text;
}

function truncate(str: string, max: number): string {
  return str.length <= max ? str : str.slice(0, max - 1) + "…";
}

async function loadPageInfo(): Promise<void> {
  setStatus("loading", "Connecting…");

  // 1. Health check.
  try {
    const pong = await ext.runtime.sendMessage({ type: "PING" }) as PongMessage;
    if (pong?.type === "PONG") {
      versionLabel.textContent = `v${pong.payload?.version ?? "1.0.0"}`;
    }
  } catch {
    setStatus("error", "Extension not responding");
    return;
  }

  // 2. Request active tab page info from background.
  try {
    const res = await ext.runtime.sendMessage({
      type: "PAGE_INFO_REQ",
    }) as PageInfoResMessage;

    if (res?.type === "PAGE_INFO_RES" && res.payload) {
      const { title, url, host } = res.payload;
      pageTitle.textContent = truncate(title || "(no title)", 60);
      pageUrl.textContent = truncate(url, 72);
      pageHost.textContent = host || "—";
      setStatus("ready", "Extension active");
    } else {
      pageTitle.textContent = "No page info available yet.";
      pageUrl.textContent = "Navigate to any HTTPS page to begin.";
      pageHost.textContent = "—";
      setStatus("ready", "Waiting for a page…");
    }
  } catch {
    setStatus("error", "Could not reach background");
  }
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  loadPageInfo();
  refreshBtn.addEventListener("click", loadPageInfo);
});
