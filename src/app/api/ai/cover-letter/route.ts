import { NextResponse } from "next/server";
import {
  generateCoverLetter,
  validateCoverLetterRequest,
} from "@/lib/ai/coverLetterGenerator";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body." },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const validation = validateCoverLetterRequest(body);
  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.error },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const result = await generateCoverLetter(validation.data);
  return NextResponse.json(result, { headers: CORS_HEADERS });
}

