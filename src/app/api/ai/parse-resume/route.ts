import { NextResponse } from "next/server";
import { parseResumeTextToProfile } from "@/lib/resume/resumeParser";
import { getCorsHeaders, isTrustedOrigin } from "@/lib/security/cors";

export async function OPTIONS(req: Request) {
  const origin = req.headers.get("origin");
  if (origin && !isTrustedOrigin(origin)) {
    return new NextResponse(null, { status: 403 });
  }
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(req) });
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  if (origin && !isTrustedOrigin(origin)) {
    return NextResponse.json({ error: "Untrusted origin." }, { status: 403 });
  }

  const corsHeaders = getCorsHeaders(req);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400, headers: corsHeaders }
    );
  }

  const rawText =
    body && typeof body === "object" && typeof (body as { text?: unknown }).text === "string"
      ? (body as { text: string }).text
      : "";

  if (!rawText.trim()) {
    return NextResponse.json(
      { error: "Resume text is required." },
      { status: 400, headers: corsHeaders }
    );
  }

  const deterministic = parseResumeTextToProfile(rawText);
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return NextResponse.json(
      { profile: deterministic, mode: "local" },
      { headers: corsHeaders }
    );
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Extract ONLY explicitly stated candidate fields from the resume text into JSON matching { personal: { firstName, lastName, professionalTitle, email, phone, location, bio }, social: { linkedin, github, portfolio }, skills: string[], education: [{ degree, fieldOfStudy, institution, startDate, endDate }], experience: [{ role, company, startDate, endDate, current, description, skills }] }. Never invent information.",
          },
          { role: "user", content: rawText.slice(0, 6000) },
        ],
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { profile: deterministic, mode: "local" },
        { headers: corsHeaders }
      );
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { profile: deterministic, mode: "local" },
        { headers: corsHeaders }
      );
    }

    const parsed = JSON.parse(content) as Record<string, unknown>;
    return NextResponse.json(
      {
        profile: {
          ...deterministic,
          personal: {
            ...deterministic.personal,
            ...((parsed.personal as object) ?? {}),
          },
          social: {
            ...deterministic.social,
            ...((parsed.social as object) ?? {}),
          },
          skills: Array.isArray(parsed.skills)
            ? (parsed.skills as string[])
            : deterministic.skills,
          education: Array.isArray(parsed.education)
            ? (parsed.education as typeof deterministic.education)
            : deterministic.education,
          experience: Array.isArray(parsed.experience)
            ? (parsed.experience as typeof deterministic.experience)
            : deterministic.experience,
        },
        mode: "ai",
      },
      { headers: corsHeaders }
    );
  } catch {
    return NextResponse.json(
      { profile: deterministic, mode: "local" },
      { headers: corsHeaders }
    );
  }
}

