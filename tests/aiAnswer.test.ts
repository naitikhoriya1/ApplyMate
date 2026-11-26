import test from "node:test";
import assert from "node:assert/strict";
import {
  PRESET_APPLICATION_QUESTIONS,
  validateGenerateAnswerRequest,
  buildGroundedPrompt,
  generateGroundedAnswer,
} from "../src/lib/ai/answerGenerator.ts";
import { DEFAULT_PROFILE } from "../src/lib/profile/defaultProfile.ts";

test("Includes all 7 required preset application questions", () => {
  const expected = [
    "Tell me about yourself.",
    "Why should we hire you?",
    "Why are you interested in this role?",
    "Describe your testing experience.",
    "Describe a project you worked on.",
    "What are your strengths?",
    "Why do you want to join this company?",
  ];
  for (const q of expected) {
    assert.ok(PRESET_APPLICATION_QUESTIONS.includes(q as never), `Missing question: ${q}`);
  }
});

test("validateGenerateAnswerRequest validates question and profile", () => {
  assert.strictEqual(validateGenerateAnswerRequest(null).valid, false);
  assert.strictEqual(
    validateGenerateAnswerRequest({ question: "Hi", profile: DEFAULT_PROFILE }).valid,
    false
  );
  assert.strictEqual(
    validateGenerateAnswerRequest({ question: "Why should we hire you?", profile: {} }).valid,
    false
  );

  const valid = validateGenerateAnswerRequest({
    question: "Describe your testing experience.",
    profile: DEFAULT_PROFILE,
    jobContext: {
      companyName: "Fibe India",
      jobTitle: "QA Automation Engineer",
      requiredSkills: ["Playwright", "Jest"],
    },
  });
  assert.strictEqual(valid.valid, true);
});

test("buildGroundedPrompt includes verified candidate data and strict anti-fabrication rules", () => {
  const { systemPrompt, userPrompt } = buildGroundedPrompt({
    question: "Describe your testing experience.",
    profile: DEFAULT_PROFILE,
    jobContext: {
      companyName: "Acme Tech",
      jobTitle: "SDET",
      requiredSkills: ["Playwright", "TypeScript"],
      jobDescription: "Looking for an SDET experienced in Playwright and TypeScript.",
    },
  });

  assert.ok(systemPrompt.includes("Use ONLY the verified candidate information"));
  assert.ok(systemPrompt.includes("NEVER invent work experience"));
  assert.ok(systemPrompt.includes("NEVER fabricate technical skills"));
  assert.ok(userPrompt.includes("Naitik Khoriya"));
  assert.ok(userPrompt.includes("Fibe India"));
  assert.ok(userPrompt.includes("Bikaner Technical University"));
  assert.ok(userPrompt.includes("Playwright"));
  assert.ok(userPrompt.includes("Acme Tech"));
  assert.ok(userPrompt.includes("Describe your testing experience."));
});

test("generateGroundedAnswer handles missing API key, successful OpenAI call, and API errors", async () => {
  const origKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  try {
    await assert.rejects(
      () =>
        generateGroundedAnswer({
          question: "What are your strengths?",
          profile: DEFAULT_PROFILE,
        }),
      /OPENAI_API_KEY/
    );

    let capturedAuth = "";
    const mockFetch = (async (_url: unknown, init?: RequestInit) => {
      capturedAuth = (init?.headers as Record<string, string>)?.Authorization ?? "";
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content:
                  "My core strengths are frontend and API test automation using Playwright, Jest, and TypeScript.",
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as typeof fetch;

    const res = await generateGroundedAnswer(
      {
        question: "What are your strengths?",
        profile: DEFAULT_PROFILE,
      },
      { apiKey: "sk-test-server-key", fetchFn: mockFetch }
    );

    assert.strictEqual(capturedAuth, "Bearer sk-test-server-key");
    assert.strictEqual(res.aiEnabled, true);
    assert.ok(res.answer.includes("Playwright"));

    const errorFetch = (async () =>
      new Response("Rate limit exceeded", { status: 429 })) as typeof fetch;

    await assert.rejects(
      () =>
        generateGroundedAnswer(
          { question: "What are your strengths?", profile: DEFAULT_PROFILE },
          { apiKey: "sk-test-server-key", fetchFn: errorFetch }
        ),
      /OpenAI API error \(429\)/
    );
  } finally {
    if (origKey !== undefined) process.env.OPENAI_API_KEY = origKey;
  }
});

