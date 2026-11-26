import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { isTrustedOrigin, getCorsHeaders } from "../src/lib/security/cors.ts";

test("Manifest enforces minimum required permissions and strict CSP", () => {
  const manifestPath = path.resolve("extension/manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
    permissions: string[];
    content_security_policy?: { extension_pages?: string };
  };

  assert.deepStrictEqual(manifest.permissions, ["storage", "activeTab"]);
  assert.ok(!manifest.permissions.includes("tabs"));
  assert.ok(!manifest.permissions.includes("history"));
  assert.ok(manifest.content_security_policy?.extension_pages?.includes("script-src 'self'"));
});

test("Trusted-origin CORS allows localhost and extension origins, rejects third-party sites", () => {
  assert.strictEqual(isTrustedOrigin("http://localhost:3000"), true);
  assert.strictEqual(isTrustedOrigin("safari-web-extension://abc-123"), true);
  assert.strictEqual(isTrustedOrigin("chrome-extension://xyz-789"), true);
  assert.strictEqual(isTrustedOrigin("https://evil.example.com"), false);

  const evilReq = new Request("http://localhost:3000/api/ai/answer", {
    headers: { origin: "https://evil.example.com" },
  });
  assert.deepStrictEqual(getCorsHeaders(evilReq), {});

  const extReq = new Request("http://localhost:3000/api/ai/answer", {
    headers: { origin: "safari-web-extension://abc-123" },
  });
  assert.strictEqual(
    getCorsHeaders(extReq)["Access-Control-Allow-Origin"],
    "safari-web-extension://abc-123"
  );
});

test("Extension scripts contain no hardcoded OpenAI keys or secrets", () => {
  const files = [
    "extension/src/background.ts",
    "extension/src/content.ts",
    "extension/src/popup.ts",
    "extension/autofill/autofillEngine.ts",
  ];
  for (const f of files) {
    const content = fs.readFileSync(path.resolve(f), "utf8");
    assert.ok(!/sk-[a-zA-Z0-9]{20,}/.test(content), `Found key-like token in ${f}`);
    assert.ok(!content.includes("OPENAI_API_KEY"), `Found OPENAI_API_KEY reference in ${f}`);
  }
});

