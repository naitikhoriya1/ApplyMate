/**
 * ApplyMate — ProfileStorageService
 *
 * High-level candidate profile management service backed by a StorageAdapter.
 * Handles:
 *  - Personal profile, experience, education, skills, social links, preferences
 *  - Slicing and granular partial updates
 *  - Profile deletion / reset
 *  - Data validation before saving
 *  - Data healing and sanitization when reading corrupted/missing data
 *  - Event subscription for cross-component / cross-tab reactivity
 */

import type {
  CandidateProfile,
  PersonalInfo,
  SocialLinks,
  Experience,
  Education,
  ApplicationPreferences,
} from "@/types/profile";
import type {
  StorageAdapter,
  ValidationResult,
  StorageChangeListener,
} from "@/types/storage";
import { createStorageAdapter } from "./adapters/index.ts";
import { sanitizeProfileData } from "./sanitizer.ts";
import { validateCandidateProfile } from "../validation/profileValidation.ts";
import { DEFAULT_PROFILE } from "../profile/defaultProfile.ts";

export const PROFILE_STORAGE_KEY = "applymate_profile";

export class ProfileStorageService {
  private adapter: StorageAdapter;
  private listeners = new Set<StorageChangeListener>();
  private cache: CandidateProfile | null = null;

  constructor(adapter?: StorageAdapter) {
    this.adapter = adapter ?? createStorageAdapter();
  }

  get storageType() {
    return this.adapter.type;
  }

  /**
   * Retrieves the candidate profile.
   * Auto-sanitizes missing or invalid fields against schema.
   */
  async getProfile(): Promise<CandidateProfile> {
    try {
      const raw = await this.adapter.get<unknown>(PROFILE_STORAGE_KEY);
      const sanitized = sanitizeProfileData(raw);

      // If data was corrupted or had missing schema keys, heal storage
      if (sanitized.healed && raw !== null && raw !== undefined) {
        await this.adapter.set(PROFILE_STORAGE_KEY, sanitized.profile);
      }

      this.cache = sanitized.profile;
      return sanitized.profile;
    } catch (e) {
      console.warn("[ProfileStorageService] getProfile error, using default:", e);
      this.cache = structuredClone(DEFAULT_PROFILE);
      return this.cache;
    }
  }

  /**
   * Synchronous cached getter (useful for instant React rendering / useSyncExternalStore).
   */
  getCachedProfile(): CandidateProfile {
    return this.cache ?? structuredClone(DEFAULT_PROFILE);
  }

  /**
   * Validates and persists full candidate profile.
   */
  async saveProfile(profile: CandidateProfile): Promise<ValidationResult> {
    const validation = validateCandidateProfile(profile);

    const updated: CandidateProfile = {
      ...profile,
      updatedAt: new Date().toISOString(),
    };

    await this.adapter.set(PROFILE_STORAGE_KEY, updated);
    this.cache = updated;
    this.notify(updated);

    return validation;
  }

  /**
   * Partial update for personal information.
   */
  async updatePersonal(personal: Partial<PersonalInfo>): Promise<CandidateProfile> {
    const current = await this.getProfile();
    const updated: CandidateProfile = {
      ...current,
      personal: { ...current.personal, ...personal },
    };
    await this.saveProfile(updated);
    return updated;
  }

  /**
   * Partial update for social links.
   */
  async updateSocial(social: Partial<SocialLinks>): Promise<CandidateProfile> {
    const current = await this.getProfile();
    const updated: CandidateProfile = {
      ...current,
      social: { ...current.social, ...social },
    };
    await this.saveProfile(updated);
    return updated;
  }

  /**
   * Partial update for application preferences.
   */
  async updatePreferences(
    preferences: Partial<ApplicationPreferences>
  ): Promise<CandidateProfile> {
    const current = await this.getProfile();
    const updated: CandidateProfile = {
      ...current,
      preferences: { ...current.preferences, ...preferences },
    };
    await this.saveProfile(updated);
    return updated;
  }

  /**
   * Replace skills array.
   */
  async updateSkills(skills: string[]): Promise<CandidateProfile> {
    const current = await this.getProfile();
    const updated: CandidateProfile = {
      ...current,
      skills: Array.from(new Set(skills.map((s) => s.trim()).filter(Boolean))),
    };
    await this.saveProfile(updated);
    return updated;
  }

  /**
   * Experience CRUD operations.
   */
  async addExperience(exp: Experience): Promise<CandidateProfile> {
    const current = await this.getProfile();
    const updated: CandidateProfile = {
      ...current,
      experience: [exp, ...current.experience.filter((x) => x.id !== exp.id)],
    };
    await this.saveProfile(updated);
    return updated;
  }

  async updateExperience(id: string, exp: Partial<Experience>): Promise<CandidateProfile> {
    const current = await this.getProfile();
    const updated: CandidateProfile = {
      ...current,
      experience: current.experience.map((item) =>
        item.id === id ? { ...item, ...exp } : item
      ),
    };
    await this.saveProfile(updated);
    return updated;
  }

  async deleteExperience(id: string): Promise<CandidateProfile> {
    const current = await this.getProfile();
    const updated: CandidateProfile = {
      ...current,
      experience: current.experience.filter((x) => x.id !== id),
    };
    await this.saveProfile(updated);
    return updated;
  }

  /**
   * Education CRUD operations.
   */
  async addEducation(edu: Education): Promise<CandidateProfile> {
    const current = await this.getProfile();
    const updated: CandidateProfile = {
      ...current,
      education: [...current.education.filter((x) => x.id !== edu.id), edu],
    };
    await this.saveProfile(updated);
    return updated;
  }

  async updateEducation(id: string, edu: Partial<Education>): Promise<CandidateProfile> {
    const current = await this.getProfile();
    const updated: CandidateProfile = {
      ...current,
      education: current.education.map((item) =>
        item.id === id ? { ...item, ...edu } : item
      ),
    };
    await this.saveProfile(updated);
    return updated;
  }

  async deleteEducation(id: string): Promise<CandidateProfile> {
    const current = await this.getProfile();
    const updated: CandidateProfile = {
      ...current,
      education: current.education.filter((x) => x.id !== id),
    };
    await this.saveProfile(updated);
    return updated;
  }

  /**
   * Deletes the stored candidate profile entirely.
   */
  async deleteProfile(): Promise<void> {
    await this.adapter.remove(PROFILE_STORAGE_KEY);
    this.cache = null;
    this.notify(structuredClone(DEFAULT_PROFILE));
  }

  /**
   * Resets candidate profile to the default baseline.
   */
  async resetProfile(): Promise<CandidateProfile> {
    const fresh = structuredClone(DEFAULT_PROFILE);
    fresh.updatedAt = new Date().toISOString();
    await this.adapter.set(PROFILE_STORAGE_KEY, fresh);
    this.cache = fresh;
    this.notify(fresh);
    return fresh;
  }

  /**
   * Subscribe to updates.
   */
  subscribe(listener: StorageChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(profile: CandidateProfile) {
    for (const listener of this.listeners) {
      try {
        listener(profile);
      } catch (e) {
        console.error("[ProfileStorageService] error in listener:", e);
      }
    }
  }

  /**
   * Exports profile as portable JSON string.
   */
  async exportProfileJson(): Promise<string> {
    const profile = await this.getProfile();
    return JSON.stringify(profile, null, 2);
  }

  /**
   * Imports and validates profile from JSON string.
   */
  async importProfileJson(
    jsonStr: string
  ): Promise<{ success: boolean; errors?: string[]; profile?: CandidateProfile }> {
    try {
      const parsed = JSON.parse(jsonStr);
      const sanitized = sanitizeProfileData(parsed);
      const validation = validateCandidateProfile(sanitized.profile);
      if (!validation.valid) {
        const errorMsgs: string[] = [];
        if (validation.errors.personal) {
          errorMsgs.push(...Object.values(validation.errors.personal).filter((x): x is string => !!x));
        }
        if (validation.errors.general) {
          errorMsgs.push(...validation.errors.general);
        }
        return { success: false, errors: errorMsgs };
      }
      await this.saveProfile(sanitized.profile);
      return { success: true, profile: sanitized.profile };
    } catch {
      return { success: false, errors: ["Invalid JSON format."] };
    }
  }
}

/** Singleton default service instance */
export const defaultStorageService = new ProfileStorageService();

