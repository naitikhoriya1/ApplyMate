/**
 * WebExtensionStorageAdapter
 *
 * Implements StorageAdapter backed by browser.storage.local (Safari/Firefox)
 * or chrome.storage.local (Chromium fallback).
 *
 * This provides the authoritative storage engine for the ApplyMate
 * browser extension.
 */

import type { StorageAdapter, StorageType } from "@/types/storage";

interface WebExtensionStorageArea {
  get(keys?: string | string[] | Record<string, unknown> | null): Promise<Record<string, unknown>>;
  get(keys: string | string[] | Record<string, unknown> | null, callback: (items: Record<string, unknown>) => void): void;
  set(items: Record<string, unknown>): Promise<void>;
  set(items: Record<string, unknown>, callback?: () => void): void;
  remove(keys: string | string[]): Promise<void>;
  remove(keys: string | string[], callback?: () => void): void;
  clear(): Promise<void>;
  clear(callback?: () => void): void;
}

export class WebExtensionStorageAdapter implements StorageAdapter {
  readonly type: StorageType = "extension";

  private getStorageArea(): WebExtensionStorageArea | null {
    // Safari 15+ and Firefox expose `browser.storage.local`
    // Chromium / Chrome exposes `chrome.storage.local`
    if (typeof browser !== "undefined" && browser?.storage?.local) {
      return browser.storage.local as unknown as WebExtensionStorageArea;
    }
    if (typeof chrome !== "undefined" && chrome?.storage?.local) {
      return chrome.storage.local as unknown as WebExtensionStorageArea;
    }
    return null;
  }

  async get<T>(key: string): Promise<T | null> {
    const area = this.getStorageArea();
    if (!area) return null;

    try {
      // Modern WebExtension API returns a Promise
      const res = area.get(key);
      if (res && typeof (res as Promise<unknown>).then === "function") {
        const items = await res;
        return (items?.[key] as T) ?? null;
      }

      // Callback fallback if promise wasn't returned
      return new Promise<T | null>((resolve) => {
        area.get(key, (items: Record<string, unknown>) => {
          resolve((items?.[key] as T) ?? null);
        });
      });
    } catch (e) {
      console.warn("[ApplyMate WebExtensionStorageAdapter] get failed:", e);
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    const area = this.getStorageArea();
    if (!area) {
      throw new Error("WebExtension storage is not available in this environment.");
    }

    const payload = { [key]: value };
    const res = area.set(payload);
    if (res && typeof (res as Promise<unknown>).then === "function") {
      await res;
      return;
    }

    return new Promise<void>((resolve, reject) => {
      area.set(payload, () => {
        const err = (typeof chrome !== "undefined" ? chrome?.runtime?.lastError : undefined);
        if (err) reject(new Error(err.message));
        else resolve();
      });
    });
  }

  async remove(key: string): Promise<void> {
    const area = this.getStorageArea();
    if (!area) return;

    const res = area.remove(key);
    if (res && typeof (res as Promise<unknown>).then === "function") {
      await res;
      return;
    }

    return new Promise<void>((resolve, reject) => {
      area.remove(key, () => {
        const err = (typeof chrome !== "undefined" ? chrome?.runtime?.lastError : undefined);
        if (err) reject(new Error(err.message));
        else resolve();
      });
    });
  }

  async clear(): Promise<void> {
    const area = this.getStorageArea();
    if (!area) return;

    const res = area.clear();
    if (res && typeof (res as Promise<unknown>).then === "function") {
      await res;
      return;
    }

    return new Promise<void>((resolve, reject) => {
      area.clear(() => {
        const err = (typeof chrome !== "undefined" ? chrome?.runtime?.lastError : undefined);
        if (err) reject(new Error(err.message));
        else resolve();
      });
    });
  }

  async getAll(): Promise<Record<string, unknown>> {
    const area = this.getStorageArea();
    if (!area) return {};

    const res = area.get(null);
    if (res && typeof (res as Promise<unknown>).then === "function") {
      return (await res) ?? {};
    }

    return new Promise<Record<string, unknown>>((resolve) => {
      area.get(null, (items: Record<string, unknown>) => {
        resolve(items ?? {});
      });
    });
  }
}

