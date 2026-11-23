# ApplyMate Safari Extension — Loading Instructions

> These steps let you load the ApplyMate extension in Safari **without Xcode**.  
> Safari 17+ supports loading unsigned extensions directly from your project folder.

---

## Prerequisites

- macOS Ventura or later  
- Safari 17 or later  
- Run `npm run build:extension` from the project root **before** loading  

---

## Step 1 — Enable the Safari Develop Menu

1. Open **Safari → Settings** (⌘,)  
2. Click the **Advanced** tab  
3. Check **"Show features for web developers"**  

A new **Develop** menu will appear in the menu bar.

---

## Step 2 — Allow Unsigned Extensions

> ⚠️ This setting resets every time Safari quits. Repeat it after each restart.

1. Open the **Develop** menu in the menu bar  
2. Click **"Allow Unsigned Extensions"**  
3. Enter your macOS password if prompted  

---

## Step 3 — Build the Extension

Run this in the project root:

```bash
cd /Users/naitik/Project/extension/applymate
npm run build:extension
```

This compiles all TypeScript and writes four files to `extension/dist/`:
- `background.js` — service worker
- `content.js` — page detection script  
- `popup.js` — toolbar popup logic  
- `popup.html` — popup UI  

---

## Step 4 — Load the Extension in Safari

1. Open the **Develop** menu  
2. Click **"Load Unpacked Extension…"**  
3. In the file picker, navigate to and select the **`extension/`** folder  
   (the folder that contains `manifest.json`, not the `dist/` subfolder)  
4. Click **Open**  

The ApplyMate icon (or a default icon) will appear in the Safari toolbar.

---

## Step 5 — Run the First Test

1. Click **Enable** in the extension row if prompted  
2. Navigate to any `https://` page (e.g. `https://github.com`)  
3. Open **Develop → Web Inspector** (⌥⌘I), go to the **Console** tab  
4. Look for a log line like:  
   ```
   [ApplyMate] Page detected: "GitHub · Build and ship software on a single, collaborative platform" (github.com)
   ```
5. Click the **ApplyMate button** in the toolbar  
6. The popup should display:
   - Page Title ✅
   - Domain ✅
   - Full URL ✅

---

## Rebuilding After Code Changes

```bash
npm run build:extension   # recompile TypeScript → extension/dist/
```

Then reload the extension in Safari:
- **Develop → Reload Extension** (if available), or  
- Remove and re-add via **Develop → Load Unpacked Extension…**

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| "Allow Unsigned Extensions" is greyed out | Re-enable it — it resets on Safari restart |
| Popup is blank | Make sure `dist/popup.html` exists (`npm run build:extension`) |
| Console shows no `[ApplyMate]` log | Check the page URL starts with `https://` (the manifest only matches HTTPS) |
| `browser is not defined` error | The shim in `content.ts` handles this; make sure you rebuilt after edits |
| Extension not loading | Confirm you selected the `extension/` folder (not `extension/dist/`) |

---

## Project Scripts Reference

```bash
npm run build:extension   # Type-check + bundle extension → extension/dist/
npm run build:ext:check   # TypeScript type-check only (no emit)
npm run build:ext:bundle  # esbuild bundle only
npm run build             # Next.js dashboard build
npm run build:all         # Next.js + extension builds together
npm run dev               # Start Next.js dev server (dashboard only)
npm run typecheck         # Type-check the Next.js app
npm run lint              # ESLint the entire project
npm run test              # Run unit tests
```

