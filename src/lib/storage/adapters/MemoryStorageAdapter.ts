/**
 * MemoryStorageAdapter
 *
 * In-memory implementation of StorageAdapter.
 * Used during SSR, unit tests, or as a secure fallback when neither
 * WebExtension storage nor localStorage is available.
 */

import type { StorageAdapter, StorageType } from "@/types/storage";

export class MemoryStorageAdapter implements StorageAdapter {
  readonly type: StorageType = "memory";
  private store = new Map<string, string>();

  async get<T>(key: string): Promise<T | null> {
    const raw = this.store.get(key);
    if (raw === undefined) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.store.set(key, JSON.stringify(value));
  }

  async remove(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  async getAll(): Promise<Record<string, unknown>> {
    const result: Record<string, unknown> = {};
    for (const [k, v] of this.store.entries()) {
      try {
        result[k] = JSON.parse(v);
      } catch {
        result[k] = v;
      }
    }
    return result;
  }
}

