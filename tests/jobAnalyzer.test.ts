import test from "node:test";
import assert from "node:assert/strict";
import {
  analyzeJobPage,
  analyzeSelectedText,
  normalizeJobText,
  extractSkillsFromDescription,
  extractExperienceRequirement,
  extractEmploymentType,
} from "../extension/analyzer/jobAnalyzer.ts";

/**
 * Lightweight HTML-like DOM node mock for testing selector-based extraction
 * and noise stripping without external dependencies.
 */
interface MockNode {
  tagName: string;
  textContent: string;
  attrs: Record<string, string>;
  removed?: boolean;
  children?: MockNode[];
  parentNode?: MockNode | null;
  getAttribute(k: string): string | null;
  querySelectorAll(sel: string): MockNode[];
  cloneNode(deep?: boolean): MockNode;
}

function makeMockNode(
  tagName: string,
  textContent: string,
  attrs: Record<string, string> = {},
  noiseChildren: MockNode[] = []
): MockNode {
  const node: MockNode = {
    tagName: tagName.toUpperCase(),
    textContent,
    attrs,
    children: noiseChildren,
    getAttribute(k: string) {
      return this.attrs[k] ?? null;
    },
    querySelectorAll() {
      return this.children ?? [];
    },
    cloneNode() {
      // Simulate stripping noiseChildren from cloned textContent
      let cleanText = textContent;
      for (const child of noiseChildren) {
        cleanText = cleanText.replace(child.textContent, "");
      }
      return makeMockNode(tagName, cleanText, attrs, []);
    },
  };
  for (const child of noiseChildren) {
    child.parentNode = {
      removeChild() {},
    } as unknown as MockNode;
  }
  return node;
}

function makeMockDoc(map: Record<string, MockNode>, title = ""): Document {
  return {
    title,
    body: map["body"] ?? makeMockNode("BODY", ""),
    querySelector(sel: string) {
      return map[sel] ?? null;
    },
    querySelectorAll(sel: string) {
      const match = map[sel];
      return match ? [match] : [];
    },
  } as unknown as Document;
}

test("normalizeJobText cleans whitespace, zero-width chars, and extra newlines", () => {
  const raw = "  Hello\u200B\u00A0World  \r\n\r\n\r\n  Line 2   here ";
  assert.strictEqual(normalizeJobText(raw), "Hello World\n\nLine 2 here");
});

test("Extracts required vs preferred skills without duplication", () => {
  const desc = `
    About the Role:
    We are looking for a QA Automation Engineer.
    Requirements:
    - 2-4 years of experience in test automation
    - Strong TypeScript, Playwright, Jest, and REST APIs
    Preferred Qualifications:
    - Experience with Docker, Kubernetes, and Playwright
  `;
  const { requiredSkills, preferredSkills } = extractSkillsFromDescription(desc);
  assert.ok(requiredSkills.includes("TypeScript"));
  assert.ok(requiredSkills.includes("Playwright"));
  assert.ok(requiredSkills.includes("Jest"));
  assert.ok(requiredSkills.includes("REST APIs"));

  assert.ok(preferredSkills.includes("Docker"));
  assert.ok(preferredSkills.includes("Kubernetes"));
  assert.ok(!preferredSkills.includes("Playwright"), "Should not duplicate required skill in preferred");
});

test("Extracts experience requirements and employment types", () => {
  assert.strictEqual(
    extractExperienceRequirement("Minimum 2-4 years of experience required"),
    "2-4 years"
  );
  assert.strictEqual(
    extractExperienceRequirement("Fresher candidates are welcome"),
    "Fresher / Entry-level"
  );
  assert.strictEqual(extractEmploymentType("This is a Full-time remote role"), "Full-time");
  assert.strictEqual(extractEmploymentType("6 month Internship opportunity"), "Internship");
});

test("LinkedIn adapter extracts job details and strips unrelated navigation/similar-jobs noise", () => {
  const navNoise = makeMockNode("NAV", "Home My Network Jobs Messaging");
  const similarNoise = makeMockNode("ASIDE", "Similar Jobs: React Native at FooCorp");
  const descText = `
    Home My Network Jobs Messaging
    Full-time role in Bengaluru.
    Requirements:
    - 1-3 years of experience in QA Automation
    - Playwright, TypeScript, CI/CD, GitHub
    Preferred Qualifications:
    - AWS, Docker
    Similar Jobs: React Native at FooCorp
  `;

  const doc = makeMockDoc({
    ".job-details-jobs-unified-top-card__job-title h1": makeMockNode("H1", "SDET - Frontend & API"),
    ".job-details-jobs-unified-top-card__company-name a": makeMockNode("A", "Fibe India"),
    ".job-details-jobs-unified-top-card__primary-description-container .tvm__text": makeMockNode("SPAN", "Delhi, India"),
    ".job-details-jobs-unified-top-card__job-insight": makeMockNode("LI", "Full-time"),
    ".jobs-description__content": makeMockNode("DIV", descText, {}, [navNoise, similarNoise]),
  });

  const result = analyzeJobPage({
    doc,
    url: "https://www.linkedin.com/jobs/view/12345",
    host: "www.linkedin.com",
    platform: "LinkedIn",
  });

  assert.strictEqual(result.platform, "LinkedIn");
  assert.strictEqual(result.jobTitle, "SDET - Frontend & API");
  assert.strictEqual(result.companyName, "Fibe India");
  assert.strictEqual(result.location, "Delhi, India");
  assert.strictEqual(result.employmentType, "Full-time");
  assert.strictEqual(result.experienceRequired, "1-3 years");
  assert.ok(result.requiredSkills.includes("Playwright"));
  assert.ok(result.requiredSkills.includes("TypeScript"));
  assert.ok(result.preferredSkills.includes("AWS"));
  assert.ok(!result.jobDescription.includes("My Network Jobs Messaging"));
  assert.ok(!result.jobDescription.includes("Similar Jobs"));
});

test("Greenhouse and Lever adapters extract platform-specific selectors", () => {
  const ghDoc = makeMockDoc({
    ".app-title": makeMockNode("H1", "Software Engineer in Test"),
    ".company-name": makeMockNode("SPAN", "at Stripe"),
    ".location": makeMockNode("DIV", "Remote"),
    "#content": makeMockNode("DIV", "Full-time. 2+ years of experience with Selenium WebDriver and Java."),
  });

  const ghRes = analyzeJobPage({
    doc: ghDoc,
    url: "https://boards.greenhouse.io/stripe/jobs/999",
    host: "boards.greenhouse.io",
    platform: "Greenhouse",
  });
  assert.strictEqual(ghRes.jobTitle, "Software Engineer in Test");
  assert.strictEqual(ghRes.companyName, "at Stripe");
  assert.strictEqual(ghRes.location, "Remote");
  assert.strictEqual(ghRes.employmentType, "Full-time");
  assert.ok(ghRes.requiredSkills.includes("Selenium WebDriver"));
  assert.ok(ghRes.requiredSkills.includes("Java"));

  const leverDoc = makeMockDoc({
    ".posting-headline h2": makeMockNode("H2", "Frontend Developer"),
    "meta[property='og:site_name']": makeMockNode("META", "", { content: "Aigetai" }),
    ".posting-categories .location": makeMockNode("DIV", "Delhi, India"),
    ".posting-categories .commitment": makeMockNode("DIV", "Contract"),
    ".section-wrapper.page-full-width": makeMockNode("DIV", "Build UI using React.js, Next.js, and Tailwind CSS."),
  });

  const leverRes = analyzeJobPage({
    doc: leverDoc,
    url: "https://jobs.lever.co/aigetai/abc",
    host: "jobs.lever.co",
    platform: "Lever",
  });
  assert.strictEqual(leverRes.jobTitle, "Frontend Developer");
  assert.strictEqual(leverRes.companyName, "Aigetai");
  assert.strictEqual(leverRes.location, "Delhi, India");
  assert.strictEqual(leverRes.employmentType, "Contract");
  assert.ok(leverRes.requiredSkills.includes("React.js"));
  assert.ok(leverRes.requiredSkills.includes("Next.js"));
});

test("Generic fallback extracts JSON-LD JobPosting & semantic HTML", () => {
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: "QA Automation Engineer",
    hiringOrganization: { "@type": "Organization", name: "Credit Samadhaan" },
    jobLocation: { address: { addressLocality: "Delhi", addressCountry: "India" } },
    employmentType: "Full-time",
    description: "<p>Need Jest, Node.js, MongoDB, and 1-2 years experience.</p>",
  });

  const doc = makeMockDoc({
    "script[type='application/ld+json']": makeMockNode("SCRIPT", jsonLd),
  });

  const res = analyzeJobPage({
    doc,
    url: "https://creditsamadhaan.com/careers/qa",
    host: "creditsamadhaan.com",
    platform: "Generic Application",
  });

  assert.strictEqual(res.jobTitle, "QA Automation Engineer");
  assert.strictEqual(res.companyName, "Credit Samadhaan");
  assert.strictEqual(res.location, "Delhi, India");
  assert.strictEqual(res.employmentType, "Full-time");
  assert.strictEqual(res.experienceRequired, "1-2 years");
  assert.ok(res.requiredSkills.includes("Jest"));
  assert.ok(res.requiredSkills.includes("Node.js"));
  assert.ok(res.requiredSkills.includes("MongoDB"));
});

test("Manual selection fallback analyzes highlighted text", () => {
  const res = analyzeSelectedText(
    "Internship role. Requirements: React.js, TypeScript, Git. Nice to have: Firebase.",
    { jobTitle: "Frontend Intern", companyName: "Acme" }
  );

  assert.strictEqual(res.usedManualSelection, true);
  assert.strictEqual(res.jobTitle, "Frontend Intern");
  assert.strictEqual(res.companyName, "Acme");
  assert.strictEqual(res.employmentType, "Internship");
  assert.ok(res.requiredSkills.includes("React.js"));
  assert.ok(res.requiredSkills.includes("TypeScript"));
  assert.ok(res.preferredSkills.includes("Firebase"));
});

