/**
 * ApplyMate Extension — esbuild bundle script
 *
 * Bundles each extension entry point (content, background, popup) into
 * a self-contained IIFE JavaScript file inside extension/dist/.
 *
 * Why IIFE format?
 *   Browser extension content scripts and background service workers are
 *   loaded as plain scripts — not as ES modules.  IIFE format wraps all
 *   code in a closure, so there are no top-level `import`/`export`
 *   statements that the browser would reject.
 *
 * Usage:
 *   node scripts/build-extension.mjs
 */

import * as esbuild from "esbuild";
import { cpSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const extSrc = join(root, "extension", "src");
const extDist = join(root, "extension", "dist");

// Ensure dist directory exists
mkdirSync(extDist, { recursive: true });

/** Shared esbuild options for all extension scripts */
const sharedOpts = {
  bundle: true,
  format: /** @type {"iife"} */ ("iife"),
  target: "safari16",
  platform: "browser",
  logLevel: "info",
  // Treat browser/chrome as globals — don't bundle them
  external: [],
};

console.log("⚙️  Building ApplyMate extension scripts…\n");

await Promise.all([
  esbuild.build({
    ...sharedOpts,
    entryPoints: [join(extSrc, "background.ts")],
    outfile: join(extDist, "background.js"),
  }),
  esbuild.build({
    ...sharedOpts,
    entryPoints: [join(extSrc, "content.ts")],
    outfile: join(extDist, "content.js"),
  }),
  esbuild.build({
    ...sharedOpts,
    entryPoints: [join(extSrc, "popup.ts")],
    outfile: join(extDist, "popup.js"),
  }),
]);

// Copy the popup HTML into dist so it's co-located with popup.js
cpSync(
  join(root, "extension", "popup", "popup.html"),
  join(extDist, "popup.html")
);

console.log("\n✅  Extension built → extension/dist/");
console.log("   background.js  content.js  popup.js  popup.html");

