import test from "node:test";
import assert from "node:assert/strict";
import { classifyFormField } from "../extension/autofill/fieldClassifier.ts";
import { resolveValueForField, selectBestOption } from "../extension/autofill/autofillEngine.ts";
import { DEFAULT_PROFILE } from "../src/lib/profile/defaultProfile.ts";

/**
 * Helper to build a mock form element for Node unit tests
 */
function createMockElement(props: {
  type?: string;
  name?: string;
  id?: string;
  placeholder?: string;
  ariaLabel?: string;
  ariaDescription?: string;
  autocomplete?: string;
  previousSiblingText?: string;
  previousSiblingTag?: string;
}) {
  const attributes: Record<string, string> = {};
  if (props.name) attributes["name"] = props.name;
  if (props.ariaLabel) attributes["aria-label"] = props.ariaLabel;
  if (props.ariaDescription) attributes["aria-description"] = props.ariaDescription;
  if (props.autocomplete) attributes["autocomplete"] = props.autocomplete;

  let prevSibling: { tagName: string; textContent: string } | null = null;
  if (props.previousSiblingText) {
    prevSibling = {
      tagName: props.previousSiblingTag || "LABEL",
      textContent: props.previousSiblingText,
    };
  }

  return {
    type: props.type || "text",
    id: props.id || "",
    placeholder: props.placeholder || "",
    getAttribute(attr: string) {
      return attributes[attr] ?? null;
    },
    previousElementSibling: prevSibling,
    closest() {
      return null;
    },
  } as unknown as HTMLElement;
}

test("Classifies Credit Samadhaan form fields accurately from placeholders", () => {
  // 1. Full name
  const nameEl = createMockElement({ placeholder: "Full name", name: "full_name" });
  const nameClass = classifyFormField(nameEl);
  assert.ok(nameClass);
  assert.strictEqual(nameClass.type, "fullName");

  // 2. Mobile number
  const mobileEl = createMockElement({ placeholder: "Mobile number", name: "mobile" });
  const mobileClass = classifyFormField(mobileEl);
  assert.ok(mobileClass);
  assert.strictEqual(mobileClass.type, "phone");

  // 3. Email
  const emailEl = createMockElement({ placeholder: "Email", type: "email" });
  const emailClass = classifyFormField(emailEl);
  assert.ok(emailClass);
  assert.strictEqual(emailClass.type, "email");

  // 4. Current city
  const cityEl = createMockElement({ placeholder: "Current city" });
  const cityClass = classifyFormField(cityEl);
  assert.ok(cityClass);
  assert.strictEqual(cityClass.type, "city");

  // 5. Link to your CV (Google Drive, LinkedIn)
  const cvLinkEl = createMockElement({
    placeholder: "Link to your CV (Google Drive, LinkedIn",
    name: "cv_link",
  });
  const cvLinkClass = classifyFormField(cvLinkEl);
  assert.ok(cvLinkClass);
  assert.strictEqual(cvLinkClass.type, "resumeLink");

  // 6. Tell us a little about yourself
  const bioEl = createMockElement({
    placeholder: "Tell us a little about yourself and why you'd like to join (optional)",
  });
  const bioClass = classifyFormField(bioEl);
  assert.ok(bioClass);
  assert.strictEqual(bioClass.type, "bio");
});

test("Classifies form fields with preceding label/header cues", () => {
  // Position selector
  const positionEl = createMockElement({
    previousSiblingText: "Position",
    previousSiblingTag: "LABEL",
  });
  const posClass = classifyFormField(positionEl);
  assert.ok(posClass);
  assert.strictEqual(posClass.type, "currentTitle");

  // Experience selector
  const expEl = createMockElement({
    previousSiblingText: "Experience",
    previousSiblingTag: "LABEL",
  });
  const expClass = classifyFormField(expEl);
  assert.ok(expClass);
  assert.strictEqual(expClass.type, "experience");
});

test("Classifies standard professional and education fields", () => {
  // LinkedIn
  const linkedinEl = createMockElement({ placeholder: "LinkedIn profile URL" });
  assert.strictEqual(classifyFormField(linkedinEl)?.type, "linkedin");

  // GitHub
  const githubEl = createMockElement({ placeholder: "GitHub profile URL" });
  assert.strictEqual(classifyFormField(githubEl)?.type, "github");

  // Portfolio
  const portfolioEl = createMockElement({ placeholder: "Portfolio / Personal site" });
  assert.strictEqual(classifyFormField(portfolioEl)?.type, "portfolio");

  // University / College
  const collegeEl = createMockElement({ placeholder: "University / College name" });
  assert.strictEqual(classifyFormField(collegeEl)?.type, "educationSchool");

  // Degree
  const degreeEl = createMockElement({ placeholder: "Degree (e.g. B.Tech)" });
  assert.strictEqual(classifyFormField(degreeEl)?.type, "educationDegree");

  // Notice period
  const noticeEl = createMockElement({ placeholder: "Notice period (e.g. Immediate, 15 days)" });
  assert.strictEqual(classifyFormField(noticeEl)?.type, "noticePeriod");
});

test("Ignores non-input and action controls", () => {
  const submitBtn = createMockElement({ type: "submit" });
  assert.strictEqual(classifyFormField(submitBtn), null);

  const buttonEl = createMockElement({ type: "button" });
  assert.strictEqual(classifyFormField(buttonEl), null);

  const hiddenEl = createMockElement({ type: "hidden" });
  assert.strictEqual(classifyFormField(hiddenEl), null);
});

test("Resolves correct candidate profile values for Naitik Khoriya", () => {
  assert.strictEqual(resolveValueForField("fullName", DEFAULT_PROFILE), "Naitik Khoriya");
  assert.strictEqual(resolveValueForField("firstName", DEFAULT_PROFILE), "Naitik");
  assert.strictEqual(resolveValueForField("lastName", DEFAULT_PROFILE), "Khoriya");
  assert.strictEqual(resolveValueForField("email", DEFAULT_PROFILE), "ethicalkhoriya@gmail.com");
  assert.strictEqual(resolveValueForField("phone", DEFAULT_PROFILE), "+91 7877816484");
  assert.strictEqual(resolveValueForField("city", DEFAULT_PROFILE), "Delhi");
  assert.strictEqual(resolveValueForField("country", DEFAULT_PROFILE), "India");
  assert.strictEqual(
    resolveValueForField("currentTitle", DEFAULT_PROFILE),
    "QA Automation Engineer | SDET (Frontend & API)"
  );
  assert.strictEqual(resolveValueForField("educationDegree", DEFAULT_PROFILE), "B.Tech");
  assert.strictEqual(
    resolveValueForField("educationSchool", DEFAULT_PROFILE),
    "Bikaner Technical University"
  );
  assert.strictEqual(resolveValueForField("educationGradYear", DEFAULT_PROFILE), "2025");

  const resumeLink = resolveValueForField("resumeLink", DEFAULT_PROFILE);
  assert.ok(resumeLink && resumeLink.startsWith("https://"));

  const bio = resolveValueForField("bio", DEFAULT_PROFILE);
  assert.ok(bio && bio.length > 20);
});

test("selectBestOption matches dropdown items accurately", () => {
  const mockSelect = {
    options: [
      { text: "Select Experience", value: "" },
      { text: "Fresher / Less than 1 Year", value: "fresher" },
      { text: "1 - 3 Years", value: "1-3" },
      { text: "3 - 5 Years", value: "3-5" },
    ],
    selectedIndex: 0,
  };

  // Exact or keyword match on "1 Year"
  const matched = selectBestOption(mockSelect, "1 - 3 Years");
  assert.strictEqual(matched, true);
  assert.strictEqual(mockSelect.selectedIndex, 2);

  // Substring match on "fresher"
  const matchedFresher = selectBestOption(mockSelect, "Fresher");
  assert.strictEqual(matchedFresher, true);
  assert.strictEqual(mockSelect.selectedIndex, 1);
});
