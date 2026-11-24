/**
 * ApplyMate — Storage Abstraction Types
 *
 * Defines contracts for storage adapters, storage events, and persistence operations.
 * Works seamlessly across web browsers (localStorage/memory) and Safari WebExtension
 * environments (browser.storage.local).
 */

import type { CandidateProfile, ValidationErrors } from "./profile";

export type StorageType = "extension" | "localStorage" | "memory";

/**
 * StorageAdapter interface
 * Lowest-level key-value persistence interface.
 */
export interface StorageAdapter {
  readonly type: StorageType;
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  getAll?(): Promise<Record<string, unknown>>;
}

/**
 * Result returned by validation checks during storage operations.
 */
export interface ValidationResult {
  valid: boolean;
  errors: {
    personal?: ValidationErrors<CandidateProfile["personal"]>;
    social?: ValidationErrors<CandidateProfile["social"]>;
    experience?: Record<string, ValidationErrors<CandidateProfile["experience"][number]>>;
    education?: Record<string, ValidationErrors<CandidateProfile["education"][number]>>;
    preferences?: ValidationErrors<CandidateProfile["preferences"]>;
    general?: string[];
  };
}

/**
 * Storage migration / sanitization report
 */
export interface SanitizationResult {
  healed: boolean;
  issues: string[];
  profile: CandidateProfile;
}

/**
 * Listener for storage updates across tabs or within application
 */
export type StorageChangeListener = (profile: CandidateProfile) => void;

