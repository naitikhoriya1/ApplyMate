import test from "node:test";
import assert from "node:assert/strict";
import {
  validatePersonal,
  validateSocial,
  validateExperience,
  validateEducation,
  isValid,
} from "../src/lib/validation/profileValidation.ts";
import { computeCompletion } from "../src/lib/storage/profileStorage.ts";
import { DEFAULT_PROFILE } from "../src/lib/profile/defaultProfile.ts";

test("validatePersonal accepts valid personal info", () => {
  const errors = validatePersonal(DEFAULT_PROFILE.personal);
  assert.strictEqual(isValid(errors), true);
  assert.deepStrictEqual(errors, {});
});

test("validatePersonal catches missing required fields", () => {
  const errors = validatePersonal({
    firstName: "",
    lastName: "",
    professionalTitle: "",
    email: "not-an-email",
    phone: "",
    location: "",
    bio: "",
  });
  assert.strictEqual(isValid(errors), false);
  assert.strictEqual(typeof errors.firstName, "string");
  assert.strictEqual(typeof errors.lastName, "string");
  assert.strictEqual(typeof errors.professionalTitle, "string");
  assert.strictEqual(typeof errors.email, "string");
  assert.strictEqual(typeof errors.location, "string");
});

test("validateSocial validates URL structure", () => {
  const valid = validateSocial({
    linkedin: "https://linkedin.com/in/naitik",
    github: "https://github.com/naitik",
    portfolio: "https://naitik.dev",
  });
  assert.strictEqual(isValid(valid), true);

  const invalid = validateSocial({
    linkedin: "linkedin.com/naitik",
    github: "github.com/naitik",
    portfolio: "invalid",
  });
  assert.strictEqual(isValid(invalid), false);
  assert.strictEqual(typeof invalid.linkedin, "string");
  assert.strictEqual(typeof invalid.github, "string");
  assert.strictEqual(typeof invalid.portfolio, "string");
});

test("validateExperience ensures required fields and valid dates", () => {
  const valid = validateExperience(DEFAULT_PROFILE.experience[0]);
  assert.strictEqual(isValid(valid), true);

  const invalid = validateExperience({
    id: "test",
    company: "",
    role: "",
    startDate: "2026-05",
    endDate: "2025-05", // end before start
    current: false,
    description: "",
    skills: [],
  });
  assert.strictEqual(isValid(invalid), false);
  assert.strictEqual(typeof invalid.company, "string");
  assert.strictEqual(typeof invalid.role, "string");
  assert.strictEqual(typeof invalid.endDate, "string");
});

test("validateEducation ensures required fields", () => {
  const valid = validateEducation(DEFAULT_PROFILE.education[0]);
  assert.strictEqual(isValid(valid), true);

  const invalid = validateEducation({
    id: "test",
    institution: "",
    degree: "",
    fieldOfStudy: "",
    startDate: "",
    endDate: "",
    current: false,
  });
  assert.strictEqual(isValid(invalid), false);
  assert.strictEqual(typeof invalid.institution, "string");
  assert.strictEqual(typeof invalid.degree, "string");
});

test("computeCompletion calculates accurate completion score", () => {
  const score = computeCompletion(DEFAULT_PROFILE);
  assert.strictEqual(typeof score, "number");
  assert.strictEqual(score >= 70, true);
});

