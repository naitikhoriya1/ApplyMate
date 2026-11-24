/**
 * Storage Adapters Factory and Environment Detection
 */

import type { StorageAdapter, StorageType } from "@/types/storage";
import { MemoryStorageAdapter } from "./MemoryStorageAdapter.ts";
import { LocalStorageAdapter } from "./LocalStorageAdapter.ts";
import { WebExtensionStorageAdapter } from "./WebExtensionStorageAdapter.ts";

export { MemoryStorageAdapter, LocalStorageAdapter, WebExtensionStorageAdapter };

/**
 * Checks whether WebExtension browser.storage.local or chrome.storage.local is present.
 */
export function isWebExtensionStorageAvailable(): boolean {
  if (typeof browser !== "undefined" && !!browser?.storage?.local) {
    return true;
  }
  if (typeof chrome !== "undefined" && !!chrome?.storage?.local) {
    return true;
  }
  return false;
}

/**
 * Checks whether window.localStorage is accessible.
 */
export function isLocalStorageAvailable(): boolean {
  if (typeof window === "undefined" || !window.localStorage) return false;
  try {
    const testKey = "__applymate_test__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Creates the appropriate StorageAdapter based on environment or explicit preference.
 * Priority:
 *   1. WebExtension storage (if inside Safari / Chrome extension)
 *   2. LocalStorage (if standard web browser dev environment)
 *   3. MemoryStorage (fallback / SSR / headless test)
 */
export function createStorageAdapter(preferred?: StorageType): StorageAdapter {
  if (preferred === "extension" || (!preferred && isWebExtensionStorageAvailable())) {
    return new WebExtensionStorageAdapter();
  }
  if (preferred === "localStorage" || (!preferred && isLocalStorageAvailable())) {
    return new LocalStorageAdapter();
  }
  return new MemoryStorageAdapter();
}

