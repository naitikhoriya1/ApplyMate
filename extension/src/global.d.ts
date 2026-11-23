/**
 * ApplyMate Extension — Global type declarations
 *
 * Safari 15+ exposes the WebExtension API under the `browser` global
 * (identical to the Firefox WebExtension API).  TypeScript doesn't know
 * about this global by default, so we declare it here as an alias of
 * the `chrome` namespace (which @types/chrome already provides).
 *
 * This lets us write:
 *   const ext = typeof browser !== "undefined" ? browser : chrome;
 * …without a TypeScript error on `browser`.
 */
declare const browser: typeof chrome;

