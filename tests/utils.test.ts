import test from "node:test";
import assert from "node:assert/strict";
import { validateEmail, truncate, formatMonthYear, cn } from "../src/utils/index.ts";

test("validateEmail accepts valid email formats", () => {
  assert.strictEqual(validateEmail("user@example.com"), true);
  assert.strictEqual(validateEmail("first.last@company.org"), true);
});

test("validateEmail rejects invalid email formats", () => {
  assert.strictEqual(validateEmail("invalid-email"), false);
  assert.strictEqual(validateEmail("missing@domain"), false);
  assert.strictEqual(validateEmail(""), false);
});

test("truncate shortens strings exceeding maxLength", () => {
  assert.strictEqual(truncate("Personal Information", 8), "Personal...");
  assert.strictEqual(truncate("Short", 10), "Short");
});

test("formatMonthYear formats dates correctly", () => {
  assert.strictEqual(formatMonthYear("2024-05-15"), "May 2024");
  assert.strictEqual(formatMonthYear(undefined), "Present");
});

test("cn merges class names properly", () => {
  assert.strictEqual(cn("btn", false, undefined, "btn-primary"), "btn btn-primary");
});

