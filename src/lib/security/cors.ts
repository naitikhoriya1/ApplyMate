/**
 * ApplyMate — Trusted-Origin CORS Helper
 *
 * Prevents arbitrary third-party websites from calling local ApplyMate API
 * endpoints. Allows only:
 *  - Local dashboard dev origins (localhost / 127.0.0.1)
 *  - WebExtension origins (safari-web-extension://, chrome-extension://, moz-extension://)
 */

const ALLOWED_LOCAL_ORIGINS = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

export function isTrustedOrigin(origin: string | null): boolean {
  if (!origin) return true; // Same-origin or server-to-server request without Origin header
  if (ALLOWED_LOCAL_ORIGINS.has(origin)) return true;
  return (
    origin.startsWith("safari-web-extension://") ||
    origin.startsWith("chrome-extension://") ||
    origin.startsWith("moz-extension://")
  );
}

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  if (!origin || !isTrustedOrigin(origin)) {
    return {};
  }
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

