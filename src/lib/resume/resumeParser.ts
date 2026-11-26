/**
 * ApplyMate — Deterministic PDF Text & Resume-to-Profile Parser
 *
 * Extracts structured candidate details from an uploaded PDF resume locally
 * in the browser without external dependencies or network uploads.
 */

import type { CandidateProfile, Education, Experience } from "../../types/profile.ts";
import { EMPTY_PROFILE } from "../profile/defaultProfile.ts";

const KNOWN_SKILLS: Array<{ name: string; pattern: RegExp }> = [
  { name: "TypeScript", pattern: /\btypescript\b/i },
  { name: "JavaScript", pattern: /\b(javascript|ecmascript)\b/i },
  { name: "React.js", pattern: /\breact(\.js|js)?\b/i },
  { name: "React Testing Library", pattern: /\breact\s*testing\s*library\b/i },
  { name: "Next.js", pattern: /\bnext(\.js|js)\b/i },
  { name: "Node.js", pattern: /\bnode(\.js|js)\b/i },
  { name: "Express.js", pattern: /\bexpress(\.js|js)?\b/i },
  { name: "Playwright", pattern: /\bplaywright\b/i },
  { name: "Selenium WebDriver", pattern: /\bselenium(\s*webdriver)?\b/i },
  { name: "Cypress", pattern: /\bcypress\b/i },
  { name: "Jest", pattern: /\bjest\b/i },
  { name: "C++", pattern: /\bc\+\+/i },
  { name: "Python", pattern: /\bpython\b/i },
  { name: "Java", pattern: /\bjava\b(?!script)/i },
  { name: "Go", pattern: /\bgolang\b/i },
  { name: "REST APIs", pattern: /\brest(\s*apis?|ful\s*apis?)\b/i },
  { name: "GraphQL", pattern: /\bgraphql\b/i },
  { name: "MongoDB", pattern: /\bmongodb\b/i },
  { name: "PostgreSQL", pattern: /\bpostgres(ql)?\b/i },
  { name: "MySQL", pattern: /\bmysql\b/i },
  { name: "SQL", pattern: /\bsql\b/i },
  { name: "Firebase", pattern: /\bfirebase\b/i },
  { name: "Git", pattern: /\bgit\b(?!hub)/i },
  { name: "GitHub", pattern: /\bgithub\b/i },
  { name: "CI/CD", pattern: /\bci\s*\/\s*cd\b/i },
  { name: "Docker", pattern: /\bdocker\b/i },
  { name: "Kubernetes", pattern: /\bkubernetes\b/i },
  { name: "AWS", pattern: /\baws\b|amazon\s*web\s*services/i },
  { name: "HTML", pattern: /\bhtml5?\b/i },
  { name: "CSS", pattern: /\bcss3?\b/i },
  { name: "Tailwind CSS", pattern: /\btailwind(\s*css)?\b/i },
  { name: "Agile/Scrum", pattern: /\b(agile|scrum)\b/i },
  { name: "SDLC", pattern: /\bsdlc\b/i },
  { name: "Test Automation", pattern: /\btest\s*automation\b/i },
  { name: "Regression Testing", pattern: /\bregression\s*testing\b/i },
  { name: "Unit Testing", pattern: /\bunit\s*testing\b/i },
  { name: "Component Testing", pattern: /\bcomponent\s*testing\b/i },
];

function unescapePdfString(raw: string): string {
  return raw
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, " ")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\");
}

function extractTextOperators(content: string): string {
  const chunks: string[] = [];
  // Match literal strings in ( ... ) Tj or inside [ ( ... ) ] TJ
  const stringRegex = /\(([^()\\]*(?:\\.[^()\\]*)*)\)/g;
  let match: RegExpExecArray | null;
  while ((match = stringRegex.exec(content)) !== null) {
    const decoded = unescapePdfString(match[1]).trim();
    if (decoded && /[a-zA-Z0-9@.+]/.test(decoded)) {
      chunks.push(decoded);
    }
  }
  return chunks.join(" ");
}

async function tryInflateBytes(bytes: Uint8Array): Promise<string | null> {
  if (typeof DecompressionStream === "undefined") return null;
  try {
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    const stream = new Blob([copy]).stream().pipeThrough(
      new DecompressionStream("deflate")
    );
    const inflated = await new Response(stream).arrayBuffer();
    return new TextDecoder("latin1").decode(inflated);
  } catch {
    return null;
  }
}

/**
 * Extracts readable text from a PDF ArrayBuffer using native stream parsing
 * and Web DecompressionStream (supported in Safari 16.4+, Chrome, Node 18+).
 */
export async function extractTextFromPdfBuffer(
  buffer: ArrayBuffer
): Promise<string> {
  const bytes = new Uint8Array(buffer);
  const rawText = new TextDecoder("latin1").decode(bytes);

  const extractedParts: string[] = [];
  const streamMarker = "stream";
  const endMarker = "endstream";

  let cursor = 0;
  while (cursor < rawText.length) {
    const startIdx = rawText.indexOf(streamMarker, cursor);
    if (startIdx === -1) break;

    let dataStart = startIdx + streamMarker.length;
    if (rawText[dataStart] === "\r" && rawText[dataStart + 1] === "\n") {
      dataStart += 2;
    } else if (rawText[dataStart] === "\n" || rawText[dataStart] === "\r") {
      dataStart += 1;
    }

    const endIdx = rawText.indexOf(endMarker, dataStart);
    if (endIdx === -1) break;

    const headerSlice = rawText.slice(Math.max(0, startIdx - 200), startIdx);
    const streamBytes = bytes.slice(dataStart, endIdx);

    let decodedStream: string | null = null;
    if (/\/FlateDecode/i.test(headerSlice)) {
      decodedStream = await tryInflateBytes(streamBytes);
    } else {
      decodedStream = rawText.slice(dataStart, endIdx);
    }

    if (decodedStream) {
      const opsText = extractTextOperators(decodedStream);
      if (opsText) extractedParts.push(opsText);
    }

    cursor = endIdx + endMarker.length;
  }

  // Fallback for plain-text PDFs / text-operator-free test fixtures
  if (extractedParts.length === 0) {
    const literalFallback = extractTextOperators(rawText);
    if (literalFallback) {
      extractedParts.push(literalFallback);
    } else if (!rawText.startsWith("%PDF-")) {
      return new TextDecoder("utf-8").decode(bytes).trim();
    }
  }

  return extractedParts.join("\n").replace(/[ \t]+/g, " ").trim();
}

function splitSections(lines: string[]): Record<string, string[]> {
  const sections: Record<string, string[]> = { header: [] };
  let current = "header";

  for (const line of lines) {
    const clean = line.trim();
    if (!clean) continue;
    if (/^(experience|work\s*experience|employment|internship)/i.test(clean) && clean.length < 40) {
      current = "experience";
      sections[current] = sections[current] ?? [];
      continue;
    }
    if (/^(education|academic|qualifications)/i.test(clean) && clean.length < 40) {
      current = "education";
      sections[current] = sections[current] ?? [];
      continue;
    }
    if (/^(skills|technical\s*skills|technologies)/i.test(clean) && clean.length < 40) {
      current = "skills";
      sections[current] = sections[current] ?? [];
      continue;
    }
    if (/^(summary|profile|about|objective)/i.test(clean) && clean.length < 40) {
      current = "summary";
      sections[current] = sections[current] ?? [];
      continue;
    }
    sections[current] = sections[current] ?? [];
    sections[current].push(clean);
  }

  return sections;
}

/**
 * Parses extracted resume text into a structured CandidateProfile starting
 * from EMPTY_PROFILE.
 */
export function parseResumeTextToProfile(text: string): CandidateProfile {
  const base = structuredClone(EMPTY_PROFILE);
  const normalized = text.replace(/\r\n?/g, "\n").trim();
  if (!normalized) return base;

  const lines = normalized
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const sections = splitSections(lines);

  // 1. Contact details
  const emailMatch = normalized.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const phoneMatch = normalized.match(/(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{3,5}\)?[\s-]?)\d{3,5}[\s-]?\d{4,5}/);
  const linkedinMatch = normalized.match(/https?:\/\/(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+/i);
  const githubMatch = normalized.match(/https?:\/\/(?:www\.)?github\.com\/[a-zA-Z0-9_-]+/i);
  const portfolioMatch = normalized.match(/https?:\/\/(?!(?:www\.)?(?:linkedin|github)\.com)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?/i);

  base.personal.email = emailMatch?.[0] ?? "";
  base.personal.phone = phoneMatch?.[0]?.trim() ?? "";
  base.social.linkedin = linkedinMatch?.[0] ?? "";
  base.social.github = githubMatch?.[0] ?? "";
  base.social.portfolio = portfolioMatch?.[0] ?? "";

  // 2. Name & Title from header lines
  const headerLines = sections.header ?? lines.slice(0, 6);
  for (const line of headerLines) {
    if (
      !base.personal.firstName &&
      !line.includes("@") &&
      !/https?:\/\//i.test(line) &&
      !/\d{5,}/.test(line) &&
      /^[A-Za-z][A-Za-z.'-]{1,25}(\s+[A-Za-z][A-Za-z.'-]{1,25}){1,2}$/.test(line)
    ) {
      const parts = line.split(/\s+/);
      base.personal.firstName = parts[0] ?? "";
      base.personal.lastName = parts.slice(1).join(" ");
      continue;
    }

    if (
      base.personal.firstName &&
      !base.personal.professionalTitle &&
      !line.includes("@") &&
      !/https?:\/\//i.test(line) &&
      /\b(engineer|developer|sdet|qa|tester|designer|analyst|intern|architect|manager)\b/i.test(line)
    ) {
      base.personal.professionalTitle = line.slice(0, 100);
      continue;
    }

    if (
      !base.personal.location &&
      /\b([A-Za-z\s]+,\s*(India|USA|United States|UK|Canada|Remote|[A-Z]{2}))\b/i.test(line)
    ) {
      const locMatch = line.match(
        /\b([A-Za-z]+(?:\s+[A-Za-z]+)?,\s*(?:India|USA|United States|UK|Canada|Remote|[A-Z]{2}))\b/i
      );
      if (locMatch) base.personal.location = locMatch[1].trim();
    }
  }

  // 3. Summary / Bio
  if (sections.summary?.length) {
    base.personal.bio = sections.summary.join(" ").slice(0, 600);
  }

  // 4. Skills
  const matchedSkills: string[] = [];
  for (const s of KNOWN_SKILLS) {
    if (s.pattern.test(normalized) && !matchedSkills.includes(s.name)) {
      matchedSkills.push(s.name);
    }
  }
  base.skills = matchedSkills;

  // 5. Education
  const eduLines = sections.education?.length ? sections.education : lines;
  const eduEntries: Education[] = [];
  const degreeRegex = /\b(B\.?Tech|M\.?Tech|B\.?E\.?|B\.?Sc|M\.?Sc|BCA|MCA|MBA|B\.?A\.?|Ph\.?D|Bachelor|Master)\b/i;

  for (let i = 0; i < eduLines.length; i++) {
    const line = eduLines[i];
    const degMatch = line.match(degreeRegex);
    if (!degMatch) continue;
    const context = `${line} ${eduLines[i + 1] ?? ""}`;
    const yearMatch = context.match(/\b(20\d{2}|19\d{2})\b/g);
    const instMatch = context.match(
      /\b([A-Z][A-Za-z\s&.-]*(?:University|Institute|College|School|Academy)[A-Za-z\s&.-]*)/
    );
    const fieldMatch = context.match(/\bin\s+([A-Za-z\s&]+?)(?:\s+at|\s+from|\s*\d|,|$)/i);

    eduEntries.push({
      id: `edu-${eduEntries.length + 1}`,
      degree: degMatch[1],
      fieldOfStudy: fieldMatch?.[1]?.trim() ?? "",
      institution: instMatch?.[1]?.trim() ?? "",
      startDate: yearMatch && yearMatch.length > 1 ? `${yearMatch[0]}-08` : "",
      endDate: yearMatch ? `${yearMatch[yearMatch.length - 1]}-05` : "",
      current: false,
      grade: "",
    });
    if (eduEntries.length >= 2) break;
  }
  base.education = eduEntries;

  // 6. Experience
  const expLines = sections.experience ?? [];
  const expEntries: Experience[] = [];
  for (let i = 0; i < expLines.length; i++) {
    const line = expLines[i];
    // Match "Role - Company (2024 - 2025)" or "Role at Company" (require spaces around separator)
    const dashMatch = line.match(
      /^(.{3,60}?)\s+(?:[-–|@]|\bat\b)\s+(.{2,60}?)(?:\s*\(([^)]+)\))?$/i
    );
    if (dashMatch && !/^[-•*]/.test(line)) {
      const desc = expLines[i + 1] && /^[a-zA-Z•*-]/.test(expLines[i + 1]) ? expLines[i + 1].replace(/^[•*-]\s*/, "") : "";
      expEntries.push({
        id: `exp-${expEntries.length + 1}`,
        role: dashMatch[1].trim(),
        company: dashMatch[2].trim(),
        startDate: "",
        endDate: "",
        current: /present|current/i.test(line),
        description: desc,
        skills: [],
      });
      if (expEntries.length >= 4) break;
    }
  }
  base.experience = expEntries;
  base.updatedAt = new Date().toISOString();

  return base;
}
