/**
 * ApplyMate — Personalized Cover Letter & Application Email Generator
 *
 * Generates concise, natural, recruiter-friendly cover letters and application
 * emails grounded strictly in the candidate's verified profile, experience,
 * skills, education, and target job details.
 *
 * Always includes actual candidate contact details in the signature (never placeholders).
 */

import type { CandidateProfile } from "@/types/profile";
import type { JobContextInput } from "@/lib/ai/answerGenerator";
import {
  buildSignature,
  generateLocalCoverLetter,
  type CoverLetterFormat,
  type CoverLetterRequest,
  type CoverLetterResult,
} from "./localCoverLetter.ts";

export {
  generateLocalCoverLetter,
  type CoverLetterFormat,
  type CoverLetterRequest,
  type CoverLetterResult,
};

export function validateCoverLetterRequest(
  body: unknown
): { valid: true; data: CoverLetterRequest } | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body must be a JSON object." };
  }

  const record = body as Record<string, unknown>;
  const format = record.format;
  if (format !== "cover_letter" && format !== "application_email") {
    return {
      valid: false,
      error: "Format must be 'cover_letter' or 'application_email'.",
    };
  }

  const profile = record.profile as CandidateProfile | undefined;
  if (
    !profile ||
    typeof profile !== "object" ||
    !profile.personal ||
    typeof profile.personal.firstName !== "string" ||
    typeof profile.personal.email !== "string" ||
    !Array.isArray(profile.skills) ||
    !Array.isArray(profile.experience) ||
    !Array.isArray(profile.education)
  ) {
    return { valid: false, error: "A valid candidate profile is required." };
  }

  return {
    valid: true,
    data: {
      format,
      profile,
      jobContext:
        record.jobContext && typeof record.jobContext === "object"
          ? (record.jobContext as JobContextInput)
          : undefined,
      variant: typeof record.variant === "number" ? record.variant : 0,
      useAI: typeof record.useAI === "boolean" ? record.useAI : true,
    },
  };
}

/**
 * Optional server-side OpenAI generation; falls back to `generateLocalCoverLetter`
 * when `OPENAI_API_KEY` is absent or `useAI` is false.
 */
export async function generateCoverLetter(
  input: CoverLetterRequest,
  options: { apiKey?: string; fetchFn?: typeof fetch } = {}
): Promise<CoverLetterResult> {
  const apiKey = (options.apiKey ?? process.env.OPENAI_API_KEY ?? "").trim();
  if (!apiKey || input.useAI === false) {
    return generateLocalCoverLetter(input);
  }

  const fetchImpl = options.fetchFn ?? fetch;
  const signature = buildSignature(input.profile);
  const { personal, experience, education, skills } = input.profile;
  const fullName = `${personal.firstName} ${personal.lastName}`.trim();

  const systemPrompt = [
    `Write a concise, natural, recruiter-friendly ${input.format === "application_email" ? "job application email (starting with 'Subject: ...')" : "cover letter"}.`,
    "STRICT RULES:",
    "1. Use ONLY the verified candidate details, experience, education, and skills provided.",
    "2. Never exaggerate or invent achievements, metrics, or skills.",
    "3. Keep it concise (150-210 words), human-sounding, and tailored to the job description.",
    "4. End with the EXACT candidate signature block provided — never use placeholders.",
  ].join("\n");

  const userPrompt = [
    `Candidate: ${fullName} (${personal.professionalTitle})`,
    `Experience: ${experience.map((e) => `${e.role} at ${e.company}: ${e.description}`).join(" | ")}`,
    `Education: ${education.map((ed) => `${ed.degree} in ${ed.fieldOfStudy}, ${ed.institution}`).join(" | ")}`,
    `Skills: ${skills.join(", ")}`,
    `Target Role: ${input.jobContext?.jobTitle || personal.professionalTitle}`,
    `Target Company: ${input.jobContext?.companyName || "Hiring Team"}`,
    `Job Description: ${(input.jobContext?.jobDescription || "").slice(0, 1500)}`,
    ``,
    `EXACT SIGNATURE TO USE AT THE END:\nSincerely,\n${signature}`,
  ].join("\n");

  const res = await fetchImpl("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.4,
      max_tokens: 450,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) {
    return generateLocalCoverLetter(input);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    return generateLocalCoverLetter(input);
  }

  return {
    content,
    format: input.format,
    mode: "ai",
  };
}
