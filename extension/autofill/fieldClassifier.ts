/**
 * ApplyMate — Job Application Form Detection Engine (v2)
 *
 * Modular TypeScript field detection system:
 *  1. extractFieldMetadata()  – extracts & normalizes name, id, placeholder,
 *                               label, ARIA label, input type, autocomplete,
 *                               and parent form/fieldset context.
 *  2. DETECTION_RULES[]       – keyword & regex rules with per-signal weights.
 *  3. scoreRule()             – weighted multi-signal scoring + confidence [0..1].
 *  4. classifyFormField()     – classifies a single control, flags ambiguity,
 *                               and filters unsupported / sensitive fields.
 *  5. classifyAllFields()     – scans a document/subtree with deduplication.
 *  6. observeDynamicForms()   – MutationObserver for SPA / dynamically rendered inputs.
 */

import type {
  SemanticFieldType,
  ClassifiedFieldInfo,
  FieldMetadata,
} from "../src/types.ts";

// ─────────────────────────────────────────────────────────────────────────────
// 1. Normalization & Metadata Extraction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalizes a label, placeholder, name, or id string:
 *  - Splits camelCase / PascalCase ("firstName" -> "first name")
 *  - Lowercases
 *  - Replaces underscores, hyphens, slashes, and dots with spaces
 *  - Collapses extra whitespace
 */
export function normalizeFieldText(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/[_\-/\\.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Safely reads an attribute or DOM property from an element (works in both
 * browser DOM and lightweight Node test mocks).
 */
function readAttr(el: HTMLElement, attr: string, propName?: string): string {
  const fromAttr = typeof el.getAttribute === "function" ? el.getAttribute(attr) : null;
  if (fromAttr && fromAttr.trim()) return fromAttr;
  const key = propName ?? attr;
  const fromProp = (el as unknown as Record<string, unknown>)[key];
  return typeof fromProp === "string" ? fromProp : "";
}

/**
 * Resolves the visible label text associated with an element.
 * Checks (in order): aria-labelledby -> aria-label -> <label for="id"> ->
 * wrapping <label> -> preceding sibling label/header.
 */
function resolveLabelText(el: HTMLElement): string {
  const labelledBy = readAttr(el, "aria-labelledby");
  if (labelledBy && typeof document !== "undefined") {
    const text = labelledBy
      .trim()
      .split(/\s+/)
      .map((id) => document.getElementById?.(id)?.textContent ?? "")
      .join(" ")
      .trim();
    if (text) return text;
  }

  const ariaLabel = readAttr(el, "aria-label");
  if (ariaLabel.trim()) return ariaLabel.trim();

  const id = readAttr(el, "id");
  if (id && typeof document !== "undefined" && typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    try {
      const associated = document.querySelector?.<HTMLLabelElement>(`label[for="${CSS.escape(id)}"]`);
      if (associated?.textContent?.trim()) return associated.textContent.trim();
    } catch {
      // Ignore selector errors on malformed IDs
    }
  }

  if (typeof el.closest === "function") {
    const wrapping = el.closest("label");
    if (wrapping) {
      if (typeof wrapping.cloneNode === "function") {
        const clone = wrapping.cloneNode(true) as HTMLElement;
        clone.querySelectorAll?.("input,select,textarea").forEach((n) => n.parentNode?.removeChild(n));
        const text = clone.textContent?.trim() ?? "";
        if (text) return text;
      } else if (wrapping.textContent?.trim()) {
        return wrapping.textContent.trim();
      }
    }
  }

  const prev = (el as { previousElementSibling?: { tagName?: string; textContent?: string | null } | null })
    .previousElementSibling;
  if (
    prev &&
    prev.tagName &&
    /^(LABEL|LEGEND|P|SPAN|DIV|H[1-6]|LI)$/.test(prev.tagName) &&
    (prev.textContent?.trim() ?? "").length < 120
  ) {
    return prev.textContent?.trim() ?? "";
  }

  return "";
}

/**
 * Collects parent form, fieldset legend, and nearby container context text.
 */
function resolveContextText(el: HTMLElement): string {
  const parts: string[] = [];

  const parent = (el as { parentElement?: HTMLElement | null }).parentElement;
  if (parent) {
    if (typeof parent.cloneNode === "function") {
      const clone = parent.cloneNode(true) as HTMLElement;
      clone.querySelectorAll?.("input,select,textarea,script,style").forEach((n) =>
        n.parentNode?.removeChild(n)
      );
      const text = clone.textContent?.replace(/\s+/g, " ").trim() ?? "";
      if (text) parts.push(text.slice(0, 300));
    } else if (parent.textContent?.trim()) {
      parts.push(parent.textContent.trim().slice(0, 300));
    }
  }

  if (typeof el.closest === "function") {
    const fieldset = el.closest("fieldset");
    const legend = fieldset?.querySelector?.("legend");
    if (legend?.textContent?.trim()) {
      parts.push(legend.textContent.trim());
    }

    const form = el.closest("form");
    if (form) {
      const formHints = [
        form.getAttribute?.("aria-label") ?? "",
        form.getAttribute?.("name") ?? "",
        form.id ?? "",
      ]
        .filter(Boolean)
        .join(" ");
      if (formHints) parts.push(formHints);
    }
  }

  return normalizeFieldText(parts.join(" "));
}

/**
 * Extracts and normalizes all detection metadata from a form control.
 */
export function extractFieldMetadata(el: HTMLElement): FieldMetadata {
  const labelText = normalizeFieldText(resolveLabelText(el));
  const placeholderText = normalizeFieldText(readAttr(el, "placeholder"));
  const nameAttr = normalizeFieldText(readAttr(el, "name"));
  const idAttr = normalizeFieldText(readAttr(el, "id"));
  // Keep autocomplete token intact (e.g., "given-name", "address-level2")
  const autocompleteToken = readAttr(el, "autocomplete").toLowerCase().trim();
  const rawType = readAttr(el, "type") || "text";
  const inputType = rawType.toLowerCase().trim();
  const contextText = resolveContextText(el);

  const combined = [
    labelText,
    placeholderText,
    nameAttr,
    idAttr,
    autocompleteToken.replace(/-/g, " "),
    contextText,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    element: el,
    labelText,
    placeholderText,
    nameAttr,
    idAttr,
    autocompleteToken,
    inputType,
    contextText,
    combined,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Detection Rules & Weights
// ─────────────────────────────────────────────────────────────────────────────

interface SignalWeights {
  inputType?: number;
  autocomplete?: number;
  label?: number;
  placeholder?: number;
  name?: number;
  id?: number;
  context?: number;
}

interface DetectionRule {
  type: SemanticFieldType;
  displayLabel: string;
  priority: number;
  patterns: Partial<Record<keyof SignalWeights, RegExp>>;
  weights: SignalWeights;
  blocklist?: RegExp;
}

const DETECTION_RULES: DetectionRule[] = [
  // ── 1. Email ────────────────────────────────────────────────────────────
  {
    type: "email",
    displayLabel: "Email Address",
    priority: 10,
    patterns: {
      inputType: /^email$/,
      autocomplete: /^email$/,
      label: /\b(e[\s-]?mail(\s*address)?|work\s*e[\s-]?mail|your\s*e[\s-]?mail)\b/i,
      placeholder: /\b(e[\s-]?mail(\s*address)?|work\s*e[\s-]?mail|your\s*e[\s-]?mail)\b/i,
      name: /\b(e\s*mail|email\s*address|candidate\s*email)\b/i,
      id: /\b(e\s*mail|email\s*address)\b/i,
    },
    weights: {
      inputType: 0.99,
      autocomplete: 0.97,
      label: 0.94,
      placeholder: 0.92,
      name: 0.86,
      id: 0.80,
    },
  },

  // ── 2. Phone / Mobile Number ────────────────────────────────────────────
  {
    type: "phone",
    displayLabel: "Phone / Mobile Number",
    priority: 10,
    patterns: {
      inputType: /^tel$/,
      autocomplete: /^(tel|tel-national|mobile)$/,
      label: /\b(mobile(\s*number|\s*no)?|phone(\s*number|\s*no)?|contact(\s*number|\s*no)?|telephone|cell(\s*phone)?|whatsapp(\s*number|\s*no)?)\b/i,
      placeholder: /\b(mobile(\s*number|\s*no)?|phone(\s*number|\s*no)?|contact(\s*number|\s*no)?|cell(\s*phone)?|telephone|whatsapp(\s*number|\s*no)?)\b/i,
      name: /\b(mobile(\s*number|\s*no)?|phone(\s*number|\s*no)?|tel|contact\s*no|cellphone)\b/i,
      id: /\b(mobile(\s*number|\s*no)?|phone(\s*number|\s*no)?|tel)\b/i,
    },
    weights: {
      inputType: 0.99,
      autocomplete: 0.97,
      label: 0.94,
      placeholder: 0.92,
      name: 0.86,
      id: 0.80,
    },
  },

  // ── 3. CV / Resume Link (before LinkedIn so "Link to CV (Drive, LinkedIn)" maps here)
  {
    type: "resumeLink",
    displayLabel: "CV / Resume Link",
    priority: 10,
    patterns: {
      label: /\b(cv\s*(link|url)|resume\s*(link|url)|link\s*to\s*(your\s*)?(cv|resume))\b/i,
      placeholder: /\b(link\s*to\s*(your\s*)?(cv|resume)|cv\s*(link|url)|resume\s*(link|url)|drive\s*link|google\s*drive|resume\s*cv|upload\s*(cv|resume)\s*(link|url)?|paste\s*(cv|resume)|(your\s*)?cv)\b/i,
      name: /\b(cv\s*(link|url)|resume\s*(link|url))\b/i,
      id: /\b(cv\s*(link|url)|resume\s*(link|url))\b/i,
    },
    weights: {
      label: 0.95,
      placeholder: 0.95,
      name: 0.88,
      id: 0.82,
    },
    blocklist: /\b(upload\s*file|choose\s*file|browse)\b/i,
  },

  // ── 4. LinkedIn URL ─────────────────────────────────────────────────────
  {
    type: "linkedin",
    displayLabel: "LinkedIn Profile URL",
    priority: 9,
    patterns: {
      label: /\blinked\s*in(\s*(url|profile|link))?\b/i,
      placeholder: /\blinked\s*in(\s*com)?(\s*(url|profile|link))?\b/i,
      name: /\blinked\s*in(\s*(url|profile|link))?\b/i,
      id: /\blinked\s*in(\s*(url|profile|link))?\b/i,
      context: /\blinked\s*in\s*(url|profile|link)\b/i,
    },
    weights: {
      label: 0.95,
      placeholder: 0.94,
      name: 0.90,
      id: 0.84,
      context: 0.60,
    },
    blocklist: /\b(cv|resume|git\s*hub|portfolio)\b/i,
  },

  // ── 5. GitHub URL ───────────────────────────────────────────────────────
  {
    type: "github",
    displayLabel: "GitHub Profile URL",
    priority: 9,
    patterns: {
      label: /\bgit\s*hub(\s*(url|profile|link))?\b/i,
      placeholder: /\bgit\s*hub(\s*com)?(\s*(url|profile|link))?\b/i,
      name: /\bgit\s*hub(\s*(url|profile|link))?\b/i,
      id: /\bgit\s*hub(\s*(url|profile|link))?\b/i,
      context: /\bgit\s*hub\s*(url|profile|link)\b/i,
    },
    weights: {
      label: 0.95,
      placeholder: 0.94,
      name: 0.90,
      id: 0.84,
      context: 0.60,
    },
    blocklist: /\b(cv|resume|linked\s*in|portfolio)\b/i,
  },

  // ── 6. Portfolio URL ────────────────────────────────────────────────────
  {
    type: "portfolio",
    displayLabel: "Portfolio / Website",
    priority: 8,
    patterns: {
      label: /\b(portfolio(\s*(url|link|site|website))?|personal\s*(site|website|url)|website\s*(url|link))\b/i,
      placeholder: /\b(portfolio(\s*(url|link|site|website))?|personal\s*(site|website|url)|your\s*website|website\s*(url|link)|blog\s*(url|link))\b/i,
      name: /\b(portfolio(\s*(url|link|site))?|personal\s*site|website\s*url)\b/i,
      id: /\b(portfolio|personal\s*site|website\s*url)\b/i,
    },
    weights: {
      label: 0.93,
      placeholder: 0.92,
      name: 0.86,
      id: 0.80,
    },
    blocklist: /\b(linked\s*in|git\s*hub)\b/i,
  },

  // ── 7. First Name ───────────────────────────────────────────────────────
  {
    type: "firstName",
    displayLabel: "First Name",
    priority: 9,
    patterns: {
      autocomplete: /^given-name$/,
      label: /\b(first\s*name|given\s*name|forename|f\s*name)\b/i,
      placeholder: /\b(first\s*name|given\s*name|forename|f\s*name)\b/i,
      name: /\b(first\s*name|given\s*name|fname|forename)\b/i,
      id: /\b(first\s*name|given\s*name|fname|forename)\b/i,
    },
    weights: {
      autocomplete: 0.97,
      label: 0.95,
      placeholder: 0.94,
      name: 0.90,
      id: 0.85,
    },
  },

  // ── 8. Last Name ────────────────────────────────────────────────────────
  {
    type: "lastName",
    displayLabel: "Last Name",
    priority: 9,
    patterns: {
      autocomplete: /^family-name$/,
      label: /\b(last\s*name|family\s*name|surname|l\s*name)\b/i,
      placeholder: /\b(last\s*name|family\s*name|surname|l\s*name)\b/i,
      name: /\b(last\s*name|family\s*name|surname|lname)\b/i,
      id: /\b(last\s*name|family\s*name|surname|lname)\b/i,
    },
    weights: {
      autocomplete: 0.97,
      label: 0.95,
      placeholder: 0.94,
      name: 0.90,
      id: 0.85,
    },
  },

  // ── 9. Full Name ────────────────────────────────────────────────────────
  {
    type: "fullName",
    displayLabel: "Full Name",
    priority: 8,
    patterns: {
      autocomplete: /^name$/,
      label: /\b(full\s*name|your\s*name|candidate\s*name|applicant\s*name|complete\s*name|legal\s*name)\b/i,
      placeholder: /\b(full\s*name|your\s*name|candidate\s*name|applicant\s*name|complete\s*name|legal\s*name)\b/i,
      name: /^(full\s*name|fullname|candidate\s*name|applicant\s*name|your\s*name)$/i,
      id: /^(full\s*name|fullname|candidate\s*name|applicant\s*name)$/i,
    },
    weights: {
      autocomplete: 0.96,
      label: 0.94,
      placeholder: 0.93,
      name: 0.88,
      id: 0.84,
    },
    blocklist:
      /\b(first|last|given|family|sur|company|employer|org|organization|school|university|college|user|nick|project|file|city|country|state|street|bank|card|account|mother|father|spouse|emergency|reference)\s*name\b|\busername\b/i,
  },

  // ── 10. Current Location ────────────────────────────────────────────────
  {
    type: "location",
    displayLabel: "Current Location",
    priority: 8,
    patterns: {
      autocomplete: /^(street-address|address-line1)$/,
      label: /\b(current\s*location|your\s*location|location|home\s*address)\b/i,
      placeholder: /\b(current\s*location|your\s*location|location)\b/i,
      name: /\b(current\s*location|location)\b/i,
      id: /\b(current\s*location|location)\b/i,
    },
    weights: {
      autocomplete: 0.88,
      label: 0.90,
      placeholder: 0.88,
      name: 0.84,
      id: 0.78,
    },
    blocklist: /\b(city|state|country|zip|pin|postal)\b/i,
  },

  // ── 11. City ────────────────────────────────────────────────────────────
  {
    type: "city",
    displayLabel: "City",
    priority: 8,
    patterns: {
      autocomplete: /^address-level2$/,
      label: /\b(current\s*city|city|town|metro\s*area)\b/i,
      placeholder: /\b(current\s*city|city|town|metro\s*area)\b/i,
      name: /\b(current\s*city|city|town)\b/i,
      id: /\b(current\s*city|city|town)\b/i,
    },
    weights: {
      autocomplete: 0.95,
      label: 0.93,
      placeholder: 0.92,
      name: 0.86,
      id: 0.80,
    },
  },

  // ── 12. State / Province ────────────────────────────────────────────────
  {
    type: "state",
    displayLabel: "State / Province",
    priority: 7,
    patterns: {
      autocomplete: /^address-level1$/,
      label: /\b(state|province|region)\b/i,
      placeholder: /\b(state|province|region)\b/i,
      name: /\b(state|province|region)\b/i,
      id: /\b(state|province)\b/i,
    },
    weights: {
      autocomplete: 0.94,
      label: 0.88,
      placeholder: 0.86,
      name: 0.82,
      id: 0.76,
    },
  },

  // ── 13. Country ─────────────────────────────────────────────────────────
  {
    type: "country",
    displayLabel: "Country",
    priority: 7,
    patterns: {
      autocomplete: /^country(-name)?$/,
      label: /\b(country|nationality|nation)\b/i,
      placeholder: /\b(country|nationality)\b/i,
      name: /\b(country|nationality)\b/i,
      id: /\b(country|nationality)\b/i,
    },
    weights: {
      autocomplete: 0.95,
      label: 0.91,
      placeholder: 0.90,
      name: 0.85,
      id: 0.80,
    },
  },

  // ── 14. Postal / Pin Code ───────────────────────────────────────────────
  {
    type: "postalCode",
    displayLabel: "Postal / Pin Code",
    priority: 8,
    patterns: {
      autocomplete: /^postal-code$/,
      label: /\b(pin\s*code|pincode|postal\s*code|zip(\s*code)?)\b/i,
      placeholder: /\b(pin\s*code|pincode|postal\s*code|zip(\s*code)?)\b/i,
      name: /\b(pin\s*code|pincode|postal\s*code|zip\s*code|zip)\b/i,
      id: /\b(pin\s*code|postal\s*code|zip\s*code|zip)\b/i,
    },
    weights: {
      autocomplete: 0.96,
      label: 0.92,
      placeholder: 0.91,
      name: 0.86,
      id: 0.80,
    },
  },

  // ── 15. Previous Company (before Current Company so "previous" is never caught by "company")
  {
    type: "previousCompany",
    displayLabel: "Previous Company",
    priority: 9,
    patterns: {
      label: /\b(previous|last|former|past)\s*(company|employer|organization|org)\b/i,
      placeholder: /\b(previous|last|former|past)\s*(company|employer|organization|org)\b/i,
      name: /\b(prev|previous|last|former|past)\s*(company|employer|org)\b/i,
      id: /\b(prev|previous|last|former)\s*(company|employer)\b/i,
    },
    weights: {
      label: 0.95,
      placeholder: 0.94,
      name: 0.88,
      id: 0.82,
    },
  },

  // ── 16. Current Company ─────────────────────────────────────────────────
  {
    type: "currentCompany",
    displayLabel: "Current Company",
    priority: 8,
    patterns: {
      autocomplete: /^organization$/,
      label: /\b(current\s*(company|employer|organization|org)|company(\s*name)?|employer(\s*name)?)\b/i,
      placeholder: /\b(current\s*(company|employer|organization|org)|company\s*name|employer\s*name)\b/i,
      name: /\b(current\s*(company|employer|org)|company(\s*name)?|employer)\b/i,
      id: /\b(current\s*(company|employer)|company\s*name|employer)\b/i,
    },
    weights: {
      autocomplete: 0.72,
      label: 0.92,
      placeholder: 0.91,
      name: 0.85,
      id: 0.80,
    },
    blocklist: /\b(previous|last|former|past|school|university|college)\b/i,
  },

  // ── 17. Current Job Title ───────────────────────────────────────────────
  {
    type: "currentTitle",
    displayLabel: "Current Job Title",
    priority: 7,
    patterns: {
      autocomplete: /^organization-title$/,
      label: /\b(current\s*(role|title|position|job\s*title)|designation|job\s*title|headline|position(\s*applied(\s*for)?)?)\b/i,
      placeholder: /\b(current\s*(role|title|position|job\s*title)|designation|job\s*title|headline|position(\s*applied(\s*for)?)?)\b/i,
      name: /\b(current\s*(role|title|position)|designation|job\s*title|headline)\b/i,
      id: /\b(current\s*(role|title)|designation|job\s*title)\b/i,
    },
    weights: {
      autocomplete: 0.95,
      label: 0.91,
      placeholder: 0.90,
      name: 0.85,
      id: 0.78,
    },
    blocklist: /\b(previous|last|former|past)\b/i,
  },

  // ── 18. Work Experience ─────────────────────────────────────────────────
  {
    type: "experience",
    displayLabel: "Work Experience",
    priority: 9,
    patterns: {
      label: /\b(work\s*experience|years\s*of\s*experience|total\s*experience|experience(\s*in\s*years|\s*level)?)\b/i,
      placeholder: /\b(work\s*experience|years\s*of\s*experience|total\s*experience|experience(\s*in\s*years|\s*level)?)\b/i,
      name: /\b(work\s*exp(erience)?|years\s*of\s*exp(erience)?|total\s*exp(erience)?|experience)\b/i,
      id: /\b(work\s*exp(erience)?|years\s*of\s*exp(erience)?|experience)\b/i,
      context: /\b(years\s*of\s*experience|relevant\s*experience)\b/i,
    },
    weights: {
      label: 0.93,
      placeholder: 0.92,
      name: 0.86,
      id: 0.80,
      context: 0.60,
    },
  },

  // ── 19. Bio / Summary / Cover Letter ────────────────────────────────────
  {
    type: "bio",
    displayLabel: "Bio / About Yourself",
    priority: 8,
    patterns: {
      label: /\b(cover\s*letter|professional\s*summary|bio|about\s*(you(rself)?|me)|candidate\s*statement|self\s*introduction)\b/i,
      placeholder: /\b(tell\s*us|about\s*you(rself)?|why\s*(you'?d|do\s*you)\s*(like\s*to\s*join|want\s*to\s*work)|cover\s*letter|professional\s*summary|bio|candidate\s*note|statement|introduce\s*yourself|describe\s*yourself|your\s*story)\b/i,
      name: /\b(cover\s*letter|bio|summary|about\s*me|candidate\s*note|self\s*intro)\b/i,
      id: /\b(cover\s*letter|bio|summary|about)\b/i,
    },
    weights: {
      label: 0.91,
      placeholder: 0.92,
      name: 0.85,
      id: 0.78,
    },
  },

  // ── 20. Skills ──────────────────────────────────────────────────────────
  {
    type: "skills",
    displayLabel: "Skills / Technologies",
    priority: 8,
    patterns: {
      label: /\b(technical\s*skills|key\s*skills|skills|technologies|competencies)\b/i,
      placeholder: /\b(technical\s*skills|key\s*skills|skills|technologies|tools|competencies|expertise)\b/i,
      name: /\b(tech\s*skills|key\s*skills|skills|competencies)\b/i,
      id: /\b(tech\s*skills|skills|competencies)\b/i,
    },
    weights: {
      label: 0.92,
      placeholder: 0.91,
      name: 0.86,
      id: 0.80,
    },
  },

  // ── 21. Degree / Qualification ──────────────────────────────────────────
  {
    type: "educationDegree",
    displayLabel: "Degree / Qualification",
    priority: 7,
    patterns: {
      label: /\b(degree|highest\s*(qualification|education)|qualification|major|field\s*of\s*study)\b/i,
      placeholder: /\b(degree(\s*earned)?|highest\s*(education|qualification)|education\s*level|major|field\s*of\s*study|qualification)\b/i,
      name: /\b(degree|qualification|major|education\s*level|highest\s*qualification)\b/i,
      id: /\b(degree|qualification|major)\b/i,
    },
    weights: {
      label: 0.91,
      placeholder: 0.90,
      name: 0.85,
      id: 0.78,
    },
    blocklist: /\b(university|college|school|institution)\b/i,
  },

  // ── 22. University / College ────────────────────────────────────────────
  {
    type: "educationSchool",
    displayLabel: "University / College",
    priority: 7,
    patterns: {
      autocomplete: /^organization$/,
      label: /\b(university|college|school|institution|alma\s*mater)\b/i,
      placeholder: /\b(university|college|school|institution|alma\s*mater)\b/i,
      name: /\b(university|college|school|institution|alma\s*mater)\b/i,
      id: /\b(university|college|school|institution)\b/i,
    },
    weights: {
      autocomplete: 0.68,
      label: 0.92,
      placeholder: 0.91,
      name: 0.86,
      id: 0.80,
    },
    blocklist: /\b(company|employer)\b/i,
  },

  // ── 23. Graduation Year ─────────────────────────────────────────────────
  {
    type: "educationGradYear",
    displayLabel: "Graduation Year",
    priority: 7,
    patterns: {
      label: /\b(graduation\s*(year|date)|pass(ing|out)\s*(year|date)|year\s*of\s*(graduation|passing)|grad\s*year)\b/i,
      placeholder: /\b(graduation\s*(year|date)|pass(ing|out)\s*(year|date)|year\s*of\s*(graduation|passing)|grad\s*year)\b/i,
      name: /\b(grad(uation)?\s*year|passing\s*year|year\s*of\s*grad)\b/i,
      id: /\b(grad(uation)?\s*year|passing\s*year)\b/i,
    },
    weights: {
      label: 0.93,
      placeholder: 0.92,
      name: 0.86,
      id: 0.82,
    },
  },

  // ── 24. Work Authorization ──────────────────────────────────────────────
  {
    type: "workAuth",
    displayLabel: "Work Authorization",
    priority: 6,
    patterns: {
      label: /\b(work\s*auth(orization)?|visa\s*status|right\s*to\s*work|sponsorship)\b/i,
      placeholder: /\b(work\s*auth(orization)?|visa\s*status|right\s*to\s*work|work\s*permit|authorized\s*to\s*work)\b/i,
      name: /\b(work\s*auth(orization)?|visa\s*status|right\s*to\s*work)\b/i,
      id: /\b(work\s*auth|visa\s*status)\b/i,
    },
    weights: {
      label: 0.90,
      placeholder: 0.89,
      name: 0.85,
      id: 0.78,
    },
  },

  // ── 25. Notice Period ───────────────────────────────────────────────────
  {
    type: "noticePeriod",
    displayLabel: "Notice Period",
    priority: 7,
    patterns: {
      label: /\b(notice\s*period|joining\s*(date|time)|availability|join\s*date)\b/i,
      placeholder: /\b(notice\s*period|joining\s*(date|time)|availability|when\s*(can\s*you\s*join|are\s*you\s*available))\b/i,
      name: /\b(notice\s*period|joining\s*date|availability)\b/i,
      id: /\b(notice\s*period|joining\s*date)\b/i,
    },
    weights: {
      label: 0.93,
      placeholder: 0.92,
      name: 0.86,
      id: 0.80,
    },
  },

  // ── 26. Expected Salary / CTC ───────────────────────────────────────────
  {
    type: "expectedSalary",
    displayLabel: "Expected Salary / CTC",
    priority: 6,
    patterns: {
      label: /\b(expected\s*(salary|ctc)|desired\s*(salary|ctc)|salary\s*expectations?|current\s*ctc)\b/i,
      placeholder: /\b(expected\s*(salary|ctc|compensation|pay)|desired\s*(salary|ctc|pay)|current\s*ctc|salary\s*expectations?)\b/i,
      name: /\b(expected\s*(salary|ctc)|desired\s*(salary|ctc)|salary\s*expectation)\b/i,
      id: /\b(expected\s*(salary|ctc)|salary)\b/i,
    },
    weights: {
      label: 0.90,
      placeholder: 0.89,
      name: 0.85,
      id: 0.78,
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 3. Weighted Scoring Engine
// ─────────────────────────────────────────────────────────────────────────────

/** Minimum confidence score required to return a classification (0..1) */
const MIN_CONFIDENCE_THRESHOLD = 0.55;

/** Gap below which top-2 competing rules flag the field as ambiguous */
const AMBIGUITY_DELTA = 0.08;

interface RuleScore {
  rule: DetectionRule;
  score: number;
  matchedSignal: ClassifiedFieldInfo["matchedSignal"];
}

/**
 * Evaluates a single detection rule against extracted field metadata.
 * Uses the strongest matching signal as the base confidence, plus a small
 * additive bonus for corroborating signals (capped at 0.99).
 */
function scoreRule(rule: DetectionRule, meta: FieldMetadata): RuleScore | null {
  if (rule.blocklist && rule.blocklist.test(meta.combined)) return null;

  const signals: Array<[keyof SignalWeights, string]> = [
    ["inputType", meta.inputType],
    ["autocomplete", meta.autocompleteToken],
    ["label", meta.labelText],
    ["placeholder", meta.placeholderText],
    ["name", meta.nameAttr],
    ["id", meta.idAttr],
    ["context", meta.contextText],
  ];

  let maxWeight = 0;
  let extraWeightSum = 0;
  let matchCount = 0;
  let bestSignal: ClassifiedFieldInfo["matchedSignal"] = "combined";

  for (const [signalKey, signalValue] of signals) {
    const pattern = rule.patterns[signalKey];
    const weight = rule.weights[signalKey] ?? 0;
    if (!pattern || !signalValue) continue;

    if (pattern.test(signalValue)) {
      matchCount++;
      if (weight > maxWeight) {
        if (maxWeight > 0) extraWeightSum += maxWeight;
        maxWeight = weight;
        bestSignal = signalKey as ClassifiedFieldInfo["matchedSignal"];
      } else {
        extraWeightSum += weight;
      }
    }
  }

  if (matchCount === 0) return null;

  // Multi-signal corroboration bonus (each extra matching signal adds up to +0.04, capped at 0.99)
  const confidence = Math.min(0.99, Number((maxWeight + extraWeightSum * 0.04).toFixed(3)));

  return { rule, score: confidence, matchedSignal: bestSignal };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Unsupported & Sensitive Field Exclusions
// ─────────────────────────────────────────────────────────────────────────────

const UNSUPPORTED_INPUT_TYPES = new Set([
  "hidden",
  "submit",
  "reset",
  "button",
  "file",
  "image",
  "range",
  "color",
  "password",
  "checkbox",
  "radio",
]);

const SENSITIVE_DEMOGRAPHIC_PATTERN =
  /\b(age|gender|sex|sexual\s*orientation|pronouns|race|ethnicity|hispanic|latino|veteran|military\s*status|religion|marital\s*status|disability|handicap|caste|eeo|equal\s*opportunity|dob|date\s*of\s*birth|birth\s*date|national\s*id|aadhaar|pan\s*number|ssn|social\s*security|passport)\b/i;

const NON_CANDIDATE_PERSON_PATTERN =
  /\b(reference|emergency\s*contact|referee|guardian|nominee|manager\s*name|supervisor)\b/i;

const CAPTCHA_OR_BOT_PATTERN =
  /\b(captcha|recaptcha|hcaptcha|turnstile|bot\s*check|verification\s*code)\b/i;

/**
 * Returns true if the element is unsupported, a password field, or a sensitive
 * demographic / non-candidate / CAPTCHA field that must never be autofilled.
 */
export function shouldSkipElement(meta: FieldMetadata): boolean {
  if (UNSUPPORTED_INPUT_TYPES.has(meta.inputType)) return true;
  if (SENSITIVE_DEMOGRAPHIC_PATTERN.test(meta.combined)) return true;
  if (NON_CANDIDATE_PERSON_PATTERN.test(meta.combined)) return true;
  if (CAPTCHA_OR_BOT_PATTERN.test(meta.combined)) return true;
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Public Classifier API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Classifies a single form control (input, textarea, select).
 * Returns null if the field is unsupported, sensitive, or cannot be
 * confidently matched without guessing.
 */
export function classifyFormField(el: HTMLElement): ClassifiedFieldInfo | null {
  const meta = extractFieldMetadata(el);

  if (shouldSkipElement(meta)) return null;

  const scores: RuleScore[] = [];
  for (const rule of DETECTION_RULES) {
    const result = scoreRule(rule, meta);
    if (result) scores.push(result);
  }

  if (scores.length === 0) return null;

  scores.sort((a, b) =>
    b.score !== a.score ? b.score - a.score : b.rule.priority - a.rule.priority
  );

  const winner = scores[0];
  if (winner.score < MIN_CONFIDENCE_THRESHOLD) return null;

  const runnerUp = scores[1];
  const ambiguous =
    runnerUp !== undefined &&
    runnerUp.score >= MIN_CONFIDENCE_THRESHOLD &&
    winner.score - runnerUp.score < AMBIGUITY_DELTA;

  return {
    type: winner.rule.type,
    label: winner.rule.displayLabel,
    confidence: winner.score,
    ambiguous,
    matchedSignal: winner.matchedSignal,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Batch Scanner & Dynamic Form Observer
// ─────────────────────────────────────────────────────────────────────────────

export interface ClassifiedField {
  element: HTMLElement;
  classification: ClassifiedFieldInfo;
}

/**
 * Scans a root document or element for all classifiable form controls.
 * Deduplicates by SemanticFieldType (retaining the highest-confidence match).
 */
export function classifyAllFields(
  root: Document | HTMLElement = typeof document !== "undefined" ? document : ({} as Document)
): ClassifiedField[] {
  const selector = "input, textarea, select";
  const elements = Array.from(
    (root as Document).querySelectorAll?.<HTMLElement>(selector) ?? []
  );

  const results: ClassifiedField[] = [];
  const seenTypes = new Map<SemanticFieldType, number>();

  for (const el of elements) {
    if (typeof el.closest === "function" && el.closest("#applymate-extension-root")) continue;

    const classification = classifyFormField(el);
    if (!classification) continue;

    const existingIdx = seenTypes.get(classification.type);
    if (existingIdx !== undefined) {
      if (classification.confidence > results[existingIdx].classification.confidence) {
        results[existingIdx] = { element: el, classification };
      }
    } else {
      seenTypes.set(classification.type, results.length);
      results.push({ element: el, classification });
    }
  }

  return results;
}

/**
 * Observes a DOM container for dynamically rendered form inputs (SPAs, multi-step
 * wizards) and invokes `onNewField` for each newly added classifiable field.
 */
export function observeDynamicForms(
  root: HTMLElement,
  onNewField: (field: ClassifiedField) => void
): MutationObserver {
  const seen = new WeakSet<HTMLElement>();

  const inspect = (el: HTMLElement) => {
    if (seen.has(el)) return;
    seen.add(el);
    if (!el.matches?.("input, textarea, select")) return;
    if (el.closest?.("#applymate-extension-root")) return;
    const classification = classifyFormField(el);
    if (classification) {
      onNewField({ element: el, classification });
    }
  };

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of Array.from(mutation.addedNodes)) {
        if (node.nodeType !== 1 /* ELEMENT_NODE */) continue;
        const el = node as HTMLElement;
        inspect(el);
        el.querySelectorAll?.("input, textarea, select").forEach((child) => {
          inspect(child as HTMLElement);
        });
      }
    }
  });

  observer.observe(root, { childList: true, subtree: true });
  return observer;
}
