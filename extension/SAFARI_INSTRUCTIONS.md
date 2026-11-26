# ApplyMate — macOS Safari Packaging, Signing & Development Guide

## Prerequisites

1. **macOS** with **Safari 16+**
2. **Node.js 22+** and **npm**
3. **Full Xcode** from the Mac App Store (required for `xcrun safari-web-extension-converter` and `xcodebuild`; Apple Command Line Tools alone do not include the Safari converter).

---

## 1. Build the Extension & Dashboard

From `applymate/`:

```bash
npm install
npm run test          # Run unit & integration test suite
npm run typecheck     # TypeScript check
npm run lint          # ESLint check
npm run build:all     # Builds Next.js dashboard + extension/dist/
```

The build outputs:
- `extension/dist/manifest.json` (self-contained unpacked bundle)
- `extension/dist/background.js`, `content.js`, `popup.js`, `popup.html`, `icons/`
- `extension/manifest.json` (root manifest referencing `dist/` for Xcode conversion)

---

## 2. Create the Xcode Safari Web Extension App Wrapper

Once full Xcode is installed and selected (`sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`), run:

```bash
xcrun safari-web-extension-converter extension/ \
  --project-location ./safari-xcode \
  --app-name "ApplyMate" \
  --bundle-identifier com.naitik.applymate \
  --macos-only \
  --no-open
```

This generates `./safari-xcode/ApplyMate/ApplyMate.xcodeproj` wrapping `extension/` inside a macOS Safari Web Extension host app.

---

## 3. Build, Sign & Install Locally

1. Open `./safari-xcode/ApplyMate/ApplyMate.xcodeproj` in **Xcode**.
2. Select **Signing & Capabilities** for both the `ApplyMate` (macOS App) and `ApplyMate Extension` targets:
   - Enable **Automatically manage signing**.
   - Select your **Personal Team** (free Apple ID works for local personal use).
3. Press **Cmd + R** (Product → Run) to build and launch the ApplyMate host app.
   - Or via CLI:
     ```bash
     xcodebuild -project safari-xcode/ApplyMate/ApplyMate.xcodeproj \
       -scheme "ApplyMate (macOS)" -configuration Release build
     ```

---

## 4. Enable ApplyMate in Safari

1. Open **Safari → Settings → Advanced** and check **Show features for web developers**.
2. Open **Safari → Settings → Extensions**.
3. Check **ApplyMate** to enable it.
4. Click **Always Allow on Every Website** (or grant access per job portal as needed).
5. For local unsigned testing without Xcode packaging:
   - **Develop → Allow Unsigned Extensions**
   - **Develop → Load Unpacked Extension…** → select `applymate/extension/dist/`

---

## 5. Updating During Development

1. Edit source files under `extension/` or `src/`.
2. Rebuild the extension bundle:
   ```bash
   npm run build:extension
   ```
3. In Xcode, press **Cmd + R** to reinstall the updated bundle (or click **Reload** in Safari's Extension Builder / Extensions settings).

---

## 6. Optional AI Answer & Cover Letter Server

To enable server-side OpenAI answer and cover letter refinement:

1. Create `applymate/.env.local`:
   ```bash
   OPENAI_API_KEY=sk-your-key-here
   ```
2. Start the local Next.js dashboard server:
   ```bash
   npm run dev
   ```
Without `OPENAI_API_KEY` or the Next.js server running, ApplyMate continues working locally for autofill, form detection, resume storage, job description analysis, local cover letters/emails, and application tracking.

---

## 7. Known Limitations

- **Xcode & Safari Live Testing**: Full Xcode and Playwright are not installed in the current environment, so `xcrun safari-web-extension-converter`, Xcode signing, Playwright browser E2E tests, and live Safari GUI verification have not been executed automatically and must be run locally on macOS with Xcode/Safari.
- **Dashboard vs. Extension Storage Separation**: `localhost:3000` `localStorage` and Safari `browser.storage.local` are isolated browser storage areas; edits made in the extension use `browser.storage.local`, while the Next.js dashboard uses `localStorage` when opened in a normal browser tab.
- **No Automatic Resume File Attachment or Form Submission**: By design, ApplyMate stores PDFs in IndexedDB and never assigns `<input type="file">` values or clicks submit buttons automatically.
- **Custom / Shadow DOM Portals**: Sites using closed Shadow DOMs or heavy anti-bot/CAPTCHA gates cannot be autofilled automatically.
