import test from "node:test";
import assert from "node:assert/strict";
import {
  executeAutofill,
  runAutofill,
  resolveValueForField,
  isFieldEmpty,
  PROFILE_STORAGE_KEY,
} from "../extension/autofill/autofillEngine.ts";
import { DEFAULT_PROFILE } from "../src/lib/profile/defaultProfile.ts";
import type { CandidateProfile } from "../src/types/profile.ts";

/**
 * Interactive DOM element simulator for integration testing in Node.
 * Tracks value, selectedIndex, dispatched events, style mutations, and clicks.
 */
class SimElement {
  tagName: string;
  type: string;
  id: string;
  name: string;
  placeholder: string;
  autocomplete: string;
  disabled = false;
  readOnly = false;
  private _value: string;
  options: Array<{ text: string; value: string; disabled?: boolean }>;
  selectedIndex: number;
  style: { outline: string; boxShadow: string; transition: string };
  events: string[] = [];
  clicked = false;
  private attrs: Record<string, string>;

  constructor(opts: {
    tagName?: "INPUT" | "TEXTAREA" | "SELECT" | "BUTTON";
    type?: string;
    id?: string;
    name?: string;
    placeholder?: string;
    ariaLabel?: string;
    autocomplete?: string;
    value?: string;
    options?: Array<{ text: string; value: string; disabled?: boolean }>;
    selectedIndex?: number;
  }) {
    this.tagName = opts.tagName ?? "INPUT";
    this.type = opts.type ?? (this.tagName === "INPUT" ? "text" : "");
    this.id = opts.id ?? "";
    this.name = opts.name ?? "";
    this.placeholder = opts.placeholder ?? "";
    this.autocomplete = opts.autocomplete ?? "";
    this._value = opts.value ?? "";
    this.options = opts.options ?? [];
    this.selectedIndex = opts.selectedIndex ?? 0;
    this.style = { outline: "", boxShadow: "", transition: "" };
    this.attrs = {};
    if (opts.type) this.attrs["type"] = opts.type;
    if (opts.id) this.attrs["id"] = opts.id;
    if (opts.name) this.attrs["name"] = opts.name;
    if (opts.placeholder) this.attrs["placeholder"] = opts.placeholder;
    if (opts.ariaLabel) this.attrs["aria-label"] = opts.ariaLabel;
    if (opts.autocomplete) this.attrs["autocomplete"] = opts.autocomplete;
  }

  get value(): string {
    return this._value;
  }

  set value(v: string) {
    this._value = v;
  }

  getAttribute(k: string): string | null {
    return this.attrs[k] ?? null;
  }

  closest(): null {
    return null;
  }

  dispatchEvent(ev: { type: string }): boolean {
    this.events.push(ev.type);
    return true;
  }

  click(): void {
    this.clicked = true;
  }
}

// Ensure global Event exists in Node for dispatchInputEvents
if (typeof globalThis.Event === "undefined") {
  (globalThis as { Event: unknown }).Event = class MockEvent {
    type: string;
    constructor(type: string) {
      this.type = type;
    }
  };
}

// ─── Unit Tests: Profile Matching & Safety Rules ─────────────────────────────

test("Never fills salary or notice period unless explicitly configured", () => {
  // Default profile has unconfigured placeholders ("Competitive", "Available immediately / 2 weeks")
  assert.strictEqual(resolveValueForField("expectedSalary", DEFAULT_PROFILE), null);
  assert.strictEqual(resolveValueForField("noticePeriod", DEFAULT_PROFILE), null);

  // Explicitly configured values ARE resolved
  const customProfile: CandidateProfile = {
    ...DEFAULT_PROFILE,
    preferences: {
      ...DEFAULT_PROFILE.preferences,
      desiredSalary: "14 LPA",
      noticePeriod: "15 days",
    },
  };
  assert.strictEqual(resolveValueForField("expectedSalary", customProfile), "14 LPA");
  assert.strictEqual(resolveValueForField("noticePeriod", customProfile), "15 days");
});

test("isFieldEmpty accurately distinguishes empty vs user-entered values", () => {
  const emptyInput = new SimElement({ value: "" }) as unknown as HTMLInputElement;
  const whitespaceInput = new SimElement({ value: "   " }) as unknown as HTMLInputElement;
  const filledInput = new SimElement({ value: "User Typed Name" }) as unknown as HTMLInputElement;

  assert.strictEqual(isFieldEmpty(emptyInput), true);
  assert.strictEqual(isFieldEmpty(whitespaceInput), true);
  assert.strictEqual(isFieldEmpty(filledInput), false);

  const placeholderSelect = new SimElement({
    tagName: "SELECT",
    options: [
      { text: "Select Experience", value: "" },
      { text: "Fresher", value: "fresher" },
    ],
    selectedIndex: 0,
  }) as unknown as HTMLSelectElement;
  assert.strictEqual(isFieldEmpty(placeholderSelect), true);

  const chosenSelect = new SimElement({
    tagName: "SELECT",
    options: [
      { text: "Select Experience", value: "" },
      { text: "Fresher", value: "fresher" },
    ],
    selectedIndex: 1,
  }) as unknown as HTMLSelectElement;
  assert.strictEqual(isFieldEmpty(chosenSelect), false);
});

// ─── Integration Tests: Full DOM Autofill Execution ──────────────────────────

test("Integration: fills empty inputs/textarea/select, preserves user values, skips unsafe fields, and reports summary", () => {
  const fullNameEl = new SimElement({ placeholder: "Full Name", name: "full_name" });
  const prefilledEmailEl = new SimElement({
    type: "email",
    placeholder: "Email",
    value: "custom-user@example.com", // user already typed this!
  });
  const bioTextarea = new SimElement({
    tagName: "TEXTAREA",
    placeholder: "Tell us about yourself",
  });
  const expSelect = new SimElement({
    tagName: "SELECT",
    ariaLabel: "Work Experience",
    options: [
      { text: "Select Experience", value: "" },
      { text: "Fresher", value: "fresher" },
      { text: "1-2 Years", value: "1-2" },
    ],
    selectedIndex: 0,
  });
  const unmatchableSelect = new SimElement({
    tagName: "SELECT",
    ariaLabel: "Country",
    options: [
      { text: "Select Country", value: "" },
      { text: "United States", value: "us" },
      { text: "Canada", value: "ca" },
    ],
    selectedIndex: 0,
  });
  const salaryEl = new SimElement({ placeholder: "Expected Salary" });
  const ambiguousOrgEl = new SimElement({ autocomplete: "organization" });
  const passwordEl = new SimElement({ type: "password", name: "password" });
  const genderEl = new SimElement({ placeholder: "Gender" });
  const submitBtn = new SimElement({ tagName: "BUTTON", type: "submit" });

  const mockDoc = {
    querySelectorAll() {
      return [
        fullNameEl,
        prefilledEmailEl,
        bioTextarea,
        expSelect,
        unmatchableSelect,
        salaryEl,
        ambiguousOrgEl,
        passwordEl,
        genderEl,
        submitBtn,
      ];
    },
  } as unknown as Document;

  const result = executeAutofill(DEFAULT_PROFILE, { root: mockDoc });

  // Filled fields
  assert.strictEqual(fullNameEl.value, "Naitik Khoriya");
  assert.deepStrictEqual(fullNameEl.events, ["focus", "input", "change", "blur"]);
  assert.ok(fullNameEl.style.outline.includes("#10b981"), "Should highlight filled input");

  assert.strictEqual(bioTextarea.value, DEFAULT_PROFILE.personal.bio);
  assert.deepStrictEqual(bioTextarea.events, ["focus", "input", "change", "blur"]);

  assert.strictEqual(expSelect.selectedIndex, 2); // "1-2 Years" (9 months -> 1 yr)
  assert.deepStrictEqual(expSelect.events, ["focus", "input", "change", "blur"]);

  // Preserved user-entered value
  assert.strictEqual(prefilledEmailEl.value, "custom-user@example.com");
  assert.strictEqual(prefilledEmailEl.events.length, 0);

  // Safety checks
  assert.strictEqual(salaryEl.value, "");
  assert.strictEqual(ambiguousOrgEl.value, "");
  assert.strictEqual(passwordEl.value, "");
  assert.strictEqual(genderEl.value, "");
  assert.strictEqual(submitBtn.clicked, false);

  // Summary verification
  // Detected: fullName, email, bio, experience, country, expectedSalary, ambiguousOrg = 7
  // Filled: fullName, bio, expSelect = 3
  // Skipped: prefilledEmail, salary (not explicitly configured), ambiguousOrg = 3
  // Failed: unmatchableSelect (India not in [US, Canada]) = 1
  assert.deepStrictEqual(result.summary, {
    detectedFields: 7,
    filledFields: 3,
    skippedFields: 3,
    failedFields: 1,
  });
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.filledCount, 3);
});

test("Integration: React-controlled input prototype setter is invoked", () => {
  let setterCalledWith: string | null = null;

  class ReactControlledInput extends SimElement {
    constructor() {
      super({ placeholder: "LinkedIn Profile URL", name: "linkedin" });
    }
  }

  Object.defineProperty(ReactControlledInput.prototype, "value", {
    set(v: string) {
      setterCalledWith = v;
    },
    get() {
      return "";
    },
    configurable: true,
  });

  const reactInput = new ReactControlledInput();
  const mockDoc = {
    querySelectorAll() {
      return [reactInput];
    },
  } as unknown as Document;

  const result = executeAutofill(DEFAULT_PROFILE, { root: mockDoc });
  assert.strictEqual(result.summary.filledFields, 1);
  assert.strictEqual(setterCalledWith, DEFAULT_PROFILE.social.linkedin);
  assert.ok(reactInput.events.includes("input"));
  assert.ok(reactInput.events.includes("change"));
});

test("Integration: runAutofill retrieves saved profile from browser.storage.local", async () => {
  const customProfile: CandidateProfile = {
    ...DEFAULT_PROFILE,
    personal: {
      ...DEFAULT_PROFILE.personal,
      firstName: "Saved",
      lastName: "Candidate",
    },
    preferences: {
      ...DEFAULT_PROFILE.preferences,
      desiredSalary: "18 LPA",
    },
  };

  const originalBrowser = (globalThis as { browser?: unknown }).browser;
  (globalThis as { browser?: unknown }).browser = {
    storage: {
      local: {
        async get(key: string) {
          assert.strictEqual(key, PROFILE_STORAGE_KEY);
          return { [PROFILE_STORAGE_KEY]: customProfile };
        },
      },
    },
  };

  try {
    const nameEl = new SimElement({ placeholder: "Full Name" });
    const salaryEl = new SimElement({ placeholder: "Expected Salary" });
    const mockDoc = {
      querySelectorAll() {
        return [nameEl, salaryEl];
      },
    } as unknown as Document;

    const result = await runAutofill({ root: mockDoc });
    assert.strictEqual(nameEl.value, "Saved Candidate");
    assert.strictEqual(salaryEl.value, "18 LPA");
    assert.strictEqual(result.summary.filledFields, 2);
  } finally {
    (globalThis as { browser?: unknown }).browser = originalBrowser;
  }
});
