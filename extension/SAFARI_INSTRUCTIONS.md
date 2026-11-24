# ApplyMate Safari Extension — Developer & Loading Guide

> Load the ApplyMate extension directly in Safari on macOS **without full Xcode**.  
> Safari 17+ supports loading unsigned extensions directly from the project directory.

---

## 📋 Prerequisites

- **macOS Sonoma / Ventura** (macOS 14+ or 13+)
- **Safari 17+**
- Node.js & npm (installed)

---

## 🚀 Step-by-Step Setup

### Step 1 — Enable Safari Developer Features

1. Open **Safari**.
2. In the menu bar, open **Safari → Settings…** (or press `⌘,`).
3. Click the **Advanced** tab.
4. At the bottom, check:
   - ✅ **"Show features for web developers"** (in Safari 17+)
   *(or "Show Develop menu in menu bar" in earlier versions).*
5. You will now see a **Develop** menu in your top menu bar.

---

### Step 2 — Allow Unsigned Extensions

> ℹ️ *Note: Apple security policies reset this setting whenever Safari is completely quit. If you restart Safari, re-check this option.*

1. In the menu bar, click **Develop**.
2. Click **"Allow Unsigned Extensions"**.
3. Enter your macOS account password / Touch ID when prompted.

---

### Step 3 — Build the Extension

From the root of your project:

```bash
cd /Users/naitik/Project/extension/applymate
npm run build:extension
```

This compiles TypeScript using `esbuild` and bundles:
- `extension/dist/background.js` (MV3 Service Worker)
- `extension/dist/content.js` (Page Detector & Floating Button)
- `extension/dist/popup.js` (Toolbar Action Script)
- `extension/dist/popup.html` (Popup User Interface)
- `extension/dist/icons/` (16px, 32px, 48px, 128px PNG Icons)

---

### Step 4 — Load Extension in Safari

1. In Safari, click **Develop → Load Unpacked Extension…**
2. In the file picker, select the **`extension`** folder:
   ```
   /Users/naitik/Project/extension/applymate/extension
   ```
   *(Select the folder containing `manifest.json`, NOT `dist`)*
3. Click **Open**.
4. If prompted with *"Turn On Extension?"*, click **Turn On**.

The **ApplyMate** icon (blue square with white briefcase) will appear in your Safari toolbar.

---

## 🧪 Testing the First Requirement

### Test Goal
> When you open any webpage, the extension should be able to identify its URL and page title.

### Verification Steps:

1. **Open any webpage in Safari**:
   - You can visit any public site (e.g. `https://github.com`, `https://news.ycombinator.com`, `https://apple.com`) or your local dashboard at `http://localhost:3000`.
2. **Observe the Content Script**:
   - Open **Develop → Web Inspector** (`⌥⌘I`), switch to the **Console** tab.
   - Look for the console message:
     ```
     [ApplyMate] Page detected: "<Page Title>" (<hostname>)
     ```
   - Notice the floating blue **ApplyMate** button injected at the bottom-right corner of the page. Clicking it pulses and confirms active status.
3. **Open the Toolbar Popup Action**:
   - Click the **ApplyMate icon** in the Safari toolbar.
   - The popup opens immediately showing:
     - **Status Indicator**: 🟢 *Extension active*
     - **Page Title**: Detected active page title
     - **Domain**: Hostname (e.g., `github.com` or `localhost`)
     - **Full URL**: Complete page URL
   - Click the **Refresh** button in the popup to re-verify live communication between the popup, background service worker, and active tab.

---

## 🔄 Rebuilding During Development

Whenever you edit files inside `extension/src/`:

```bash
npm run build:extension
```

Then in Safari:
- Click **Develop → Reload Extension** (or toggle it in Safari Settings → Extensions).

---

## 🛠️ Architecture Notes (Safari MV3)

- **Manifest V3**: Uses `"manifest_version": 3`.
- **Background Service Worker**: Configured as `"background": { "service_worker": "dist/background.js" }`.
- **Cross-Namespace Compatibility**: Implements an automatic `browser` / `chrome` namespace shim to guarantee compatibility across Safari, Firefox, and Chromium engines.
- **Permissions (Minimum Principle)**:
  - `"activeTab"`: Access metadata on the currently focused tab when the user clicks the action.
  - `"tabs"`: Allows background query of tab title/URL as a fallback when content scripts haven't finished injecting.
  - `"storage"`: Authoritative `browser.storage.local` store for candidate profile persistence.
