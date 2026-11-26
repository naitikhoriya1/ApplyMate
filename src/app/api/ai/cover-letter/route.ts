import { NextResponse } from "next/server";
import {
  generateCoverLetter,
  validateCoverLetterRequest,
} from "@/lib/ai/coverLetterGenerator";
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
      { error: "Invalid JSON request body." },
      { status: 400, headers: corsHeaders }
    );
  }

  const validation = validateCoverLetterRequest(body);
  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.error },
      { status: 400, headers: corsHeaders }
    );
  }

  const result = await generateCoverLetter(validation.data);
  return NextResponse.json(result, { headers: corsHeaders });
}
