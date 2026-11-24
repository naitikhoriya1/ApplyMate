/**
 * LocalStorageAdapter
 *
 * Implements StorageAdapter using the browser's window.localStorage.
 * Used for development in Next.js web dashboard when outside the extension runtime.
 */

import type { StorageAdapter, StorageType } from "@/types/storage";

export class LocalStorageAdapter implements StorageAdapter {
  readonly type: StorageType = "localStorage";

  private isAvailable(): boolean {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isAvailable()) return null;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    if (!this.isAvailable()) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn("[ApplyMate LocalStorageAdapter] Failed to set item:", e);
      throw e;
    }
  }

  async remove(key: string): Promise<void> {
    if (!this.isAvailable()) return;
    try {
      window.localStorage.removeItem(key);
    } catch (e) {
      console.warn("[ApplyMate LocalStorageAdapter] Failed to remove item:", e);
    }
  }

  async clear(): Promise<void> {
    if (!this.isAvailable()) return;
    try {
      window.localStorage.clear();
    } catch (e) {
      console.warn("[ApplyMate LocalStorageAdapter] Failed to clear localStorage:", e);
    }
  }

  async getAll(): Promise<Record<string, unknown>> {
    if (!this.isAvailable()) return {};
    const result: Record<string, unknown> = {};
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k) {
        const raw = window.localStorage.getItem(k);
        if (raw !== null) {
          try {
            result[k] = JSON.parse(raw);
          } catch {
            result[k] = raw;
          }
        }
      }
    }
    return result;
  }
}

