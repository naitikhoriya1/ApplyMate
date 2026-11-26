import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyFormField,
  classifyAllFields,
  extractFieldMetadata,
  normalizeFieldText,
  observeDynamicForms,
} from "../extension/autofill/fieldClassifier.ts";

/**
 * Lightweight DOM element mock supporting all 8 detection signals:
 * name, id, placeholder, label, aria-label, type, autocomplete, and parent/form context.
 */
function createRichMockElement(opts: {
  tagName?: string;
  type?: string;
  name?: string;
  id?: string;
  placeholder?: string;
  ariaLabel?: string;
  autocomplete?: string;
  wrappingLabel?: string;
  previousSiblingText?: string;
  previousSiblingTag?: string;
  parentText?: string;
  formAriaLabel?: string;
  formId?: string;
  fieldsetLegend?: string;
}): HTMLElement {
  const attrs: Record<string, string> = {};
  if (opts.type) attrs["type"] = opts.type;
  if (opts.name) attrs["name"] = opts.name;
  if (opts.id) attrs["id"] = opts.id;
  if (opts.placeholder) attrs["placeholder"] = opts.placeholder;
  if (opts.ariaLabel) attrs["aria-label"] = opts.ariaLabel;
  if (opts.autocomplete) attrs["autocomplete"] = opts.autocomplete;

  const formMock =
    opts.formAriaLabel || opts.formId
      ? {
          id: opts.formId ?? "",
          getAttribute(k: string) {
            if (k === "aria-label") return opts.formAriaLabel ?? null;
            return null;
          },
        }
      : null;

  const fieldsetMock = opts.fieldsetLegend
    ? {
        querySelector(sel: string) {
          if (sel === "legend") return { textContent: opts.fieldsetLegend };
          return null;
        },
      }
    : null;

  const wrappingLabelMock = opts.wrappingLabel
    ? { textContent: opts.wrappingLabel }
    : null;

  const parentMock = opts.parentText
    ? { textContent: opts.parentText }
    : null;

  const prevSibling = opts.previousSiblingText
    ? {
        tagName: opts.previousSiblingTag ?? "LABEL",
        textContent: opts.previousSiblingText,
      }
    : null;

  return {
    tagName: (opts.tagName ?? "INPUT").toUpperCase(),
    type: opts.type ?? "text",
    id: opts.id ?? "",
    name: opts.name ?? "",
    placeholder: opts.placeholder ?? "",
    autocomplete: opts.autocomplete ?? "",
    parentElement: parentMock,
    previousElementSibling: prevSibling,
    getAttribute(attr: string) {
      return attrs[attr] ?? null;
    },
    closest(selector: string) {
      if (selector === "label") return wrappingLabelMock;
      if (selector === "form") return formMock;
      if (selector === "fieldset") return fieldsetMock;
      return null;
    },
    matches(sel: string) {
      const tag = (opts.tagName ?? "INPUT").toLowerCase();
      return sel
        .split(",")
        .map((s) => s.trim())
        .includes(tag);
    },
  } as unknown as HTMLElement;
}

// ─── 1. Normalization ────────────────────────────────────────────────────────

test("normalizeFieldText normalizes camelCase, snake_case, kebab-case, and whitespace", () => {
  assert.strictEqual(normalizeFieldText("firstName"), "first name");
  assert.strictEqual(normalizeFieldText("current_company_name"), "current company name");
  assert.strictEqual(normalizeFieldText("graduation-year"), "graduation year");
  assert.strictEqual(normalizeFieldText("  LinkedIn / Profile  "), "linked in profile");
});

// ─── 2. All 20 Required Field Types ──────────────────────────────────────────

test("Detects all 20 required job application field types", () => {
  const cases: Array<{
    desc: string;
    props: Parameters<typeof createRichMockElement>[0];
    expectedType: string;
  }> = [
    { desc: "First Name", props: { placeholder: "First Name" }, expectedType: "firstName" },
    { desc: "Last Name", props: { placeholder: "Last Name" }, expectedType: "lastName" },
    { desc: "Full Name", props: { placeholder: "Full Name" }, expectedType: "fullName" },
    { desc: "Email", props: { type: "email", placeholder: "Email" }, expectedType: "email" },
    { desc: "Phone", props: { placeholder: "Phone Number" }, expectedType: "phone" },
    { desc: "Mobile Number", props: { placeholder: "Mobile Number" }, expectedType: "phone" },
    { desc: "Current Location", props: { placeholder: "Current Location" }, expectedType: "location" },
    { desc: "City", props: { placeholder: "City" }, expectedType: "city" },
    { desc: "Country", props: { placeholder: "Country" }, expectedType: "country" },
    { desc: "LinkedIn URL", props: { placeholder: "LinkedIn URL" }, expectedType: "linkedin" },
    { desc: "GitHub URL", props: { placeholder: "GitHub URL" }, expectedType: "github" },
    { desc: "Portfolio URL", props: { placeholder: "Portfolio URL" }, expectedType: "portfolio" },
    { desc: "Current Company", props: { placeholder: "Current Company" }, expectedType: "currentCompany" },
    { desc: "Previous Company", props: { placeholder: "Previous Company" }, expectedType: "previousCompany" },
    { desc: "Current Job Title", props: { placeholder: "Current Job Title" }, expectedType: "currentTitle" },
    { desc: "University", props: { placeholder: "University / College" }, expectedType: "educationSchool" },
    { desc: "Degree", props: { placeholder: "Degree" }, expectedType: "educationDegree" },
    { desc: "Graduation Year", props: { placeholder: "Graduation Year" }, expectedType: "educationGradYear" },
    { desc: "Skills", props: { placeholder: "Technical Skills" }, expectedType: "skills" },
    { desc: "Work Experience", props: { placeholder: "Years of Work Experience" }, expectedType: "experience" },
  ];

  for (const c of cases) {
    const el = createRichMockElement(c.props);
    const result = classifyFormField(el);
    assert.ok(result, `Expected classification for ${c.desc}`);
    assert.strictEqual(result.type, c.expectedType, `Mismatch for ${c.desc}`);
    assert.ok(result.confidence >= 0.55, `Low confidence for ${c.desc}: ${result.confidence}`);
  }
});

// ─── 3. All 8 Detection Methods ──────────────────────────────────────────────

test("Detects fields via each of the 8 signal methods", () => {
  // 1. Input name
  const byName = classifyFormField(createRichMockElement({ name: "github_url" }));
  assert.strictEqual(byName?.type, "github");
  assert.strictEqual(byName?.matchedSignal, "name");

  // 2. Input ID
  const byId = classifyFormField(createRichMockElement({ id: "gradYear" }));
  assert.strictEqual(byId?.type, "educationGradYear");
  assert.strictEqual(byId?.matchedSignal, "id");

  // 3. Placeholder
  const byPlaceholder = classifyFormField(createRichMockElement({ placeholder: "Previous Employer" }));
  assert.strictEqual(byPlaceholder?.type, "previousCompany");
  assert.strictEqual(byPlaceholder?.matchedSignal, "placeholder");

  // 4. Associated / wrapping label
  const byLabel = classifyFormField(createRichMockElement({ wrappingLabel: "Current Company" }));
  assert.strictEqual(byLabel?.type, "currentCompany");
  assert.strictEqual(byLabel?.matchedSignal, "label");

  // 5. ARIA label
  const byAria = classifyFormField(createRichMockElement({ ariaLabel: "Portfolio Website" }));
  assert.strictEqual(byAria?.type, "portfolio");
  assert.strictEqual(byAria?.matchedSignal, "label");

  // 6. Input type
  const byType = classifyFormField(createRichMockElement({ type: "tel" }));
  assert.strictEqual(byType?.type, "phone");
  assert.strictEqual(byType?.matchedSignal, "inputType");

  // 7. HTML autocomplete attribute
  const byAutocomplete = classifyFormField(createRichMockElement({ autocomplete: "given-name" }));
  assert.strictEqual(byAutocomplete?.type, "firstName");
  assert.strictEqual(byAutocomplete?.matchedSignal, "autocomplete");

  // 8. Parent form / container context
  const meta = extractFieldMetadata(
    createRichMockElement({
      parentText: "Paste your LinkedIn profile URL",
      formAriaLabel: "Job Application",
      fieldsetLegend: "Social Links",
    })
  );
  assert.ok(meta.contextText.includes("linked in profile url"));
  assert.ok(meta.contextText.includes("social links"));
  assert.ok(meta.contextText.includes("job application"));
  const byContext = classifyFormField(meta.element);
  assert.strictEqual(byContext?.type, "linkedin");
  assert.strictEqual(byContext?.matchedSignal, "context");
});

// ─── 4. Weighted Scoring & Confidence ────────────────────────────────────────

test("Multi-signal fields receive higher confidence than single-signal fields", () => {
  const singleSignal = classifyFormField(createRichMockElement({ id: "email" }));
  const multiSignal = classifyFormField(
    createRichMockElement({
      type: "email",
      autocomplete: "email",
      wrappingLabel: "Email Address",
      placeholder: "you@example.com",
      name: "email",
      id: "email",
    })
  );

  assert.ok(singleSignal && multiSignal);
  assert.ok(
    multiSignal.confidence > singleSignal.confidence,
    `Expected multi (${multiSignal.confidence}) > single (${singleSignal.confidence})`
  );
});

// ─── 5. Ambiguity Detection ──────────────────────────────────────────────────

test("Flags ambiguous fields when multiple rules score closely", () => {
  // autocomplete="organization" alone matches both currentCompany (0.72) and educationSchool (0.68)
  const ambiguousEl = createRichMockElement({ autocomplete: "organization" });
  const result = classifyFormField(ambiguousEl);
  assert.ok(result);
  assert.strictEqual(result.ambiguous, true);
});

// ─── 6. Safety Exclusions & Non-Guessing ─────────────────────────────────────

test("Does not classify generic text inputs as a name or guess unknown fields", () => {
  assert.strictEqual(classifyFormField(createRichMockElement({ placeholder: "Search..." })), null);
  assert.strictEqual(classifyFormField(createRichMockElement({ name: "q", id: "search_box" })), null);
  assert.strictEqual(classifyFormField(createRichMockElement({ name: "custom_field_42" })), null);
  assert.strictEqual(classifyFormField(createRichMockElement({})), null);
});

test("Ignores password, hidden, file, button, and other unsupported input types", () => {
  for (const type of ["password", "hidden", "submit", "reset", "button", "file", "checkbox", "radio", "range", "color"]) {
    const el = createRichMockElement({ type, name: "email", placeholder: "Email" });
    assert.strictEqual(classifyFormField(el), null, `Should ignore input type=${type}`);
  }
});

test("Never identifies sensitive demographic or non-candidate fields", () => {
  const sensitiveInputs = [
    { placeholder: "Age" },
    { placeholder: "Gender" },
    { placeholder: "Race / Ethnicity" },
    { placeholder: "Veteran Status" },
    { placeholder: "Disability Status" },
    { placeholder: "Date of Birth" },
    { name: "marital_status" },
    { name: "ssn" },
    { placeholder: "Aadhaar Number" },
    { placeholder: "Emergency Contact Name" },
    { placeholder: "Reference Name" },
  ];

  for (const props of sensitiveInputs) {
    assert.strictEqual(
      classifyFormField(createRichMockElement(props)),
      null,
      `Must not classify sensitive field: ${JSON.stringify(props)}`
    );
  }
});

// ─── 7. Batch Scanning & Dynamic Form Observation ────────────────────────────

test("classifyAllFields deduplicates by type and keeps highest confidence", () => {
  const lowEmail = createRichMockElement({ id: "email" });
  const highEmail = createRichMockElement({
    type: "email",
    autocomplete: "email",
    wrappingLabel: "Email Address",
  });
  const city = createRichMockElement({ placeholder: "Current City" });

  const mockDoc = {
    querySelectorAll() {
      return [lowEmail, city, highEmail];
    },
  } as unknown as Document;

  const detected = classifyAllFields(mockDoc);
  assert.strictEqual(detected.length, 2);
  const emailEntry = detected.find((d) => d.classification.type === "email");
  assert.ok(emailEntry);
  assert.strictEqual(emailEntry.element, highEmail);
});

test("observeDynamicForms detects newly injected inputs via MutationObserver", () => {
  type MutationCallback = (mutations: Array<{ addedNodes: unknown[] }>) => void;
  let capturedCb: MutationCallback | null = null;
  let observedTarget: unknown = null;

  class MockMutationObserver {
    constructor(cb: MutationCallback) {
      capturedCb = cb;
    }
    observe(target: unknown) {
      observedTarget = target;
    }
    disconnect() {}
  }

  const originalMO = (globalThis as { MutationObserver?: unknown }).MutationObserver;
  const originalNode = (globalThis as { Node?: unknown }).Node;
  (globalThis as { MutationObserver?: unknown }).MutationObserver = MockMutationObserver;
  (globalThis as { Node?: unknown }).Node = { ELEMENT_NODE: 1 };

  try {
    const root = {} as HTMLElement;
    const found: string[] = [];
    observeDynamicForms(root, (field) => {
      found.push(field.classification.type);
    });

    assert.strictEqual(observedTarget, root);
    assert.ok(capturedCb);

    const dynamicInput = Object.assign(
      createRichMockElement({ placeholder: "GitHub Profile URL" }),
      { nodeType: 1, querySelectorAll: () => [] }
    );

    (capturedCb as MutationCallback)([{ addedNodes: [dynamicInput] }]);
    assert.deepStrictEqual(found, ["github"]);
  } finally {
    (globalThis as { MutationObserver?: unknown }).MutationObserver = originalMO;
    (globalThis as { Node?: unknown }).Node = originalNode;
  }
});
