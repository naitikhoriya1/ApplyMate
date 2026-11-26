import test from "node:test";
import assert from "node:assert/strict";
import { detectJobPlatform, isSupportedJobSite } from "../extension/src/detector.ts";

test("detectJobPlatform identifies Greenhouse jobs", () => {
  const platform = detectJobPlatform(
    "https://boards.greenhouse.io/figma/jobs/1234567",
    "boards.greenhouse.io"
  );
  assert.strictEqual(platform, "Greenhouse");
});

test("detectJobPlatform identifies Lever jobs", () => {
  const platform = detectJobPlatform(
    "https://jobs.lever.co/stripe/9876543",
    "jobs.lever.co"
  );
  assert.strictEqual(platform, "Lever");
});

test("detectJobPlatform identifies Workday jobs", () => {
  const platform = detectJobPlatform(
    "https://nvidia.myworkdayjobs.com/en-US/NVIDIAExternalCareerSite/job/Software-QA-Engineer_JR123",
    "nvidia.myworkdayjobs.com"
  );
  assert.strictEqual(platform, "Workday");
});

test("detectJobPlatform identifies Ashby jobs", () => {
  const platform = detectJobPlatform(
    "https://jobs.ashbyhq.com/linear/job-qa-automation",
    "jobs.ashbyhq.com"
  );
  assert.strictEqual(platform, "Ashby");
});

test("detectJobPlatform identifies SmartRecruiters jobs", () => {
  const platform = detectJobPlatform(
    "https://jobs.smartrecruiters.com/company/sdet-engineer",
    "jobs.smartrecruiters.com"
  );
  assert.strictEqual(platform, "SmartRecruiters");
});

test("detectJobPlatform identifies generic career URLs", () => {
  const platform = detectJobPlatform(
    "https://example.com/careers/senior-qa-engineer",
    "example.com"
  );
  assert.strictEqual(platform, "Generic Application");
});

test("detectJobPlatform returns None for non-job sites", () => {
  const platform = detectJobPlatform(
    "https://en.wikipedia.org/wiki/Apple_Safari",
    "en.wikipedia.org"
  );
  assert.strictEqual(platform, "None");
});

test("isSupportedJobSite accurately flags supported job domains", () => {
  assert.strictEqual(
    isSupportedJobSite("https://boards.greenhouse.io/job/1", "boards.greenhouse.io"),
    true
  );
  assert.strictEqual(
    isSupportedJobSite("http://localhost:3000", "localhost"),
    true
  );
  assert.strictEqual(
    isSupportedJobSite("https://news.ycombinator.com", "news.ycombinator.com"),
    false
  );
});

