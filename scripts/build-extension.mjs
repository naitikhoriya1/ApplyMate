/**
 * ApplyMate Extension — esbuild bundle script
 *
 * Bundles each extension entry point (content, background, popup) into
 * a self-contained IIFE JavaScript file inside extension/dist/.
 * Copies popup.html and icons into dist for clean distribution.
 *
 * Usage:
 *   node scripts/build-extension.mjs
 */

import * as esbuild from "esbuild";
import { cpSync, mkdirSync, existsSync, readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const extSrc = join(root, "extension", "src");
const extDist = join(root, "extension", "dist");
const extIcons = join(root, "extension", "icons");

// Ensure dist directory exists
mkdirSync(extDist, { recursive: true });

/** Shared esbuild options for all extension scripts */
const sharedOpts = {
  bundle: true,
  format: /** @type {"iife"} */ ("iife"),
  target: "safari16",
  platform: "browser",
  logLevel: "info",
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

// Copy icons into dist as well
if (existsSync(extIcons)) {
  cpSync(extIcons, join(extDist, "icons"), { recursive: true });
}

// Emit a self-contained manifest.json inside dist/ (for Safari Load Unpacked Extension)
const rootManifest = JSON.parse(
  readFileSync(join(root, "extension", "manifest.json"), "utf8")
);
const distManifest = {
  ...rootManifest,
  action: {
    ...rootManifest.action,
    default_popup: "popup.html",
  },
  background: {
    ...rootManifest.background,
    service_worker: "background.js",
  },
  content_scripts: (rootManifest.content_scripts ?? []).map((cs) => ({
    ...cs,
    js: (cs.js ?? []).map((p) => p.replace(/^dist\//, "")),
  })),
};
writeFileSync(
  join(extDist, "manifest.json"),
  JSON.stringify(distManifest, null, 2) + "\n",
  "utf8"
);

console.log("\n✅  Extension built → extension/dist/");
console.log("   manifest.json  background.js  content.js  popup.js  popup.html  icons/");
