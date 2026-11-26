/**
 * ApplyMate — Profile Storage
 *
 * Reactive storage wrapper for the candidate profile.
 * Backed by ProfileStorageService and the StorageAdapter layer.
 * Uses useSyncExternalStore for hydration-safe React reactivity.
 *
 * Supports browser.storage.local (Safari/WebExtension) and fallback
 * to localStorage (development) / memory (SSR/tests).
 */

import { useSyncExternalStore } from "react";
import type { CandidateProfile } from "@/types/profile";
import { EMPTY_PROFILE } from "../profile/defaultProfile.ts";
import {
  ProfileStorageService,
  defaultStorageService,
  PROFILE_STORAGE_KEY,
  SETUP_COMPLETED_KEY,
} from "./ProfileStorageService.ts";
import { sanitizeProfileData } from "./sanitizer.ts";
import { createStorageAdapter } from "./adapters/index.ts";

export {
  ProfileStorageService,
  defaultStorageService,
  PROFILE_STORAGE_KEY,
  SETUP_COMPLETED_KEY,
  createStorageAdapter,
  sanitizeProfileData,
};

let cachedProfile: CandidateProfile | null = null;
let cachedSetupCompleted: boolean | null = null;
const listeners = new Set<() => void>();

export function loadSetupCompleted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(SETUP_COMPLETED_KEY) === "true";
  } catch {
    return false;
  }
}

export function setSetupCompleted(completed: boolean): void {
  cachedSetupCompleted = completed;
  if (typeof window !== "undefined") {
    try {
      if (completed) {
        localStorage.setItem(SETUP_COMPLETED_KEY, "true");
      } else {
        localStorage.removeItem(SETUP_COMPLETED_KEY);
      }
    } catch {}
  }
  defaultStorageService.markSetupCompleted(completed).catch(() => {});
  notify();
}

export function useSetupCompleted(): [boolean, (completed: boolean) => void] {
  const completed = useSyncExternalStore(
    subscribeProfile,
    () => {
      if (cachedSetupCompleted === null) {
        cachedSetupCompleted = loadSetupCompleted();
      }
      return cachedSetupCompleted;
    },
    () => false
  );
  return [completed, setSetupCompleted];
}

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

/** Synchronously load profile, sanitizing any corrupted/missing keys. */
export function loadProfile(): CandidateProfile {
  if (typeof window === "undefined") return EMPTY_PROFILE;
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return structuredClone(EMPTY_PROFILE);
    const parsed = JSON.parse(raw);
    const sanitized = sanitizeProfileData(parsed);
    return sanitized.profile;
  } catch {
    return structuredClone(EMPTY_PROFILE);
  }
}

/** Persist profile synchronously to cache and adapter. */
export function saveProfile(profile: CandidateProfile): void {
  const updated: CandidateProfile = {
    ...profile,
    updatedAt: new Date().toISOString(),
  };
  cachedProfile = updated;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore quota / private mode
    }
  }
  // Also push to the default service asynchronously
  defaultStorageService.saveProfile(updated).catch(() => {});
  notify();
}

/** Reset profile to clean empty baseline and mark setup incomplete. */
export function resetProfile(): CandidateProfile {
  const fresh = structuredClone(EMPTY_PROFILE);
  fresh.updatedAt = new Date().toISOString();
  cachedProfile = fresh;
  cachedSetupCompleted = false;
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(PROFILE_STORAGE_KEY);
      localStorage.removeItem(SETUP_COMPLETED_KEY);
    } catch {
      // ignore
    }
  }
  defaultStorageService.resetProfile().catch(() => {});
  notify();
  return fresh;
}

/** Delete stored profile entirely and mark setup incomplete. */
export function deleteProfile(): void {
  cachedProfile = structuredClone(EMPTY_PROFILE);
  cachedSetupCompleted = false;
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(PROFILE_STORAGE_KEY);
      localStorage.removeItem(SETUP_COMPLETED_KEY);
    } catch {
      // ignore
    }
  }
  defaultStorageService.deleteProfile().catch(() => {});
  notify();
}

export function subscribeProfile(callback: () => void): () => void {
  listeners.add(callback);
  const handleStorage = (e: StorageEvent) => {
    if (e.key === PROFILE_STORAGE_KEY) {
      cachedProfile = loadProfile();
      callback();
    } else if (e.key === SETUP_COMPLETED_KEY) {
      cachedSetupCompleted = loadSetupCompleted();
      callback();
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", handleStorage);
  }
  const unsubService = defaultStorageService.subscribe((updated) => {
    cachedProfile = updated;
    callback();
  });

  return () => {
    listeners.delete(callback);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", handleStorage);
    }
    unsubService();
  };
}

export function getProfileSnapshot(): CandidateProfile {
  if (!cachedProfile) {
    cachedProfile = loadProfile();
  }
  return cachedProfile;
}

export function getProfileServerSnapshot(): CandidateProfile {
  return EMPTY_PROFILE;
}

/** React hook for accessing and updating the candidate profile. */
export function useProfile(): [CandidateProfile, (next: CandidateProfile) => void] {
  const profile = useSyncExternalStore(
    subscribeProfile,
    getProfileSnapshot,
    getProfileServerSnapshot
  );
  return [profile, saveProfile];
}

/** Compute profile completion percentage (0-100). */
export function computeCompletion(p: CandidateProfile): number {
  const checks: boolean[] = [
    !!p.personal?.firstName,
    !!p.personal?.lastName,
    !!p.personal?.email,
    !!p.personal?.phone,
    !!p.personal?.location,
    !!p.personal?.professionalTitle,
    !!p.personal?.bio,
    !!p.social?.linkedin,
    !!p.social?.github,
    Array.isArray(p.experience) && p.experience.length > 0,
    Array.isArray(p.education) && p.education.length > 0,
    Array.isArray(p.skills) && p.skills.length >= 5,
    !!p.preferences?.workAuthorization,
    !!p.preferences?.noticePeriod,
  ];
  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
}
