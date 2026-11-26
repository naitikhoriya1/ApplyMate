/**
 * ApplyMate — Optional AI Application Answer Generator (Server-Only)
 *
 * Strictly grounded in the candidate's verified profile, experience,
 * education, and skills. Never fabricates experience, skills, or achievements.
 */

import type { CandidateProfile } from "@/types/profile";

export const PRESET_APPLICATION_QUESTIONS = [
  "Tell me about yourself.",
  "Why should we hire you?",
  "Why are you interested in this role?",
  "Describe your testing experience.",
  "Describe a project you worked on.",
  "What are your strengths?",
  "Why do you want to join this company?",
] as const;

export interface JobContextInput {
  companyName?: string;
  jobTitle?: string;
  jobDescription?: string;
  requiredSkills?: string[];
  preferredSkills?: string[];
  experienceRequired?: string;
  location?: string;
  employmentType?: string;
}

export interface GenerateAnswerRequest {
  question: string;
  profile: CandidateProfile;
  jobContext?: JobContextInput;
}

export interface GenerateAnswerResponse {
  answer: string;
  model: string;
  aiEnabled: boolean;
}

export function validateGenerateAnswerRequest(
  body: unknown
): { valid: true; data: GenerateAnswerRequest } | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body must be a JSON object." };
  }

  const record = body as Record<string, unknown>;
  const question = typeof record.question === "string" ? record.question.trim() : "";
  if (!question || question.length < 3 || question.length > 500) {
    return {
      valid: false,
      error: "Application question must be between 3 and 500 characters.",
    };
  }

  const profile = record.profile as CandidateProfile | undefined;
  if (
    !profile ||
    typeof profile !== "object" ||
    !profile.personal ||
    typeof profile.personal.firstName !== "string" ||
    !Array.isArray(profile.skills) ||
    !Array.isArray(profile.experience) ||
    !Array.isArray(profile.education)
  ) {
    return {
      valid: false,
      error: "A valid candidate profile (personal, experience, education, skills) is required.",
    };
  }

  const jobContext =
    record.jobContext && typeof record.jobContext === "object"
      ? (record.jobContext as JobContextInput)
      : undefined;

  return {
    valid: true,
    data: {
      question,
      profile,
      jobContext,
    },
  };
}

/**
 * Builds system and user prompts strictly grounded in verified candidate data.
 */
export function buildGroundedPrompt(input: GenerateAnswerRequest): {
  systemPrompt: string;
  userPrompt: string;
} {
  const { profile, jobContext, question } = input;
  const { personal, experience, education, skills } = profile;

  const expText =
    experience.length > 0
      ? experience
          .map(
            (e) =>
              `- ${e.role} at ${e.company} (${e.startDate} to ${e.current ? "Present" : e.endDate || "N/A"}): ${e.description}${e.skills.length ? ` [Skills: ${e.skills.join(", ")}]` : ""}`
          )
          .join("\n")
      : "No formal work experience listed.";

  const eduText =
    education.length > 0
      ? education
          .map(
            (ed) =>
              `- ${ed.degree} in ${ed.fieldOfStudy} from ${ed.institution} (${ed.startDate}–${ed.endDate || "Present"})`
          )
          .join("\n")
      : "No education listed.";

  const jobSection = jobContext
    ? [
        jobContext.jobTitle ? `Target Role: ${jobContext.jobTitle}` : "",
        jobContext.companyName ? `Target Company: ${jobContext.companyName}` : "",
        jobContext.location ? `Location: ${jobContext.location}` : "",
        jobContext.employmentType ? `Employment Type: ${jobContext.employmentType}` : "",
        jobContext.requiredSkills?.length
          ? `Required Skills: ${jobContext.requiredSkills.join(", ")}`
          : "",
        jobContext.preferredSkills?.length
          ? `Preferred Skills: ${jobContext.preferredSkills.join(", ")}`
          : "",
        jobContext.jobDescription
          ? `Job Description Excerpt:\n${jobContext.jobDescription.slice(0, 2000)}`
          : "",
      ]
        .filter(Boolean)
        .join("\n")
    : "No specific job description provided.";

  const systemPrompt = [
    "You are an expert career assistant helping a job candidate answer an application question.",
    "STRICT GROUNDING RULES:",
    "1. Use ONLY the verified candidate information provided below.",
    "2. NEVER invent work experience, employers, dates, or job titles.",
    "3. NEVER fabricate technical skills that are not in the candidate's verified skills or experience.",
    "4. NEVER fabricate metrics, percentages, or achievements.",
    "5. Tailor the answer to the job description where candidate facts genuinely overlap.",
    "6. Keep the response concise, natural, first-person, and professional (3-5 sentences, ~80-130 words).",
    "7. Output only the answer text — no preamble or markdown headers.",
  ].join("\n");

  const userPrompt = [
    `CANDIDATE PROFILE:`,
    `Name: ${personal.firstName} ${personal.lastName}`.trim(),
    `Title: ${personal.professionalTitle}`,
    `Location: ${personal.location}`,
    personal.bio ? `Summary: ${personal.bio}` : "",
    ``,
    `VERIFIED EXPERIENCE:`,
    expText,
    ``,
    `VERIFIED EDUCATION:`,
    eduText,
    ``,
    `VERIFIED TECHNICAL SKILLS:`,
    skills.join(", "),
    ``,
    `TARGET JOB CONTEXT:`,
    jobSection,
    ``,
    `APPLICATION QUESTION:`,
    question,
  ]
    .filter((line) => line !== undefined)
    .join("\n");

  return { systemPrompt, userPrompt };
}

export interface OpenAICallOptions {
  apiKey?: string;
  model?: string;
  fetchFn?: typeof fetch;
}

/**
 * Calls the OpenAI Chat Completions API from the server using `apiKey`.
 */
export async function generateGroundedAnswer(
  input: GenerateAnswerRequest,
  options: OpenAICallOptions = {}
): Promise<GenerateAnswerResponse> {
  const apiKey = (options.apiKey ?? process.env.OPENAI_API_KEY ?? "").trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured on the server.");
  }

  const model = options.model ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const fetchImpl = options.fetchFn ?? fetch;
  const { systemPrompt, userPrompt } = buildGroundedPrompt(input);

  const response = await fetchImpl("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      max_tokens: 320,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    throw new Error(
      `OpenAI API error (${response.status}): ${errBody.slice(0, 200) || response.statusText}`
    );
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const answer = json.choices?.[0]?.message?.content?.trim() ?? "";

  if (!answer) {
    throw new Error("OpenAI returned an empty answer.");
  }

  return {
    answer,
    model,
    aiEnabled: true,
  };
}

