import { NextResponse } from "next/server";
import {
  generateGroundedAnswer,
  validateGenerateAnswerRequest,
} from "@/lib/ai/answerGenerator";
import { getCorsHeaders, isTrustedOrigin } from "@/lib/security/cors";

function sanitizeErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : "";
  if (raw.includes("(401)") || raw.includes("(403)")) {
    return "AI service authentication failed on the server.";
  }
  if (raw.includes("(429)")) {
    return "AI service rate limit reached. Please try again shortly.";
  }
  return "Failed to generate AI answer. You can still write or edit manually.";
}

export async function OPTIONS(req: Request) {
  const origin = req.headers.get("origin");
  if (origin && !isTrustedOrigin(origin)) {
    return new NextResponse(null, { status: 403 });
  }
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(req) });
}

export async function GET(req: Request) {
  const origin = req.headers.get("origin");
  if (origin && !isTrustedOrigin(origin)) {
    return NextResponse.json({ error: "Untrusted origin." }, { status: 403 });
  }
  const aiEnabled = Boolean(process.env.OPENAI_API_KEY?.trim());
  return NextResponse.json({ aiEnabled }, { headers: getCorsHeaders(req) });
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  if (origin && !isTrustedOrigin(origin)) {
    return NextResponse.json({ error: "Untrusted origin." }, { status: 403 });
  }

  const corsHeaders = getCorsHeaders(req);
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "AI answer generation is disabled (OPENAI_API_KEY not configured on server).",
        aiEnabled: false,
      },
      { status: 503, headers: corsHeaders }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body." },
      { status: 400, headers: corsHeaders }
    );
  }

  const validation = validateGenerateAnswerRequest(body);
  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.error },
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    const result = await generateGroundedAnswer(validation.data, { apiKey });
    return NextResponse.json(result, { headers: corsHeaders });
  } catch (err) {
    console.error("[ApplyMate AI Answer] Upstream error:", err);
    return NextResponse.json(
      { error: sanitizeErrorMessage(err), aiEnabled: true },
      { status: 502, headers: corsHeaders }
    );
  }
}
