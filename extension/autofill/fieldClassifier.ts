/**
 * ApplyMate — Smart Field Classifier
 *
 * Inspects form controls (inputs, textareas, selects) and extracts textual cues from:
 *  - Explicit & implicit <label> text
 *  - placeholder attribute
 *  - name attribute
 *  - id attribute
 *  - aria-label / aria-labelledby
 *  - autocomplete tokens
 *  - nearby container & sibling text
 *
 * Maps elements to canonical candidate profile fields with confidence scoring.
 */

import type { SemanticFieldType, ClassifiedFieldInfo } from "../src/types.ts";

interface PatternRule {
  type: SemanticFieldType;
  label: string;
  // Patterns matched against concatenated normalized cue text
  regex: RegExp;
  // Specific weight boost if matched in explicit label or placeholder
  priority: number;
}

const PATTERN_RULES: PatternRule[] = [
  // 1. Resume / CV Links (e.g. Credit Samadhaan "Link to your CV (Google Drive, LinkedIn")
  {
    type: "resumeLink",
    label: "CV / Resume Link",
    regex: /\b(link\s*to\s*(your\s*)?(cv|resume)|cv\s*link|resume\s*link|drive\s*link|google\s*drive.*cv|resume\s*url|cv\s*url|upload\s*cv\s*link)\b/i,
    priority: 10,
  },

  // 2. LinkedIn URL
  {
    type: "linkedin",
    label: "LinkedIn Profile",
    regex: /\b(linkedin(\.com)?|linked_in|linkedin\s*url|linkedin\s*profile)\b/i,
    priority: 9,
  },

  // 3. GitHub URL
  {
    type: "github",
    label: "GitHub Profile",
    regex: /\b(github(\.com)?|git_hub|github\s*url|github\s*profile)\b/i,
    priority: 9,
  },

  // 4. Portfolio / Personal Website
  {
    type: "portfolio",
    label: "Portfolio / Website",
    regex: /\b(portfolio(\s*url|\s*link|\s*website)?|personal\s*(site|website|url)|your\s*website|website\s*url|blog\s*url)\b/i,
    priority: 8,
  },

  // 5. Email Address
  {
    type: "email",
    label: "Email Address",
    regex: /\b(email|e-mail|email\s*address|work\s*email|candidate\s*email)\b/i,
    priority: 10,
  },

  // 6. Mobile / Phone Number
  {
    type: "phone",
    label: "Mobile / Phone Number",
    regex: /\b(mobile(\s*number)?|phone(\s*number)?|contact(\s*number)?|cell(\s*phone)?|telephone|whatsapp(\s*number)?)\b/i,
    priority: 10,
  },

  // 7. Full Name
  {
    type: "fullName",
    label: "Full Name",
    regex: /\b(full\s*name|your\s*name|candidate\s*name|applicant\s*name|complete\s*name|legal\s*name)\b/i,
    priority: 9,
  },

  // 8. First Name
  {
    type: "firstName",
    label: "First Name",
    regex: /\b(first\s*name|given\s*name|fname|forename)\b/i,
    priority: 9,
  },

  // 9. Last Name
  {
    type: "lastName",
    label: "Last Name",
    regex: /\b(last\s*name|family\s*name|surname|lname)\b/i,
    priority: 9,
  },

  // 10. Current City / Location
  {
    type: "city",
    label: "Current City",
    regex: /\b(current\s*city|city|current\s*location|town|metro\s*area)\b/i,
    priority: 8,
  },

  // 11. State / Region
  {
    type: "state",
    label: "State / Region",
    regex: /\b(state|province|region)\b/i,
    priority: 7,
  },

  // 12. Country
  {
    type: "country",
    label: "Country",
    regex: /\b(country|nationality|nation)\b/i,
    priority: 7,
  },

  // 13. Postal Code / Zip / Pin code
  {
    type: "postalCode",
    label: "Postal / Pin Code",
    regex: /\b(pin\s*code|pincode|postal\s*code|zip(\s*code)?)\b/i,
    priority: 8,
  },

  // 14. Experience (Years / Level)
  {
    type: "experience",
    label: "Work Experience",
    regex: /\b(experience(\s*in\s*years|\s*level)?|years\s*of\s*experience|total\s*experience|work\s*experience)\b/i,
    priority: 9,
  },

  // 15. Bio / About Yourself / Cover Letter (e.g. Credit Samadhaan "Tell us a little about yourself...")
  {
    type: "bio",
    label: "About Yourself / Summary",
    regex: /\b(tell\s*us\s*(a\s*little\s*)?about\s*yourself|about\s*you(rself)?|why\s*(you'?d|do\s*you)\s*like\s*to\s*join|cover\s*letter|professional\s*summary|bio|candidate\s*note|statement)\b/i,
    priority: 8,
  },

  // 16. Current Job Title / Position
  {
    type: "currentTitle",
    label: "Position / Job Title",
    regex: /\b(position(\s*applied|\s*for)?|current\s*role|current\s*title|designation|current\s*job\s*title|headline)\b/i,
    priority: 7,
  },

  // 17. Skills
  {
    type: "skills",
    label: "Skills / Technologies",
    regex: /\b(skills|key\s*skills|technical\s*skills|technologies|tools|competencies)\b/i,
    priority: 8,
  },

  // 18. Degree / Qualification
  {
    type: "educationDegree",
    label: "Degree / Qualification",
    regex: /\b(degree|highest\s*(education|qualification)|education\s*level|major|field\s*of\s*study)\b/i,
    priority: 7,
  },

  // 19. University / College
  {
    type: "educationSchool",
    label: "University / Institution",
    regex: /\b(university|college|institution|school(\s*name)?)\b/i,
    priority: 7,
  },

  // 20. Graduation Year
  {
    type: "educationGradYear",
    label: "Graduation Year",
    regex: /\b(graduation\s*year|grad\s*year|year\s*of\s*passing|batch)\b/i,
    priority: 7,
  },

  // 21. Work Authorization
  {
    type: "workAuth",
    label: "Work Authorization",
    regex: /\b(work\s*authorization|legally\s*authorized|visa\s*sponsorship|sponsorship\s*required|right\s*to\s*work)\b/i,
    priority: 8,
  },

  // 22. Notice Period / Availability
  {
    type: "noticePeriod",
    label: "Notice Period",
    regex: /\b(notice\s*period|how\s*soon\s*can\s*you\s*join|availability(\s*to\s*join)?|start\s*date)\b/i,
    priority: 8,
  },

  // 23. Expected Salary / CTC
  {
    type: "expectedSalary",
    label: "Expected Salary",
    regex: /\b(expected\s*salary|desired\s*salary|expected\s*ctc|desired\s*ctc|salary\s*expectation|compensation)\b/i,
    priority: 8,
  },
];

/**
 * Extracts all textual cues from an HTML element
 */
export function extractCueText(el: HTMLElement): {
  labelText: string;
  placeholderText: string;
  nameText: string;
  idText: string;
  ariaText: string;
  autocompleteText: string;
  combined: string;
} {
  let labelText = "";
  let placeholderText = "";
  const nameText = (el.getAttribute("name") ?? "").toLowerCase();
  const idText = (el.id ?? "").toLowerCase();
  const ariaText = [
    el.getAttribute("aria-label") ?? "",
    el.getAttribute("aria-description") ?? "",
  ].join(" ").toLowerCase();
  const autocompleteText = (el.getAttribute("autocomplete") ?? "").toLowerCase();

  if ("placeholder" in el && typeof (el as { placeholder?: unknown }).placeholder === "string") {
    placeholderText = ((el as { placeholder: string }).placeholder ?? "").toLowerCase();
  }

  // 1. Explicit <label for="...">
  if (el.id && typeof document !== "undefined") {
    try {
      const escapedId = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(el.id) : el.id;
      const explicitLabel = document.querySelector(`label[for="${escapedId}"]`);
      if (explicitLabel?.textContent) {
        labelText += " " + explicitLabel.textContent.trim();
      }
    } catch {
      // In case selector fails
    }
  }

  // 2. Implicit wrapping <label>
  if (typeof el.closest === "function") {
    const parentLabel = el.closest("label");
    if (parentLabel?.textContent) {
      labelText += " " + parentLabel.textContent.trim();
    }
  }

  // 3. aria-labelledby
  if (typeof document !== "undefined") {
    const labelledBy = el.getAttribute("aria-labelledby");
    if (labelledBy) {
      try {
        const refEl = document.getElementById(labelledBy);
        if (refEl?.textContent) {
          labelText += " " + refEl.textContent.trim();
        }
      } catch {}
    }
  }

  // 4. Preceding sibling or nearby header (useful for custom form groups)
  const prevSibling = el.previousElementSibling;
  if (prevSibling && (prevSibling.tagName === "LABEL" || prevSibling.tagName === "SPAN" || prevSibling.tagName === "P")) {
    labelText += " " + (prevSibling.textContent ?? "").trim();
  }

  labelText = labelText.toLowerCase().replace(/\s+/g, " ");

  const combined = [
    labelText,
    placeholderText,
    nameText,
    idText,
    ariaText,
    autocompleteText,
  ]
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ");

  return {
    labelText,
    placeholderText,
    nameText,
    idText,
    ariaText,
    autocompleteText,
    combined,
  };
}

/**
 * Classifies an element into a SemanticFieldType based on textual cues and heuristics
 */
export function classifyFormField(el: HTMLElement): ClassifiedFieldInfo | null {
  const inputType = ("type" in el ? String((el as { type?: unknown }).type) : "").toLowerCase();
  if (
    inputType === "hidden" ||
    inputType === "submit" ||
    inputType === "button" ||
    inputType === "reset" ||
    inputType === "file"
  ) {
    return null;
  }

  const cues = extractCueText(el);

  // Check HTML5 input types for high-confidence hints
  if (inputType === "email") {
    return { type: "email", label: "Email Address", confidence: 0.98 };
  }
  if (inputType === "tel") {
    return { type: "phone", label: "Mobile / Phone Number", confidence: 0.95 };
  }

  // Match against pattern rules (highest priority first)
  const sortedRules = [...PATTERN_RULES].sort((a, b) => b.priority - a.priority);

  for (const rule of sortedRules) {
    // 1. Direct match on placeholder (very strong in modern forms without labels, like Credit Samadhaan)
    if (cues.placeholderText && rule.regex.test(cues.placeholderText)) {
      return {
        type: rule.type,
        label: rule.label,
        confidence: 0.95,
      };
    }

    // 2. Direct match on label
    if (cues.labelText && rule.regex.test(cues.labelText)) {
      return {
        type: rule.type,
        label: rule.label,
        confidence: 0.94,
      };
    }

    // 3. Match on combined cues
    if (rule.regex.test(cues.combined)) {
      return {
        type: rule.type,
        label: rule.label,
        confidence: 0.88,
      };
    }
  }

  // Fallback check: if name contains "name" and nothing else matched
  if (cues.combined.includes("name") && !cues.combined.includes("username") && !cues.combined.includes("company")) {
    return {
      type: "fullName",
      label: "Full Name",
      confidence: 0.75,
    };
  }

  return null;
}
