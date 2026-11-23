// ApplyMate Background Service Worker
// Purpose: Handles extension-level events and messaging

chrome.runtime.onInstalled.addListener(() => {
  console.log("[ApplyMate] Extension successfully installed / initialized.");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "WEBPAGE_DETECTED") {
    console.log(
      `[ApplyMate Background] Page detected from tab ${sender.tab?.id ?? "unknown"}:`,
      message.title,
      message.url
    );
    sendResponse({ received: true });
  }
  return true;
});
