/**
 * ApplyMate — Job Description Analyzer (Deterministic, Zero-AI)
 *
 * Extracts structured job metadata from the active job listing DOM:
 *  - Company name
 *  - Job title
 *  - Job description (excluding nav, footer, sidebar, and unrelated page noise)
 *  - Required technical skills
 *  - Preferred technical skills
 *  - Experience requirements
 *  - Location
 *  - Employment type
 *
 * Supports:
 *  - Configurable per-site extraction adapters (LinkedIn, Naukri, Indeed,
 *    Greenhouse, Lever, Workday, SmartRecruiters)
 *  - JSON-LD JobPosting schema + generic semantic DOM fallback
 *  - Manual selection fallback (`analyzeSelectedText`)
 */

import type { JobAnalysisResult, JobPlatform } from "../src/types.ts";
import { detectJobPlatform } from "../src/detector.ts";

// ─────────────────────────────────────────────────────────────────────────────
// 1. Text Normalization & Noise Stripping
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalizes extracted text: strips zero-width characters, converts non-breaking
 * spaces, trims trailing spaces per line, and collapses 3+ newlines into 2.
 */
export function normalizeJobText(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const NOISE_SELECTOR =
  "nav, header, footer, aside, script, style, noscript, [role='navigation'], [aria-hidden='true'], .similar-jobs, .related-jobs, .cookie-banner";

/**
 * Extracts clean text from a DOM element while stripping unrelated boilerplate
 * (navigation bars, footers, sidebars, scripts, and related-job widgets).
 */
export function extractCleanText(el: Element | null | undefined): string {
  if (!el) return "";
  if (typeof el.cloneNode === "function") {
    const clone = el.cloneNode(true) as Element;
    clone.querySelectorAll?.(NOISE_SELECTOR).forEach((n) => n.parentNode?.removeChild(n));
    return normalizeJobText(clone.textContent ?? "");
  }
  return normalizeJobText(el.textContent ?? "");
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Configurable Site Extraction Adapters
// ─────────────────────────────────────────────────────────────────────────────

export interface JobSiteExtractionConfig {
  platform: JobPlatform;
  titleSelectors: string[];
  companySelectors: string[];
  locationSelectors: string[];
  employmentTypeSelectors: string[];
  descriptionSelectors: string[];
}

export const JOB_EXTRACTION_ADAPTERS: Partial<Record<JobPlatform, JobSiteExtractionConfig>> = {
  LinkedIn: {
    platform: "LinkedIn",
    titleSelectors: [
      ".job-details-jobs-unified-top-card__job-title h1",
      ".job-details-jobs-unified-top-card__job-title",
      ".jobs-unified-top-card__job-title",
      "h1",
    ],
    companySelectors: [
      ".job-details-jobs-unified-top-card__company-name a",
      ".job-details-jobs-unified-top-card__company-name",
      ".jobs-unified-top-card__company-name",
    ],
    locationSelectors: [
      ".job-details-jobs-unified-top-card__primary-description-container .tvm__text",
      ".jobs-unified-top-card__bullet",
    ],
    employmentTypeSelectors: [
      ".job-details-jobs-unified-top-card__job-insight",
      ".jobs-unified-top-card__job-insight",
    ],
    descriptionSelectors: [
      ".jobs-description__content",
      ".jobs-description-content__text",
      "#job-details",
    ],
  },

  Naukri: {
    platform: "Naukri",
    titleSelectors: [".jd-header-title", "h1.jd-header-title", "h1"],
    companySelectors: [".jd-header-comp-name a", ".jd-header-comp-name"],
    locationSelectors: [".location", ".loc a", "[class*='location']"],
    employmentTypeSelectors: [".employment-type", ".other-details"],
    descriptionSelectors: [".job-desc", ".dang-inner-html", "section.job-desc"],
  },

  Indeed: {
    platform: "Indeed",
    titleSelectors: [
      "[data-testid='jobsearch-JobInfoHeader-title']",
      "h1.jobsearch-JobInfoHeader-title",
      "h1",
    ],
    companySelectors: [
      "[data-testid='inlineHeader-companyName'] a",
      "[data-testid='inlineHeader-companyName']",
      "[data-company-name='true']",
    ],
    locationSelectors: [
      "[data-testid='inlineHeader-companyLocation']",
      "[data-testid='job-location']",
    ],
    employmentTypeSelectors: [
      "[data-testid='jobsearch-OtherJobDetailsContainer']",
      "#salaryInfoAndJobType",
    ],
    descriptionSelectors: ["#jobDescriptionText", ".jobsearch-jobDescriptionText"],
  },

  Greenhouse: {
    platform: "Greenhouse",
    titleSelectors: [".app-title", "h1.app-title", "h1"],
    companySelectors: [".company-name", "span.company-name"],
    locationSelectors: [".location", "div.location"],
    employmentTypeSelectors: [".employment-type"],
    descriptionSelectors: ["#content", "#main .body", ".job-post-content"],
  },

  Lever: {
    platform: "Lever",
    titleSelectors: [".posting-headline h2", ".posting-headline h1", "h1"],
    companySelectors: [".main-header-logo img[alt]", "meta[property='og:site_name']"],
    locationSelectors: [".posting-categories .location"],
    employmentTypeSelectors: [".posting-categories .commitment"],
    descriptionSelectors: [".section-wrapper.page-full-width", ".posting-requirements", "main"],
  },

  Workday: {
    platform: "Workday",
    titleSelectors: ["[data-automation-id='jobPostingHeader'] h2", "h2[data-automation-id='jobPostingTitle']", "h1"],
    companySelectors: ["meta[property='og:site_name']"],
    locationSelectors: ["[data-automation-id='locations'] dd", "[data-automation-id='locations']"],
    employmentTypeSelectors: ["[data-automation-id='time'] dd", "[data-automation-id='time']"],
    descriptionSelectors: ["[data-automation-id='jobPostingDescription']"],
  },

  SmartRecruiters: {
    platform: "SmartRecruiters",
    titleSelectors: ["h1.job-title", "[data-test='job-title']", "h1"],
    companySelectors: [".company-name", "[data-test='company-name']"],
    locationSelectors: [".job-location", "[data-test='job-location']"],
    employmentTypeSelectors: [".employment-type", "[data-test='employment-type']"],
    descriptionSelectors: [".job-sections", "[data-test='job-description']", "main"],
  },
};

function queryFirstText(doc: Document, selectors: string[]): string {
  for (const sel of selectors) {
    try {
      const el = doc.querySelector?.(sel);
      if (!el) continue;
      if (el.tagName?.toUpperCase() === "META") {
        const content = el.getAttribute("content") ?? "";
        if (content.trim()) return normalizeJobText(content);
      }
      if (el.tagName?.toUpperCase() === "IMG") {
        const alt = el.getAttribute("alt") ?? "";
        if (alt.trim()) return normalizeJobText(alt);
      }
      const txt = normalizeJobText(el.textContent ?? "");
      if (txt) return txt;
    } catch {
      // Skip invalid selector in mock environments
    }
  }
  return "";
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Skill, Experience, & Employment Type Extraction
// ─────────────────────────────────────────────────────────────────────────────

interface SkillEntry {
  canonical: string;
  pattern: RegExp;
}

const TECHNICAL_SKILLS: SkillEntry[] = [
  { canonical: "TypeScript", pattern: /\btypescript\b/i },
  { canonical: "JavaScript", pattern: /\b(javascript|ecmascript)\b/i },
  { canonical: "React.js", pattern: /\breact(\.js|js)?\b/i },
  { canonical: "React Testing Library", pattern: /\breact\s*testing\s*library\b/i },
  { canonical: "Next.js", pattern: /\bnext(\.js|js)\b/i },
  { canonical: "Node.js", pattern: /\bnode(\.js|js)\b/i },
  { canonical: "Express.js", pattern: /\bexpress(\.js|js)?\b/i },
  { canonical: "Playwright", pattern: /\bplaywright\b/i },
  { canonical: "Selenium WebDriver", pattern: /\bselenium(\s*webdriver)?\b/i },
  { canonical: "Cypress", pattern: /\bcypress\b/i },
  { canonical: "Jest", pattern: /\bjest\b/i },
  { canonical: "C++", pattern: /\bc\+\+/i },
  { canonical: "Python", pattern: /\bpython\b/i },
  { canonical: "Java", pattern: /\bjava\b(?!script)/i },
  { canonical: "Go", pattern: /\bgolang\b/i },
  { canonical: "REST APIs", pattern: /\brest(\s*apis?|ful\s*apis?)\b/i },
  { canonical: "GraphQL", pattern: /\bgraphql\b/i },
  { canonical: "Postman", pattern: /\bpostman\b/i },
  { canonical: "MongoDB", pattern: /\bmongodb\b/i },
  { canonical: "PostgreSQL", pattern: /\bpostgres(ql)?\b/i },
  { canonical: "MySQL", pattern: /\bmysql\b/i },
  { canonical: "SQL", pattern: /\bsql\b/i },
  { canonical: "Firebase", pattern: /\bfirebase\b/i },
  { canonical: "Git", pattern: /\bgit\b(?!hub)/i },
  { canonical: "GitHub", pattern: /\bgithub\b/i },
  { canonical: "CI/CD", pattern: /\bci\s*\/\s*cd\b/i },
  { canonical: "Docker", pattern: /\bdocker\b/i },
  { canonical: "Kubernetes", pattern: /\bkubernetes\b/i },
  { canonical: "AWS", pattern: /\baws\b|amazon\s*web\s*services/i },
  { canonical: "HTML", pattern: /\bhtml5?\b/i },
  { canonical: "CSS", pattern: /\bcss3?\b/i },
  { canonical: "Tailwind CSS", pattern: /\btailwind(\s*css)?\b/i },
  { canonical: "Agile/Scrum", pattern: /\b(agile|scrum)\b/i },
  { canonical: "Test Automation", pattern: /\btest\s*automation\b/i },
  { canonical: "Regression Testing", pattern: /\bregression\s*testing\b/i },
  { canonical: "API Testing", pattern: /\bapi\s*testing\b/i },
];

function matchSkillsInText(text: string): string[] {
  const found: string[] = [];
  for (const skill of TECHNICAL_SKILLS) {
    if (skill.pattern.test(text) && !found.includes(skill.canonical)) {
      found.push(skill.canonical);
    }
  }
  return found;
}

/**
 * Splits job description text into Required vs Preferred sections when headings
 * are present, and extracts skills without duplicating them across both lists.
 */
export function extractSkillsFromDescription(description: string): {
  requiredSkills: string[];
  preferredSkills: string[];
} {
  if (!description) return { requiredSkills: [], preferredSkills: [] };

  const preferredMarker =
    /(?:^|\n|\.\s+)\s*(?:preferred\s*(?:qualifications|skills|requirements)?|nice\s*to\s*have|bonus(?:\s*points)?|good\s*to\s*have|plus)\s*:?\s*(?:\n|\s+)/i;

  const match = preferredMarker.exec(description);
  if (!match) {
    return {
      requiredSkills: matchSkillsInText(description),
      preferredSkills: [],
    };
  }

  const requiredSection = description.slice(0, match.index);
  const preferredSection = description.slice(match.index);

  const requiredSkills = matchSkillsInText(requiredSection);
  const preferredSkills = matchSkillsInText(preferredSection).filter(
    (s) => !requiredSkills.includes(s)
  );

  return { requiredSkills, preferredSkills };
}

/**
 * Extracts experience requirements (e.g. "2-4 years", "1+ years", "Fresher").
 */
export function extractExperienceRequirement(text: string): string {
  if (!text) return "";

  const rangeMatch = text.match(
    /\b(\d+\s*[-–to]+\s*\d+\s*(?:years?|yrs?))(?:\s*of\s*experience)?\b/i
  );
  if (rangeMatch) return normalizeJobText(rangeMatch[1]);

  const plusMatch = text.match(
    /\b(\d+\s*\+?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:relevant\s*|work\s*)?experience)\b/i
  );
  if (plusMatch) return normalizeJobText(plusMatch[1]);

  if (/\b(fresher|entry[\s-]level|0\s*[-–]\s*1\s*years?)\b/i.test(text)) {
    return "Fresher / Entry-level";
  }

  return "";
}

/**
 * Extracts employment type (Full-time, Part-time, Internship, Contract, Freelance).
 */
export function extractEmploymentType(text: string, hint = ""): string {
  const combined = `${hint}\n${text}`;
  if (/\bfull[\s-]?time\b/i.test(combined)) return "Full-time";
  if (/\bpart[\s-]?time\b/i.test(combined)) return "Part-time";
  if (/\bintern(ship)?\b/i.test(combined)) return "Internship";
  if (/\bcontract(or)?\b/i.test(combined)) return "Contract";
  if (/\bfreelance\b/i.test(combined)) return "Freelance";
  return "";
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. JSON-LD & Generic Fallback Extraction
// ─────────────────────────────────────────────────────────────────────────────

interface JsonLdJobData {
  title?: string;
  company?: string;
  location?: string;
  employmentType?: string;
  description?: string;
}

function readJsonLdJobPosting(doc: Document): JsonLdJobData {
  try {
    const scripts = Array.from(
      doc.querySelectorAll?.("script[type='application/ld+json']") ?? []
    );
    for (const s of scripts) {
      const raw = s.textContent ?? "";
      if (!raw.includes("JobPosting")) continue;
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (item && item["@type"] === "JobPosting") {
          const org = item.hiringOrganization as { name?: string } | undefined;
          const loc = item.jobLocation as
            | { address?: { addressLocality?: string; addressCountry?: string } }
            | undefined;
          const city = loc?.address?.addressLocality ?? "";
          const country = loc?.address?.addressCountry ?? "";
          return {
            title: typeof item.title === "string" ? item.title : undefined,
            company: typeof org?.name === "string" ? org.name : undefined,
            location: [city, country].filter(Boolean).join(", ") || undefined,
            employmentType:
              typeof item.employmentType === "string" ? item.employmentType : undefined,
            description:
              typeof item.description === "string"
                ? normalizeJobText(item.description.replace(/<[^>]+>/g, " "))
                : undefined,
          };
        }
      }
    }
  } catch {
    // Ignore malformed JSON-LD
  }
  return {};
}

function extractGenericTitle(doc: Document): string {
  const h1 = queryFirstText(doc, ["main h1", "article h1", "h1"]);
  if (h1) return h1;
  const ogTitle = queryFirstText(doc, ["meta[property='og:title']"]);
  if (ogTitle) return ogTitle;
  return normalizeJobText(doc.title ?? "");
}

function extractGenericCompany(doc: Document, host: string): string {
  const metaCompany = queryFirstText(doc, [
    "meta[property='og:site_name']",
    "[class*='company']",
    "[data-company]",
  ]);
  if (metaCompany) return metaCompany;
  if (host) {
    const clean = host.replace(/^www\./, "").split(".")[0];
    return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : "";
  }
  return "";
}

function extractGenericDescription(doc: Document): string {
  const candidates = [
    "[class*='job-description']",
    "[id*='job-description']",
    "[class*='description']",
    "article",
    "main",
    "[role='main']",
  ];

  for (const sel of candidates) {
    try {
      const el = doc.querySelector?.(sel);
      const text = extractCleanText(el);
      if (text.length >= 60) return text;
    } catch {
      // Ignore selector error
    }
  }

  return extractCleanText(doc.body);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Public Analyzer Entry Points
// ─────────────────────────────────────────────────────────────────────────────

export interface AnalyzeJobOptions {
  doc?: Document;
  url?: string;
  host?: string;
  platform?: JobPlatform;
}

/**
 * Extracts and analyzes the job listing from `doc` (defaults to `document`).
 */
export function analyzeJobPage(options: AnalyzeJobOptions = {}): JobAnalysisResult {
  const doc = options.doc ?? (typeof document !== "undefined" ? document : ({} as Document));
  const url = options.url ?? (typeof location !== "undefined" ? location.href : "");
  const host = options.host ?? (typeof location !== "undefined" ? location.hostname : "");
  const platform = options.platform ?? detectJobPlatform(url, host);

  const adapter = JOB_EXTRACTION_ADAPTERS[platform];
  const jsonLd = readJsonLdJobPosting(doc);

  const jobTitle =
    (adapter ? queryFirstText(doc, adapter.titleSelectors) : "") ||
    jsonLd.title ||
    extractGenericTitle(doc);

  const companyName =
    (adapter ? queryFirstText(doc, adapter.companySelectors) : "") ||
    jsonLd.company ||
    extractGenericCompany(doc, host);

  let jobDescription = "";
  if (adapter) {
    for (const sel of adapter.descriptionSelectors) {
      const el = doc.querySelector?.(sel);
      const txt = extractCleanText(el);
      if (txt.length >= 30) {
        jobDescription = txt;
        break;
      }
    }
  }
  if (!jobDescription) {
    jobDescription = jsonLd.description || extractGenericDescription(doc);
  }

  const locationHint =
    (adapter ? queryFirstText(doc, adapter.locationSelectors) : "") ||
    jsonLd.location ||
    queryFirstText(doc, ["[class*='location']", "[data-location]"]);

  const empHint =
    (adapter ? queryFirstText(doc, adapter.employmentTypeSelectors) : "") ||
    jsonLd.employmentType ||
    "";

  const { requiredSkills, preferredSkills } = extractSkillsFromDescription(jobDescription);
  const experienceRequired = extractExperienceRequirement(jobDescription);
  const employmentType = extractEmploymentType(jobDescription, empHint);

  return {
    companyName,
    jobTitle,
    jobDescription,
    requiredSkills,
    preferredSkills,
    experienceRequired,
    location: locationHint,
    employmentType,
    platform,
    sourceUrl: url,
    extractedAt: new Date().toISOString(),
    usedManualSelection: false,
  };
}

/**
 * Manual selection fallback: analyzes user-highlighted or pasted job text.
 */
export function analyzeSelectedText(
  selectedText: string,
  meta: {
    jobTitle?: string;
    companyName?: string;
    location?: string;
    url?: string;
    platform?: JobPlatform;
  } = {}
): JobAnalysisResult {
  const normalized = normalizeJobText(selectedText);
  const { requiredSkills, preferredSkills } = extractSkillsFromDescription(normalized);

  return {
    companyName: meta.companyName ?? "",
    jobTitle: meta.jobTitle ?? "",
    jobDescription: normalized,
    requiredSkills,
    preferredSkills,
    experienceRequired: extractExperienceRequirement(normalized),
    location: meta.location ?? "",
    employmentType: extractEmploymentType(normalized),
    platform: meta.platform ?? "Generic Application",
    sourceUrl: meta.url ?? "",
    extractedAt: new Date().toISOString(),
    usedManualSelection: true,
  };
}
