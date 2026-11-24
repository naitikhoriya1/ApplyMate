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
import { DEFAULT_PROFILE } from "../profile/defaultProfile.ts";
import {
  ProfileStorageService,
  defaultStorageService,
  PROFILE_STORAGE_KEY,
} from "./ProfileStorageService.ts";
import { sanitizeProfileData } from "./sanitizer.ts";
import { createStorageAdapter } from "./adapters/index.ts";

export {
  ProfileStorageService,
  defaultStorageService,
  PROFILE_STORAGE_KEY,
  createStorageAdapter,
  sanitizeProfileData,
};

let cachedProfile: CandidateProfile | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

/** Synchronously load profile, sanitizing any corrupted/missing keys. */
export function loadProfile(): CandidateProfile {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_PROFILE);
    const parsed = JSON.parse(raw);
    const sanitized = sanitizeProfileData(parsed);
    return sanitized.profile;
  } catch {
    return structuredClone(DEFAULT_PROFILE);
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

/** Reset profile to factory defaults. */
export function resetProfile(): CandidateProfile {
  const fresh = structuredClone(DEFAULT_PROFILE);
  fresh.updatedAt = new Date().toISOString();
  cachedProfile = fresh;
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(PROFILE_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
  defaultStorageService.resetProfile().catch(() => {});
  notify();
  return fresh;
}

/** Delete stored profile entirely. */
export function deleteProfile(): void {
  cachedProfile = structuredClone(DEFAULT_PROFILE);
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(PROFILE_STORAGE_KEY);
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
  return DEFAULT_PROFILE;
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
