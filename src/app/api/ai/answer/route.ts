import { NextResponse } from "next/server";
import {
  generateGroundedAnswer,
  validateGenerateAnswerRequest,
} from "@/lib/ai/answerGenerator";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
  const aiEnabled = Boolean(process.env.OPENAI_API_KEY?.trim());
  return NextResponse.json({ aiEnabled }, { headers: CORS_HEADERS });
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "AI answer generation is disabled (OPENAI_API_KEY not configured on server).",
        aiEnabled: false,
      },
      { status: 503, headers: CORS_HEADERS }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body." },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const validation = validateGenerateAnswerRequest(body);
  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.error },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  try {
    const result = await generateGroundedAnswer(validation.data, { apiKey });
    return NextResponse.json(result, { headers: CORS_HEADERS });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to generate AI answer.";
    return NextResponse.json(
      { error: message, aiEnabled: true },
      { status: 502, headers: CORS_HEADERS }
    );
  }
}

