import test from "node:test";
import assert from "node:assert/strict";
import {
  generateLocalCoverLetter,
  validateCoverLetterRequest,
  generateCoverLetter,
} from "../src/lib/ai/coverLetterGenerator.ts";
import { DEFAULT_PROFILE } from "../src/lib/profile/defaultProfile.ts";

test("Generates personalized cover letter with actual candidate details and no placeholders", () => {
  const res = generateLocalCoverLetter({
    format: "cover_letter",
    profile: DEFAULT_PROFILE,
    jobContext: {
      companyName: "Credit Samadhaan",
      jobTitle: "QA Engineer (Executive)",
      requiredSkills: ["Playwright", "Jest", "TypeScript"],
    },
  });

  assert.strictEqual(res.format, "cover_letter");
  assert.strictEqual(res.mode, "local");
  assert.ok(res.content.includes("Credit Samadhaan"));
  assert.ok(res.content.includes("QA Engineer (Executive)"));
  assert.ok(res.content.includes("Fibe India"));
  assert.ok(res.content.includes("Bikaner Technical University"));
  assert.ok(res.content.includes("Playwright"));

  // Actual contact details in signature
  assert.ok(res.content.includes("Naitik Khoriya"));
  assert.ok(res.content.includes("ethicalkhoriya@gmail.com"));
  assert.ok(res.content.includes("+91 7877816484"));
  assert.ok(res.content.includes("Delhi, India"));

  // No generic placeholders
  assert.ok(!/\[your\s*(name|email|phone|company)\]/i.test(res.content));
});

test("Generates application email with Subject line and full contact signature", () => {
  const res = generateLocalCoverLetter({
    format: "application_email",
    profile: DEFAULT_PROFILE,
    jobContext: {
      companyName: "Fibe India",
      jobTitle: "SDET",
    },
  });

  assert.strictEqual(res.format, "application_email");
  assert.ok(res.subject?.includes("Application for SDET — Naitik Khoriya"));
  assert.ok(res.content.startsWith("Subject: Application for SDET — Naitik Khoriya"));
  assert.ok(res.content.includes("ethicalkhoriya@gmail.com"));
  assert.ok(res.content.includes("+91 7877816484"));
});

test("Regenerate cycles through distinct phrasing variants", () => {
  const v0 = generateLocalCoverLetter({
    format: "cover_letter",
    profile: DEFAULT_PROFILE,
    jobContext: { companyName: "Acme", jobTitle: "SDET" },
    variant: 0,
  });
  const v1 = generateLocalCoverLetter({
    format: "cover_letter",
    profile: DEFAULT_PROFILE,
    jobContext: { companyName: "Acme", jobTitle: "SDET" },
    variant: 1,
  });

  assert.notStrictEqual(v0.content, v1.content);
});

test("validateCoverLetterRequest validates format and profile", () => {
  assert.strictEqual(
    validateCoverLetterRequest({ format: "invalid", profile: DEFAULT_PROFILE }).valid,
    false
  );
  assert.strictEqual(
    validateCoverLetterRequest({ format: "cover_letter", profile: {} }).valid,
    false
  );
  assert.strictEqual(
    validateCoverLetterRequest({ format: "application_email", profile: DEFAULT_PROFILE }).valid,
    true
  );
});

test("generateCoverLetter falls back to local generator when no API key is configured", async () => {
  const orig = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    const res = await generateCoverLetter({
      format: "cover_letter",
      profile: DEFAULT_PROFILE,
      jobContext: { companyName: "Stripe", jobTitle: "QA Engineer" },
    });
    assert.strictEqual(res.mode, "local");
    assert.ok(res.content.includes("Naitik Khoriya"));
  } finally {
    if (orig !== undefined) process.env.OPENAI_API_KEY = orig;
  }
});

