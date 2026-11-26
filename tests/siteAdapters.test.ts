import test from "node:test";
import assert from "node:assert/strict";
import { detectJobPlatform } from "../extension/src/detector.ts";
import {
  classifyFieldForPlatform,
  getSiteAdapter,
} from "../extension/autofill/siteAdapters.ts";
import {
  executeAutofill,
  resetAutofillState,
} from "../extension/autofill/autofillEngine.ts";
import { DEFAULT_PROFILE } from "../src/lib/profile/defaultProfile.ts";

function makeSiteEl(opts: {
  tagName?: string;
  type?: string;
  id?: string;
  name?: string;
  placeholder?: string;
  ariaLabel?: string;
  dataAutomationId?: string;
  dataTestId?: string;
  dataTest?: string;
}): HTMLElement {
  const attrs: Record<string, string> = {};
  if (opts.type) attrs["type"] = opts.type;
  if (opts.id) attrs["id"] = opts.id;
  if (opts.name) attrs["name"] = opts.name;
  if (opts.placeholder) attrs["placeholder"] = opts.placeholder;
  if (opts.ariaLabel) attrs["aria-label"] = opts.ariaLabel;
  if (opts.dataAutomationId) attrs["data-automation-id"] = opts.dataAutomationId;
  if (opts.dataTestId) attrs["data-testid"] = opts.dataTestId;
  if (opts.dataTest) attrs["data-test"] = opts.dataTest;

  return {
    tagName: (opts.tagName ?? "INPUT").toUpperCase(),
    type: opts.type ?? "text",
    id: opts.id ?? "",
    name: opts.name ?? "",
    placeholder: opts.placeholder ?? "",
    value: "",
    style: { outline: "", boxShadow: "", transition: "" },
    getAttribute(k: string) {
      return attrs[k] ?? null;
    },
    closest() {
      return null;
    },
    dispatchEvent() {
      return true;
    },
  } as unknown as HTMLElement;
}

test("detectJobPlatform identifies all 7 target platforms + custom career sites", () => {
  assert.strictEqual(
    detectJobPlatform("https://www.linkedin.com/jobs/view/12345", "www.linkedin.com"),
    "LinkedIn"
  );
  assert.strictEqual(
    detectJobPlatform("https://www.naukri.com/job-listings-qa", "www.naukri.com"),
    "Naukri"
  );
  assert.strictEqual(
    detectJobPlatform("https://smartapply.indeed.com/beta/indeedapply/form", "smartapply.indeed.com"),
    "Indeed"
  );
  assert.strictEqual(
    detectJobPlatform("https://boards.greenhouse.io/acme/jobs/123", "boards.greenhouse.io"),
    "Greenhouse"
  );
  assert.strictEqual(
    detectJobPlatform("https://jobs.lever.co/acme/abc", "jobs.lever.co"),
    "Lever"
  );
  assert.strictEqual(
    detectJobPlatform("https://acme.wd5.myworkdayjobs.com/en-US/Careers/job/QA", "acme.wd5.myworkdayjobs.com"),
    "Workday"
  );
  assert.strictEqual(
    detectJobPlatform("https://jobs.smartrecruiters.com/Acme/123", "jobs.smartrecruiters.com"),
    "SmartRecruiters"
  );
  assert.strictEqual(
    detectJobPlatform("https://acme.com/careers/apply", "acme.com"),
    "Generic Application"
  );
});

test("LinkedIn adapter detects Easy Apply fields & flags multi-step", () => {
  assert.strictEqual(getSiteAdapter("LinkedIn").isMultiStep, true);

  const phone = makeSiteEl({ id: "single-line-text-form-component-formElement-urn-li-phoneNumber-nationalNumber" });
  const email = makeSiteEl({ id: "single-line-text-form-component-email" });
  assert.strictEqual(classifyFieldForPlatform(phone, "LinkedIn")?.type, "phone");
  assert.strictEqual(classifyFieldForPlatform(email, "LinkedIn")?.type, "email");
});

test("Naukri adapter detects experience, notice period, CTC, city, and skills", () => {
  assert.strictEqual(getSiteAdapter("Naukri").isMultiStep, true);

  assert.strictEqual(classifyFieldForPlatform(makeSiteEl({ name: "totalExp" }), "Naukri")?.type, "experience");
  assert.strictEqual(classifyFieldForPlatform(makeSiteEl({ name: "noticePeriod" }), "Naukri")?.type, "noticePeriod");
  assert.strictEqual(classifyFieldForPlatform(makeSiteEl({ name: "expectedCtc" }), "Naukri")?.type, "expectedSalary");
  assert.strictEqual(classifyFieldForPlatform(makeSiteEl({ name: "currentLocation" }), "Naukri")?.type, "city");
  assert.strictEqual(classifyFieldForPlatform(makeSiteEl({ name: "keySkills" }), "Naukri")?.type, "skills");
});

test("Indeed adapter detects Indeed Apply data-testid fields", () => {
  assert.strictEqual(getSiteAdapter("Indeed").isMultiStep, true);

  assert.strictEqual(
    classifyFieldForPlatform(makeSiteEl({ dataTestId: "input-applicant.name" }), "Indeed")?.type,
    "fullName"
  );
  assert.strictEqual(
    classifyFieldForPlatform(makeSiteEl({ dataTestId: "input-applicant.email" }), "Indeed")?.type,
    "email"
  );
  assert.strictEqual(
    classifyFieldForPlatform(makeSiteEl({ dataTestId: "input-applicant.phoneNumber" }), "Indeed")?.type,
    "phone"
  );
});

test("Greenhouse adapter detects standard Greenhouse form IDs and falls back to labels", () => {
  assert.strictEqual(classifyFieldForPlatform(makeSiteEl({ id: "first_name" }), "Greenhouse")?.type, "firstName");
  assert.strictEqual(classifyFieldForPlatform(makeSiteEl({ id: "last_name" }), "Greenhouse")?.type, "lastName");
  assert.strictEqual(classifyFieldForPlatform(makeSiteEl({ id: "email" }), "Greenhouse")?.type, "email");
  assert.strictEqual(classifyFieldForPlatform(makeSiteEl({ id: "phone" }), "Greenhouse")?.type, "phone");
  // Generic fallback for custom question
  assert.strictEqual(
    classifyFieldForPlatform(makeSiteEl({ name: "job_application[answers_attributes][0]", ariaLabel: "LinkedIn Profile" }), "Greenhouse")?.type,
    "linkedin"
  );
});

test("Lever adapter detects Lever name/org/urls conventions", () => {
  assert.strictEqual(classifyFieldForPlatform(makeSiteEl({ name: "name" }), "Lever")?.type, "fullName");
  assert.strictEqual(classifyFieldForPlatform(makeSiteEl({ name: "org" }), "Lever")?.type, "currentCompany");
  assert.strictEqual(classifyFieldForPlatform(makeSiteEl({ name: "urls[LinkedIn]" }), "Lever")?.type, "linkedin");
  assert.strictEqual(classifyFieldForPlatform(makeSiteEl({ name: "urls[GitHub]" }), "Lever")?.type, "github");
  assert.strictEqual(classifyFieldForPlatform(makeSiteEl({ name: "urls[Portfolio]" }), "Lever")?.type, "portfolio");
});

test("Workday adapter detects data-automation-id fields & multi-step", () => {
  assert.strictEqual(getSiteAdapter("Workday").isMultiStep, true);

  assert.strictEqual(
    classifyFieldForPlatform(makeSiteEl({ dataAutomationId: "legalNameSection_firstName" }), "Workday")?.type,
    "firstName"
  );
  assert.strictEqual(
    classifyFieldForPlatform(makeSiteEl({ dataAutomationId: "legalNameSection_lastName" }), "Workday")?.type,
    "lastName"
  );
  assert.strictEqual(
    classifyFieldForPlatform(makeSiteEl({ dataAutomationId: "addressSection_city" }), "Workday")?.type,
    "city"
  );
  assert.strictEqual(
    classifyFieldForPlatform(makeSiteEl({ dataAutomationId: "phone-number" }), "Workday")?.type,
    "phone"
  );
});

test("SmartRecruiters adapter detects data-test fields", () => {
  assert.strictEqual(
    classifyFieldForPlatform(makeSiteEl({ dataTest: "first-name-input" }), "SmartRecruiters")?.type,
    "firstName"
  );
  assert.strictEqual(
    classifyFieldForPlatform(makeSiteEl({ dataTest: "last-name-input" }), "SmartRecruiters")?.type,
    "lastName"
  );
});

test("Never autofills CAPTCHA or password fields even with site adapters", () => {
  const captcha = makeSiteEl({ name: "g-recaptcha-response", id: "g-recaptcha-response" });
  const password = makeSiteEl({ type: "password", name: "password" });
  assert.strictEqual(classifyFieldForPlatform(captcha, "Workday"), null);
  assert.strictEqual(classifyFieldForPlatform(password, "LinkedIn"), null);
});

test("Multi-step autofill works across step transitions when state is reset", () => {
  resetAutofillState();

  const step1First = makeSiteEl({ dataAutomationId: "legalNameSection_firstName" });
  const step1Email = makeSiteEl({ dataAutomationId: "email" });
  const step1Doc = { querySelectorAll: () => [step1First, step1Email] } as unknown as Document;

  const res1 = executeAutofill(DEFAULT_PROFILE, { root: step1Doc, platform: "Workday" });
  assert.strictEqual(res1.summary.filledFields, 2);
  assert.strictEqual((step1First as unknown as { value: string }).value, "Naitik");
  assert.strictEqual((step1Email as unknown as { value: string }).value, "ethicalkhoriya@gmail.com");

  // Simulate advancing to Step 2 (triggers resetAutofillState)
  resetAutofillState();
  const step2City = makeSiteEl({ dataAutomationId: "addressSection_city" });
  const step2Doc = { querySelectorAll: () => [step2City] } as unknown as Document;

  const res2 = executeAutofill(DEFAULT_PROFILE, { root: step2Doc, platform: "Workday" });
  assert.strictEqual(res2.summary.filledFields, 1);
  assert.strictEqual((step2City as unknown as { value: string }).value, "Delhi");

  resetAutofillState();
});

