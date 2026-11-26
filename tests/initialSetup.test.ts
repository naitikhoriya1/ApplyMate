import test from "node:test";
import assert from "node:assert/strict";
import { EMPTY_PROFILE, DEFAULT_PROFILE } from "../src/lib/profile/defaultProfile.ts";
import { ProfileStorageService } from "../src/lib/storage/ProfileStorageService.ts";
import { MemoryStorageAdapter } from "../src/lib/storage/adapters/index.ts";
import {
  extractTextFromPdfBuffer,
  parseResumeTextToProfile,
} from "../src/lib/resume/resumeParser.ts";

test("EMPTY_PROFILE and DEFAULT_PROFILE start completely clean with zero hardcoded user data", () => {
  assert.strictEqual(EMPTY_PROFILE.personal.firstName, "");
  assert.strictEqual(EMPTY_PROFILE.personal.lastName, "");
  assert.strictEqual(EMPTY_PROFILE.personal.email, "");
  assert.strictEqual(EMPTY_PROFILE.personal.phone, "");
  assert.strictEqual(EMPTY_PROFILE.experience.length, 0);
  assert.strictEqual(EMPTY_PROFILE.education.length, 0);
  assert.strictEqual(EMPTY_PROFILE.skills.length, 0);
  assert.deepStrictEqual(DEFAULT_PROFILE, EMPTY_PROFILE);
});

test("setupCompleted state starts false and resets cleanly on deleteProfile/resetProfile", async () => {
  const adapter = new MemoryStorageAdapter();
  const service = new ProfileStorageService(adapter);

  assert.strictEqual(await service.isSetupCompleted(), false);

  await service.markSetupCompleted(true);
  assert.strictEqual(await service.isSetupCompleted(), true);

  await service.deleteProfile();
  assert.strictEqual(await service.isSetupCompleted(), false);

  await service.markSetupCompleted(true);
  await service.resetProfile();
  assert.strictEqual(await service.isSetupCompleted(), false);
});

test("extractTextFromPdfBuffer extracts literal text from uncompressed PDF stream", async () => {
  const minimalPdf = `%PDF-1.4
1 0 obj << /Length 55 >> stream
BT
(Jane Doe) Tj
(jane@example.com) Tj
ET
endstream
endobj
%%EOF`;
  const bytes = new TextEncoder().encode(minimalPdf);
  const extracted = await extractTextFromPdfBuffer(bytes.buffer);
  assert.ok(extracted.includes("Jane Doe"));
  assert.ok(extracted.includes("jane@example.com"));
});

test("parseResumeTextToProfile extracts contact, links, skills, education, and experience", () => {
  const resumeText = `
Jane Doe
Senior QA Engineer
Austin, USA
jane.doe@example.com | +1 555 234 5678
https://linkedin.com/in/janedoe
https://github.com/janedoe
https://janedoe.dev

Summary
Experienced QA engineer focused on Playwright, TypeScript, and CI/CD automation.

Skills
TypeScript, Playwright, Jest, React.js, Node.js, Docker, AWS

Experience
QA Automation Engineer - Acme Systems (2023 - Present)
Built end-to-end Playwright test suites and integrated GitHub Actions CI/CD.

Education
B.Tech in Computer Science at State Technical University (2019 - 2023)
`;

  const parsed = parseResumeTextToProfile(resumeText);
  assert.strictEqual(parsed.personal.firstName, "Jane");
  assert.strictEqual(parsed.personal.lastName, "Doe");
  assert.strictEqual(parsed.personal.professionalTitle, "Senior QA Engineer");
  assert.strictEqual(parsed.personal.email, "jane.doe@example.com");
  assert.strictEqual(parsed.personal.phone, "+1 555 234 5678");
  assert.strictEqual(parsed.personal.location, "Austin, USA");
  assert.strictEqual(parsed.social.linkedin, "https://linkedin.com/in/janedoe");
  assert.strictEqual(parsed.social.github, "https://github.com/janedoe");
  assert.strictEqual(parsed.social.portfolio, "https://janedoe.dev");

  assert.ok(parsed.skills.includes("TypeScript"));
  assert.ok(parsed.skills.includes("Playwright"));
  assert.ok(parsed.skills.includes("Docker"));

  assert.strictEqual(parsed.education.length, 1);
  assert.strictEqual(parsed.education[0].degree, "B.Tech");
  assert.ok(parsed.education[0].institution.includes("State Technical University"));

  assert.strictEqual(parsed.experience.length, 1);
  assert.strictEqual(parsed.experience[0].role, "QA Automation Engineer");
  assert.strictEqual(parsed.experience[0].company, "Acme Systems");
  assert.strictEqual(parsed.experience[0].current, true);
});

