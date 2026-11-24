import test from "node:test";
import assert from "node:assert/strict";
import { MemoryStorageAdapter } from "../src/lib/storage/adapters/MemoryStorageAdapter.ts";
import { WebExtensionStorageAdapter } from "../src/lib/storage/adapters/WebExtensionStorageAdapter.ts";
import { LocalStorageAdapter } from "../src/lib/storage/adapters/LocalStorageAdapter.ts";
import { createStorageAdapter } from "../src/lib/storage/adapters/index.ts";
import { ProfileStorageService } from "../src/lib/storage/ProfileStorageService.ts";
import { sanitizeProfileData } from "../src/lib/storage/sanitizer.ts";
import {
  validatePreferences,
  validateCandidateProfile,
  isValid,
} from "../src/lib/validation/profileValidation.ts";
import { DEFAULT_PROFILE } from "../src/lib/profile/defaultProfile.ts";
import type { CandidateProfile } from "../src/types/profile.ts";

test("MemoryStorageAdapter handles get, set, remove, clear, and getAll", async () => {
  const adapter = new MemoryStorageAdapter();
  assert.strictEqual(adapter.type, "memory");

  assert.strictEqual(await adapter.get("missing"), null);

  await adapter.set("key1", { hello: "world" });
  assert.deepStrictEqual(await adapter.get("key1"), { hello: "world" });

  const all = await adapter.getAll();
  assert.deepStrictEqual(all, { key1: { hello: "world" } });

  await adapter.remove("key1");
  assert.strictEqual(await adapter.get("key1"), null);

  await adapter.set("a", 1);
  await adapter.set("b", 2);
  await adapter.clear();
  assert.strictEqual(await adapter.get("a"), null);
});

test("LocalStorageAdapter operates with mock window.localStorage", async () => {
  const store = new Map<string, string>();
  const mockLocalStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
    get length() {
      return store.size;
    },
    key: (i: number) => Array.from(store.keys())[i] ?? null,
  };

  (globalThis as unknown as { window: unknown }).window = {
    localStorage: mockLocalStorage,
  };

  const adapter = new LocalStorageAdapter();
  assert.strictEqual(adapter.type, "localStorage");

  await adapter.set("test_key", { user: "Naitik" });
  assert.deepStrictEqual(await adapter.get("test_key"), { user: "Naitik" });

  await adapter.remove("test_key");
  assert.strictEqual(await adapter.get("test_key"), null);

  delete (globalThis as unknown as { window?: unknown }).window;
});

test("WebExtensionStorageAdapter operates with mock browser.storage.local", async () => {
  const store: Record<string, unknown> = {};
  (globalThis as unknown as { browser: unknown }).browser = {
    storage: {
      local: {
        get: async (key: string | null) => {
          if (!key) return { ...store };
          return { [key]: store[key] };
        },
        set: async (items: Record<string, unknown>) => {
          Object.assign(store, items);
        },
        remove: async (key: string) => {
          delete store[key];
        },
        clear: async () => {
          for (const k of Object.keys(store)) delete store[k];
        },
      },
    },
  };

  const adapter = new WebExtensionStorageAdapter();
  assert.strictEqual(adapter.type, "extension");

  await adapter.set("candidate", { name: "Naitik Khoriya" });
  assert.deepStrictEqual(await adapter.get("candidate"), { name: "Naitik Khoriya" });

  await adapter.remove("candidate");
  assert.strictEqual(await adapter.get("candidate"), null);

  delete (globalThis as unknown as { browser?: unknown }).browser;
});

test("createStorageAdapter creates requested or fallback adapter", () => {
  const mem = createStorageAdapter("memory");
  assert.strictEqual(mem.type, "memory");
});

test("sanitizeProfileData heals corrupted and missing data", () => {
  // Completely empty
  const emptyRes = sanitizeProfileData(null);
  assert.strictEqual(emptyRes.healed, true);
  assert.strictEqual(emptyRes.profile.personal.firstName, "Naitik");

  // Partial missing sections
  const partialRes = sanitizeProfileData({
    personal: {
      firstName: "Naitik",
      lastName: "Khoriya",
      // missing email, title, etc.
    },
    // missing social, experience, education, skills, preferences
  });
  assert.strictEqual(partialRes.healed, true);
  assert.strictEqual(partialRes.profile.personal.firstName, "Naitik");
  assert.strictEqual(typeof partialRes.profile.personal.email, "string");
  assert.strictEqual(Array.isArray(partialRes.profile.experience), true);
  assert.strictEqual(Array.isArray(partialRes.profile.skills), true);
  assert.strictEqual(typeof partialRes.profile.preferences.workAuthorization, "string");

  // Corrupted array items
  const corruptedExp = sanitizeProfileData({
    ...DEFAULT_PROFILE,
    experience: ["corrupted", 123, null],
  });
  assert.strictEqual(corruptedExp.healed, true);
  assert.strictEqual(corruptedExp.profile.experience.length, 3);
  assert.strictEqual(typeof corruptedExp.profile.experience[0].id, "string");
});

test("validatePreferences and validateCandidateProfile succeed on valid data", () => {
  const prefErrors = validatePreferences(DEFAULT_PROFILE.preferences);
  assert.strictEqual(isValid(prefErrors), true);

  const fullValidation = validateCandidateProfile(DEFAULT_PROFILE);
  assert.strictEqual(fullValidation.valid, true);
});

test("ProfileStorageService performs full CRUD on profile and sections", async () => {
  const adapter = new MemoryStorageAdapter();
  const service = new ProfileStorageService(adapter);

  // 1. Initial retrieval heals with default
  const initial = await service.getProfile();
  assert.strictEqual(initial.personal.firstName, "Naitik");

  // 2. Update personal
  const updatedP = await service.updatePersonal({ bio: "Updated test bio" });
  assert.strictEqual(updatedP.personal.bio, "Updated test bio");

  // 3. Update preferences
  const updatedPref = await service.updatePreferences({
    noticePeriod: "1 month",
    openToRemote: true,
  });
  assert.strictEqual(updatedPref.preferences.noticePeriod, "1 month");
  assert.strictEqual(updatedPref.preferences.openToRemote, true);

  // 4. Update skills
  const updatedSkills = await service.updateSkills(["Playwright", "Jest", "TypeScript"]);
  assert.deepStrictEqual(updatedSkills.skills, ["Playwright", "Jest", "TypeScript"]);

  // 5. Experience CRUD
  const newExp = {
    id: "test-exp-1",
    company: "Test Corp",
    role: "Automation Lead",
    startDate: "2025-01",
    endDate: "2025-12",
    current: false,
    description: "Built automated test suites",
    skills: ["Jest"],
  };
  await service.addExperience(newExp);
  let current = await service.getProfile();
  assert.strictEqual(current.experience.some((x) => x.id === "test-exp-1"), true);

  await service.updateExperience("test-exp-1", { role: "Principal SDET" });
  current = await service.getProfile();
  assert.strictEqual(current.experience.find((x) => x.id === "test-exp-1")?.role, "Principal SDET");

  await service.deleteExperience("test-exp-1");
  current = await service.getProfile();
  assert.strictEqual(current.experience.some((x) => x.id === "test-exp-1"), false);

  // 6. Education CRUD
  const newEdu = {
    id: "test-edu-1",
    institution: "Test University",
    degree: "M.S.",
    fieldOfStudy: "Software Engineering",
    startDate: "2025-01",
    endDate: "2027-01",
    current: true,
  };
  await service.addEducation(newEdu);
  current = await service.getProfile();
  assert.strictEqual(current.education.some((x) => x.id === "test-edu-1"), true);

  await service.deleteEducation("test-edu-1");
  current = await service.getProfile();
  assert.strictEqual(current.education.some((x) => x.id === "test-edu-1"), false);

  // 7. Reset profile
  const reset = await service.resetProfile();
  assert.strictEqual(reset.personal.bio, DEFAULT_PROFILE.personal.bio);

  // 8. Delete profile
  await service.deleteProfile();
  const deleted = await service.getProfile();
  assert.strictEqual(deleted.personal.firstName, "Naitik"); // recovered with defaults
});

test("ProfileStorageService notifications trigger on updates", async () => {
  const adapter = new MemoryStorageAdapter();
  const service = new ProfileStorageService(adapter);

  let notified = false;
  let receivedProfile: CandidateProfile | null = null;
  const unsubscribe = service.subscribe((p) => {
    notified = true;
    receivedProfile = p;
  });

  await service.updatePersonal({ firstName: "Naitik Updated" });
  assert.strictEqual(notified, true);
  assert.ok(receivedProfile);
  assert.strictEqual((receivedProfile as CandidateProfile).personal.firstName, "Naitik Updated");

  unsubscribe();
  notified = false;
  await service.updatePersonal({ firstName: "Another Update" });
  assert.strictEqual(notified, false);
});

test("ProfileStorageService exports and imports JSON", async () => {
  const adapter = new MemoryStorageAdapter();
  const service = new ProfileStorageService(adapter);

  const exported = await service.exportProfileJson();
  assert.strictEqual(typeof exported, "string");
  const parsed = JSON.parse(exported);
  assert.strictEqual(parsed.personal.firstName, "Naitik");

  // Modify and re-import
  parsed.personal.firstName = "Imported Name";
  const importResult = await service.importProfileJson(JSON.stringify(parsed));
  assert.strictEqual(importResult.success, true);

  const current = await service.getProfile();
  assert.strictEqual(current.personal.firstName, "Imported Name");

  // Invalid JSON
  const badImport = await service.importProfileJson("not-json");
  assert.strictEqual(badImport.success, false);
});
