"use strict";
(() => {
  // extension/autofill/fieldClassifier.ts
  function normalizeFieldText(raw) {
    if (!raw) return "";
    return raw.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase().replace(/[_\-/\\.]+/g, " ").replace(/\s+/g, " ").trim();
  }
  function readAttr(el, attr, propName) {
    const fromAttr = typeof el.getAttribute === "function" ? el.getAttribute(attr) : null;
    if (fromAttr && fromAttr.trim()) return fromAttr;
    const key = propName ?? attr;
    const fromProp = el[key];
    return typeof fromProp === "string" ? fromProp : "";
  }
  function resolveLabelText(el) {
    const labelledBy = readAttr(el, "aria-labelledby");
    if (labelledBy && typeof document !== "undefined") {
      const text = labelledBy.trim().split(/\s+/).map((id2) => document.getElementById?.(id2)?.textContent ?? "").join(" ").trim();
      if (text) return text;
    }
    const ariaLabel = readAttr(el, "aria-label");
    if (ariaLabel.trim()) return ariaLabel.trim();
    const id = readAttr(el, "id");
    if (id && typeof document !== "undefined" && typeof CSS !== "undefined" && typeof CSS.escape === "function") {
      try {
        const associated = document.querySelector?.(`label[for="${CSS.escape(id)}"]`);
        if (associated?.textContent?.trim()) return associated.textContent.trim();
      } catch {
      }
    }
    if (typeof el.closest === "function") {
      const wrapping = el.closest("label");
      if (wrapping) {
        if (typeof wrapping.cloneNode === "function") {
          const clone = wrapping.cloneNode(true);
          clone.querySelectorAll?.("input,select,textarea").forEach((n) => n.parentNode?.removeChild(n));
          const text = clone.textContent?.trim() ?? "";
          if (text) return text;
        } else if (wrapping.textContent?.trim()) {
          return wrapping.textContent.trim();
        }
      }
    }
    const prev = el.previousElementSibling;
    if (prev && prev.tagName && /^(LABEL|LEGEND|P|SPAN|DIV|H[1-6]|LI)$/.test(prev.tagName) && (prev.textContent?.trim() ?? "").length < 120) {
      return prev.textContent?.trim() ?? "";
    }
    return "";
  }
  function resolveContextText(el) {
    const parts = [];
    const parent = el.parentElement;
    if (parent) {
      if (typeof parent.cloneNode === "function") {
        const clone = parent.cloneNode(true);
        clone.querySelectorAll?.("input,select,textarea,script,style").forEach(
          (n) => n.parentNode?.removeChild(n)
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
          form.id ?? ""
        ].filter(Boolean).join(" ");
        if (formHints) parts.push(formHints);
      }
    }
    return normalizeFieldText(parts.join(" "));
  }
  function extractFieldMetadata(el) {
    const labelText = normalizeFieldText(resolveLabelText(el));
    const placeholderText = normalizeFieldText(readAttr(el, "placeholder"));
    const nameAttr = normalizeFieldText(readAttr(el, "name"));
    const idAttr = normalizeFieldText(readAttr(el, "id"));
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
      contextText
    ].filter(Boolean).join(" ");
    return {
      element: el,
      labelText,
      placeholderText,
      nameAttr,
      idAttr,
      autocompleteToken,
      inputType,
      contextText,
      combined
    };
  }
  var DETECTION_RULES = [
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
        id: /\b(e\s*mail|email\s*address)\b/i
      },
      weights: {
        inputType: 0.99,
        autocomplete: 0.97,
        label: 0.94,
        placeholder: 0.92,
        name: 0.86,
        id: 0.8
      }
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
        id: /\b(mobile(\s*number|\s*no)?|phone(\s*number|\s*no)?|tel)\b/i
      },
      weights: {
        inputType: 0.99,
        autocomplete: 0.97,
        label: 0.94,
        placeholder: 0.92,
        name: 0.86,
        id: 0.8
      }
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
        id: /\b(cv\s*(link|url)|resume\s*(link|url))\b/i
      },
      weights: {
        label: 0.95,
        placeholder: 0.95,
        name: 0.88,
        id: 0.82
      },
      blocklist: /\b(upload\s*file|choose\s*file|browse)\b/i
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
        context: /\blinked\s*in\s*(url|profile|link)\b/i
      },
      weights: {
        label: 0.95,
        placeholder: 0.94,
        name: 0.9,
        id: 0.84,
        context: 0.6
      },
      blocklist: /\b(cv|resume|git\s*hub|portfolio)\b/i
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
        context: /\bgit\s*hub\s*(url|profile|link)\b/i
      },
      weights: {
        label: 0.95,
        placeholder: 0.94,
        name: 0.9,
        id: 0.84,
        context: 0.6
      },
      blocklist: /\b(cv|resume|linked\s*in|portfolio)\b/i
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
        id: /\b(portfolio|personal\s*site|website\s*url)\b/i
      },
      weights: {
        label: 0.93,
        placeholder: 0.92,
        name: 0.86,
        id: 0.8
      },
      blocklist: /\b(linked\s*in|git\s*hub)\b/i
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
        id: /\b(first\s*name|given\s*name|fname|forename)\b/i
      },
      weights: {
        autocomplete: 0.97,
        label: 0.95,
        placeholder: 0.94,
        name: 0.9,
        id: 0.85
      }
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
        id: /\b(last\s*name|family\s*name|surname|lname)\b/i
      },
      weights: {
        autocomplete: 0.97,
        label: 0.95,
        placeholder: 0.94,
        name: 0.9,
        id: 0.85
      }
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
        id: /^(full\s*name|fullname|candidate\s*name|applicant\s*name)$/i
      },
      weights: {
        autocomplete: 0.96,
        label: 0.94,
        placeholder: 0.93,
        name: 0.88,
        id: 0.84
      },
      blocklist: /\b(first|last|given|family|sur|company|employer|org|organization|school|university|college|user|nick|project|file|city|country|state|street|bank|card|account|mother|father|spouse|emergency|reference)\s*name\b|\busername\b/i
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
        id: /\b(current\s*location|location)\b/i
      },
      weights: {
        autocomplete: 0.88,
        label: 0.9,
        placeholder: 0.88,
        name: 0.84,
        id: 0.78
      },
      blocklist: /\b(city|state|country|zip|pin|postal)\b/i
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
        id: /\b(current\s*city|city|town)\b/i
      },
      weights: {
        autocomplete: 0.95,
        label: 0.93,
        placeholder: 0.92,
        name: 0.86,
        id: 0.8
      }
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
        id: /\b(state|province)\b/i
      },
      weights: {
        autocomplete: 0.94,
        label: 0.88,
        placeholder: 0.86,
        name: 0.82,
        id: 0.76
      }
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
        id: /\b(country|nationality)\b/i
      },
      weights: {
        autocomplete: 0.95,
        label: 0.91,
        placeholder: 0.9,
        name: 0.85,
        id: 0.8
      }
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
        id: /\b(pin\s*code|postal\s*code|zip\s*code|zip)\b/i
      },
      weights: {
        autocomplete: 0.96,
        label: 0.92,
        placeholder: 0.91,
        name: 0.86,
        id: 0.8
      }
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
        id: /\b(prev|previous|last|former)\s*(company|employer)\b/i
      },
      weights: {
        label: 0.95,
        placeholder: 0.94,
        name: 0.88,
        id: 0.82
      }
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
        id: /\b(current\s*(company|employer)|company\s*name|employer)\b/i
      },
      weights: {
        autocomplete: 0.72,
        label: 0.92,
        placeholder: 0.91,
        name: 0.85,
        id: 0.8
      },
      blocklist: /\b(previous|last|former|past|school|university|college)\b/i
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
        id: /\b(current\s*(role|title)|designation|job\s*title)\b/i
      },
      weights: {
        autocomplete: 0.95,
        label: 0.91,
        placeholder: 0.9,
        name: 0.85,
        id: 0.78
      },
      blocklist: /\b(previous|last|former|past)\b/i
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
        context: /\b(years\s*of\s*experience|relevant\s*experience)\b/i
      },
      weights: {
        label: 0.93,
        placeholder: 0.92,
        name: 0.86,
        id: 0.8,
        context: 0.6
      }
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
        id: /\b(cover\s*letter|bio|summary|about)\b/i
      },
      weights: {
        label: 0.91,
        placeholder: 0.92,
        name: 0.85,
        id: 0.78
      }
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
        id: /\b(tech\s*skills|skills|competencies)\b/i
      },
      weights: {
        label: 0.92,
        placeholder: 0.91,
        name: 0.86,
        id: 0.8
      }
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
        id: /\b(degree|qualification|major)\b/i
      },
      weights: {
        label: 0.91,
        placeholder: 0.9,
        name: 0.85,
        id: 0.78
      },
      blocklist: /\b(university|college|school|institution)\b/i
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
        id: /\b(university|college|school|institution)\b/i
      },
      weights: {
        autocomplete: 0.68,
        label: 0.92,
        placeholder: 0.91,
        name: 0.86,
        id: 0.8
      },
      blocklist: /\b(company|employer)\b/i
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
        id: /\b(grad(uation)?\s*year|passing\s*year)\b/i
      },
      weights: {
        label: 0.93,
        placeholder: 0.92,
        name: 0.86,
        id: 0.82
      }
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
        id: /\b(work\s*auth|visa\s*status)\b/i
      },
      weights: {
        label: 0.9,
        placeholder: 0.89,
        name: 0.85,
        id: 0.78
      }
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
        id: /\b(notice\s*period|joining\s*date)\b/i
      },
      weights: {
        label: 0.93,
        placeholder: 0.92,
        name: 0.86,
        id: 0.8
      }
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
        id: /\b(expected\s*(salary|ctc)|salary)\b/i
      },
      weights: {
        label: 0.9,
        placeholder: 0.89,
        name: 0.85,
        id: 0.78
      }
    }
  ];
  var MIN_CONFIDENCE_THRESHOLD = 0.55;
  var AMBIGUITY_DELTA = 0.08;
  function scoreRule(rule, meta) {
    if (rule.blocklist && rule.blocklist.test(meta.combined)) return null;
    const signals = [
      ["inputType", meta.inputType],
      ["autocomplete", meta.autocompleteToken],
      ["label", meta.labelText],
      ["placeholder", meta.placeholderText],
      ["name", meta.nameAttr],
      ["id", meta.idAttr],
      ["context", meta.contextText]
    ];
    let maxWeight = 0;
    let extraWeightSum = 0;
    let matchCount = 0;
    let bestSignal = "combined";
    for (const [signalKey, signalValue] of signals) {
      const pattern = rule.patterns[signalKey];
      const weight = rule.weights[signalKey] ?? 0;
      if (!pattern || !signalValue) continue;
      if (pattern.test(signalValue)) {
        matchCount++;
        if (weight > maxWeight) {
          if (maxWeight > 0) extraWeightSum += maxWeight;
          maxWeight = weight;
          bestSignal = signalKey;
        } else {
          extraWeightSum += weight;
        }
      }
    }
    if (matchCount === 0) return null;
    const confidence = Math.min(0.99, Number((maxWeight + extraWeightSum * 0.04).toFixed(3)));
    return { rule, score: confidence, matchedSignal: bestSignal };
  }
  var UNSUPPORTED_INPUT_TYPES = /* @__PURE__ */ new Set([
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
    "radio"
  ]);
  var SENSITIVE_DEMOGRAPHIC_PATTERN = /\b(age|gender|sex|sexual\s*orientation|pronouns|race|ethnicity|hispanic|latino|veteran|military\s*status|religion|marital\s*status|disability|handicap|caste|eeo|equal\s*opportunity|dob|date\s*of\s*birth|birth\s*date|national\s*id|aadhaar|pan\s*number|ssn|social\s*security|passport)\b/i;
  var NON_CANDIDATE_PERSON_PATTERN = /\b(reference|emergency\s*contact|referee|guardian|nominee|manager\s*name|supervisor)\b/i;
  function shouldSkipElement(meta) {
    if (UNSUPPORTED_INPUT_TYPES.has(meta.inputType)) return true;
    if (SENSITIVE_DEMOGRAPHIC_PATTERN.test(meta.combined)) return true;
    if (NON_CANDIDATE_PERSON_PATTERN.test(meta.combined)) return true;
    return false;
  }
  function classifyFormField(el) {
    const meta = extractFieldMetadata(el);
    if (shouldSkipElement(meta)) return null;
    const scores = [];
    for (const rule of DETECTION_RULES) {
      const result = scoreRule(rule, meta);
      if (result) scores.push(result);
    }
    if (scores.length === 0) return null;
    scores.sort(
      (a, b) => b.score !== a.score ? b.score - a.score : b.rule.priority - a.rule.priority
    );
    const winner = scores[0];
    if (winner.score < MIN_CONFIDENCE_THRESHOLD) return null;
    const runnerUp = scores[1];
    const ambiguous = runnerUp !== void 0 && runnerUp.score >= MIN_CONFIDENCE_THRESHOLD && winner.score - runnerUp.score < AMBIGUITY_DELTA;
    return {
      type: winner.rule.type,
      label: winner.rule.displayLabel,
      confidence: winner.score,
      ambiguous,
      matchedSignal: winner.matchedSignal
    };
  }

  // extension/src/detector.ts
  var PLATFORM_PATTERNS = [
    {
      platform: "Greenhouse",
      match: (url, host) => host.includes("greenhouse.io") || host.includes("grnh.se") || url.includes("gh_jid=") || Boolean(typeof document !== "undefined" && document.querySelector("#application_form, [data-qa='greenhouse-form']"))
    },
    {
      platform: "Lever",
      match: (url, host) => host.includes("lever.co") || url.includes("lever.co/") || Boolean(typeof document !== "undefined" && document.querySelector(".application-form, form[action*='lever.co']"))
    },
    {
      platform: "Workday",
      match: (url, host) => host.includes("myworkdayjobs.com") || host.includes("workday.com") || url.includes("/job/") || Boolean(typeof document !== "undefined" && document.querySelector("[data-automation-id='job-posting-details'], [data-automation-id='applyButton']"))
    },
    {
      platform: "Ashby",
      match: (url, host) => host.includes("ashbyhq.com") || url.includes("ashbyhq.com/") || Boolean(typeof document !== "undefined" && document.querySelector("[data-ashby-job-application-form]"))
    },
    {
      platform: "LinkedIn",
      match: (_url, host) => host.includes("linkedin.com") && typeof window !== "undefined" && window.location.pathname.includes("/jobs/")
    },
    {
      platform: "Indeed",
      match: (_url, host) => host.includes("indeed.com")
    },
    {
      platform: "SmartRecruiters",
      match: (url, host) => host.includes("smartrecruiters.com") || Boolean(typeof document !== "undefined" && document.querySelector("form[action*='smartrecruiters']"))
    },
    // ── Indian job portals & career sites ───────────────────────────────────
    {
      platform: "Generic Application",
      match: (url, host) => host.includes("creditsamadhaan.com") || host.includes("naukri.com") || host.includes("internshala.com") || host.includes("unstop.com") || host.includes("cutshort.io") || host.includes("hirist.tech") || host.includes("foundit.in") || host.includes("apna.co") || (host.includes("angellist.com") || host.includes("wellfound.com")) || Boolean(
        typeof document !== "undefined" && document.querySelector(
          "form[action*='/apply'], form[action*='/careers'], form[action*='/jobs']"
        )
      )
    }
  ];
  function detectJobPlatform(urlStr = typeof location !== "undefined" ? location.href : "", host = typeof location !== "undefined" ? location.hostname : "") {
    for (const item of PLATFORM_PATTERNS) {
      if (item.match(urlStr, host)) {
        return item.platform;
      }
    }
    const lowerUrl = urlStr.toLowerCase();
    const lowerTitle = typeof document !== "undefined" ? document.title.toLowerCase() : "";
    const jobKeywords = ["/careers", "/jobs", "/apply", "job-application", "job_post", "openings", "positions"];
    if (jobKeywords.some((kw) => lowerUrl.includes(kw)) || lowerTitle.includes("apply") || lowerTitle.includes("career")) {
      return "Generic Application";
    }
    if (host === "localhost" || host === "127.0.0.1") {
      return "Generic Application";
    }
    return "None";
  }
  function detectApplicationForm() {
    const platform = typeof location !== "undefined" ? detectJobPlatform(location.href, location.hostname) : "None";
    if (typeof document === "undefined") {
      return {
        detected: false,
        platform,
        fieldsCount: 0,
        hasResumeUpload: false,
        detectedFields: [],
        classifiedTypes: [],
        confidence: "none"
      };
    }
    const detectedLabels = /* @__PURE__ */ new Set();
    const classifiedTypes = /* @__PURE__ */ new Set();
    let hasResumeUpload = false;
    const inputs = Array.from(
      document.querySelectorAll(
        "input, textarea, select"
      )
    );
    let fieldsCount = 0;
    for (const el of inputs) {
      if (el.type === "hidden" || el.type === "submit" || el.type === "button" || el.type === "reset" || el.disabled || el.closest("#applymate-extension-root")) {
        continue;
      }
      fieldsCount++;
      if (el.type === "file") {
        hasResumeUpload = true;
        detectedLabels.add("Resume / CV File");
        continue;
      }
      const classified = classifyFormField(el);
      if (classified) {
        detectedLabels.add(classified.label);
        classifiedTypes.add(classified.type);
        if (classified.type === "resumeLink") {
          hasResumeUpload = true;
        }
      }
    }
    const labelsArray = Array.from(detectedLabels);
    const typesArray = Array.from(classifiedTypes);
    const coreFieldsFound = typesArray.includes("email") || typesArray.includes("phone") || typesArray.includes("fullName") || typesArray.includes("firstName") || typesArray.includes("resumeLink") || hasResumeUpload;
    const isKnownJobPlatform = platform !== "None";
    const hasMultipleFields = typesArray.length >= 2 || typesArray.length >= 1 && hasResumeUpload;
    const detected = isKnownJobPlatform && fieldsCount > 0 || coreFieldsFound && hasMultipleFields;
    let confidence = "none";
    if (detected && typesArray.length >= 3) {
      confidence = "high";
    } else if (detected) {
      confidence = "medium";
    } else if (typesArray.length > 0) {
      confidence = "low";
    }
    return {
      detected,
      platform: detected && platform === "None" ? "Generic Application" : platform,
      fieldsCount,
      hasResumeUpload,
      detectedFields: labelsArray,
      classifiedTypes: typesArray,
      confidence
    };
  }
  function isSupportedJobSite(urlStr = typeof location !== "undefined" ? location.href : "", host = typeof location !== "undefined" ? location.hostname : "") {
    if (host === "localhost" || host === "127.0.0.1") return true;
    if (detectJobPlatform(urlStr, host) !== "None") return true;
    const form = detectApplicationForm();
    return form.detected;
  }

  // src/lib/profile/defaultProfile.ts
  var DEFAULT_PROFILE = {
    personal: {
      firstName: "Naitik",
      lastName: "Khoriya",
      professionalTitle: "QA Automation Engineer | SDET (Frontend & API)",
      email: "ethicalkhoriya@gmail.com",
      phone: "+91 7877816484",
      location: "Delhi, India",
      bio: "QA Automation Engineer and SDET specialising in frontend and API testing. Experienced with Jest, Playwright, Selenium, and TypeScript. Passionate about building reliable test automation frameworks and improving software quality."
    },
    social: {
      linkedin: "https://linkedin.com/in/naitik",
      github: "https://github.com/naitik",
      portfolio: "https://naitik.dev"
    },
    experience: [
      {
        id: "exp-1",
        company: "Fibe India",
        role: "Software Engineer Intern (Testing & Automation Focus)",
        startDate: "2026-05",
        endDate: "",
        current: true,
        description: "Working on test automation for the Fibe consumer lending platform, covering regression testing, API testing, and CI/CD pipeline integration.",
        skills: ["Jest", "Playwright", "TypeScript", "REST APIs", "CI/CD"]
      },
      {
        id: "exp-2",
        company: "Aigetai Private Limited",
        role: "Frontend Developer (Freelance)",
        startDate: "2026-02",
        endDate: "2026-05",
        current: false,
        description: "Developed responsive React.js web interfaces and integrated REST APIs. Collaborated with the design team to deliver pixel-accurate UI components.",
        skills: ["React.js", "JavaScript", "TypeScript", "REST APIs", "Node.js"]
      }
    ],
    education: [
      {
        id: "edu-1",
        institution: "Bikaner Technical University",
        degree: "B.Tech",
        fieldOfStudy: "Computer Science and Engineering",
        startDate: "2021-08",
        endDate: "2025-05",
        current: false,
        grade: ""
      }
    ],
    skills: [
      "Jest",
      "React Testing Library",
      "Playwright",
      "Selenium WebDriver",
      "JavaScript",
      "TypeScript",
      "C++",
      "React.js",
      "Next.js",
      "Node.js",
      "Express.js",
      "REST APIs",
      "MongoDB",
      "Firebase",
      "Git",
      "GitHub",
      "CI/CD",
      "Agile/Scrum",
      "SDLC",
      "Regression Testing",
      "Unit Testing",
      "Component Testing",
      "Test Automation"
    ],
    preferences: {
      workAuthorization: "Authorized to work in India",
      requiresSponsorship: false,
      noticePeriod: "Available immediately / 2 weeks",
      desiredSalary: "Competitive",
      currency: "INR",
      openToRemote: true,
      preferredLocations: ["Delhi, India", "Remote"],
      jobTitles: [
        "QA Automation Engineer",
        "SDET",
        "Software Engineer in Test",
        "Frontend Developer"
      ],
      willingToRelocate: true
    },
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };

  // extension/autofill/autofillEngine.ts
  var MIN_AUTOFILL_CONFIDENCE = 0.7;
  var DEFAULT_UNCONFIGURED_NOTICE = "Available immediately / 2 weeks";
  var DEFAULT_UNCONFIGURED_SALARY = "Competitive";
  function setNativeValue(element, value) {
    const valueSetter = Object.getOwnPropertyDescriptor(element, "value")?.set;
    const prototype = Object.getPrototypeOf(element);
    const prototypeValueSetter = prototype ? Object.getOwnPropertyDescriptor(prototype, "value")?.set : void 0;
    if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
      prototypeValueSetter.call(element, value);
    } else if (valueSetter) {
      valueSetter.call(element, value);
    } else {
      element.value = value;
    }
  }
  function isPlaceholderOption(opt) {
    if (!opt) return true;
    const val = (opt.value ?? "").trim();
    const text = (opt.text ?? "").toLowerCase().trim();
    if (val === "") return true;
    return /^(select|choose|pick|--|please\s+select)/.test(text);
  }
  function selectBestOption(selectEl, targetValue) {
    const lowerTarget = targetValue.toLowerCase().trim();
    if (!lowerTarget) return false;
    const options = Array.from(selectEl.options);
    for (let i = 0; i < options.length; i++) {
      const opt = options[i];
      if (opt.disabled) continue;
      const text = opt.text.toLowerCase().trim();
      const val = opt.value.toLowerCase().trim();
      if (text === lowerTarget || val === lowerTarget) {
        selectEl.selectedIndex = i;
        return true;
      }
    }
    if (lowerTarget === "fresher" || lowerTarget === "0") {
      for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        if (opt.disabled) continue;
        const text = opt.text.toLowerCase().trim();
        if (text.includes("fresher") || text.includes("0-1") || text.includes("less than 1") || text.includes("no experience")) {
          selectEl.selectedIndex = i;
          return true;
        }
      }
    }
    const numMatch = lowerTarget.match(/^(\d+)$/);
    if (numMatch) {
      const targetNum = parseInt(numMatch[1], 10);
      for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        if (opt.disabled) continue;
        const text = opt.text.toLowerCase().trim();
        const rangeMatch = text.match(/(\d+)\s*[-–]\s*(\d+)/);
        if (rangeMatch) {
          const lo = parseInt(rangeMatch[1], 10);
          const hi = parseInt(rangeMatch[2], 10);
          if (targetNum >= lo && targetNum <= hi) {
            selectEl.selectedIndex = i;
            return true;
          }
        }
        const singleMatch = text.match(/^(\d+)\s*(years?|yrs?|\+)/);
        if (singleMatch && parseInt(singleMatch[1], 10) === targetNum) {
          selectEl.selectedIndex = i;
          return true;
        }
      }
    }
    for (let i = 0; i < options.length; i++) {
      const opt = options[i];
      if (opt.disabled || isPlaceholderOption(opt)) continue;
      const text = opt.text.toLowerCase().trim();
      const val = opt.value.toLowerCase().trim();
      if (text && (text.includes(lowerTarget) || lowerTarget.includes(text)) || val && (val.includes(lowerTarget) || lowerTarget.includes(val))) {
        selectEl.selectedIndex = i;
        return true;
      }
    }
    return false;
  }
  function dispatchInputEvents(el) {
    if (typeof el.dispatchEvent !== "function" || typeof Event === "undefined") return;
    el.dispatchEvent(new Event("focus", { bubbles: true }));
    el.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
    el.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
    el.dispatchEvent(new Event("blur", { bubbles: true }));
  }
  function highlightFilledField(el) {
    if (!el.style) return;
    const originalOutline = el.style.outline;
    const originalBoxShadow = el.style.boxShadow;
    const originalTransition = el.style.transition;
    el.style.transition = "outline 0.2s ease, box-shadow 0.2s ease";
    el.style.outline = "2px solid #10b981";
    el.style.boxShadow = "0 0 0 3px rgba(16, 185, 129, 0.25)";
    if (typeof setTimeout === "function") {
      setTimeout(() => {
        el.style.outline = originalOutline;
        el.style.boxShadow = originalBoxShadow;
        el.style.transition = originalTransition;
      }, 3500);
    }
  }
  function isFieldEmpty(el) {
    const tag = (el.tagName || "").toUpperCase();
    if (tag === "SELECT") {
      const selectEl = el;
      const idx = selectEl.selectedIndex ?? -1;
      if (idx < 0) return true;
      const currentOpt = selectEl.options?.[idx];
      return isPlaceholderOption(currentOpt);
    }
    const val = el.value ?? "";
    return val.trim().length === 0;
  }
  function resolveValueForField(type, profile, options = {}) {
    const { personal, social, experience, education, preferences, skills } = profile;
    switch (type) {
      case "fullName":
        return `${personal.firstName} ${personal.lastName}`.trim() || null;
      case "firstName":
        return personal.firstName || null;
      case "lastName":
        return personal.lastName || null;
      case "email":
        return personal.email || null;
      case "phone":
        return personal.phone || null;
      case "location":
        return personal.location || null;
      case "city": {
        if (!personal.location) return null;
        if (personal.location.includes(",")) {
          return personal.location.split(",")[0].trim();
        }
        return personal.location;
      }
      case "state":
        return "Delhi";
      case "country":
        return "India";
      case "postalCode":
        return "110001";
      case "currentCompany": {
        const currentJob = experience.find((e) => e.current) ?? experience[0];
        return currentJob?.company || null;
      }
      case "previousCompany": {
        const prevJob = experience.find((e) => !e.current) ?? experience[1];
        return prevJob?.company || null;
      }
      case "currentTitle":
        return personal.professionalTitle || null;
      case "experience": {
        const totalMonths = experience.reduce((acc, job) => {
          if (!job.startDate) return acc;
          const start = new Date(job.startDate);
          const end = job.endDate ? new Date(job.endDate) : /* @__PURE__ */ new Date();
          const diff = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
          return acc + Math.max(0, diff);
        }, 0);
        const totalYears = Math.round(totalMonths / 12);
        if (totalYears === 0) return "Fresher";
        if (totalYears === 1) return "1";
        if (totalYears <= 2) return "2";
        if (totalYears <= 3) return "3";
        if (totalYears <= 5) return "5";
        return String(totalYears);
      }
      case "resumeLink":
        return social.linkedin || social.portfolio || null;
      case "linkedin":
        return social.linkedin || null;
      case "github":
        return social.github || null;
      case "portfolio":
        return social.portfolio || null;
      case "bio":
        return personal.bio || null;
      case "skills":
        return skills.length > 0 ? skills.join(", ") : null;
      case "educationDegree":
        return education[0]?.degree || null;
      case "educationSchool":
        return education[0]?.institution || null;
      case "educationGradYear":
        return education[0]?.endDate ? education[0].endDate.slice(0, 4) : null;
      case "workAuth":
        return preferences.workAuthorization || null;
      case "noticePeriod": {
        const val = (preferences.noticePeriod ?? "").trim();
        if (!val) return null;
        if (!options.allowDefaultPreferences && val === DEFAULT_UNCONFIGURED_NOTICE) {
          return null;
        }
        return val;
      }
      case "expectedSalary": {
        const val = (preferences.desiredSalary ?? "").trim();
        if (!val) return null;
        if (!options.allowDefaultPreferences && val === DEFAULT_UNCONFIGURED_SALARY) {
          return null;
        }
        return val;
      }
      default:
        return null;
    }
  }
  function executeAutofill(profile, options = {}) {
    const rootNode = options.root ?? (typeof document !== "undefined" ? document : null);
    if (!rootNode || typeof rootNode.querySelectorAll !== "function") {
      const emptySummary = {
        detectedFields: 0,
        filledFields: 0,
        skippedFields: 0,
        failedFields: 0
      };
      return {
        success: false,
        filledCount: 0,
        totalFieldsFound: 0,
        filledFields: [],
        summary: emptySummary,
        message: "No document available to scan."
      };
    }
    const elements = Array.from(
      rootNode.querySelectorAll(
        "input, textarea, select"
      )
    );
    const filledFields = [];
    let detectedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    for (const el of elements) {
      if (typeof el.closest === "function" && el.closest("#applymate-extension-root")) {
        continue;
      }
      if (el.disabled || el.readOnly) {
        continue;
      }
      const classification = classifyFormField(el);
      if (!classification) continue;
      detectedCount++;
      if (classification.confidence < MIN_AUTOFILL_CONFIDENCE || classification.ambiguous) {
        skippedCount++;
        continue;
      }
      if (!isFieldEmpty(el)) {
        skippedCount++;
        continue;
      }
      const value = resolveValueForField(classification.type, profile, options);
      if (!value) {
        skippedCount++;
        continue;
      }
      const tag = (el.tagName || "").toUpperCase();
      try {
        if (tag === "INPUT" || tag === "TEXTAREA") {
          setNativeValue(el, value);
          dispatchInputEvents(el);
          highlightFilledField(el);
          filledFields.push({
            fieldType: classification.type,
            fieldName: classification.label,
            valueFilled: value,
            success: true
          });
        } else if (tag === "SELECT") {
          const selected = selectBestOption(el, value);
          if (selected) {
            dispatchInputEvents(el);
            highlightFilledField(el);
            filledFields.push({
              fieldType: classification.type,
              fieldName: classification.label,
              valueFilled: value,
              success: true
            });
          } else {
            failedCount++;
          }
        } else {
          skippedCount++;
        }
      } catch {
        failedCount++;
      }
    }
    const summary = {
      detectedFields: detectedCount,
      filledFields: filledFields.length,
      skippedFields: skippedCount,
      failedFields: failedCount
    };
    const success = filledFields.length > 0;
    const message = success ? `Successfully autofilled ${filledFields.length} field${filledFields.length > 1 ? "s" : ""}!` : detectedCount > 0 ? "No empty matching fields needed autofilling." : "No matching fields could be filled on this page.";
    return {
      success,
      filledCount: filledFields.length,
      totalFieldsFound: detectedCount,
      filledFields,
      summary,
      message
    };
  }

  // extension/src/content.ts
  var ext = typeof browser !== "undefined" ? browser : chrome;
  var HOST_ID = "applymate-extension-root";
  var SESSION_HIDE_KEY = "applymate_btn_hidden";
  var shadowRoot = null;
  var isCardOpen = false;
  var isButtonHidden = false;
  var currentFormDetection = detectApplicationForm();
  function getPageSnapshot() {
    currentFormDetection = detectApplicationForm();
    return {
      title: document.title || "(Untitled Page)",
      url: location.href,
      host: location.hostname,
      timestamp: Date.now(),
      formDetection: currentFormDetection
    };
  }
  function reportToBackground() {
    const info = getPageSnapshot();
    console.log(
      `[ApplyMate] Page detected: "${info.title}" (${info.host}) \u2014 Form detected: ${info.formDetection.detected} (${info.formDetection.platform})`
    );
    const msg = {
      type: "PAGE_INFO",
      payload: info
    };
    try {
      ext.runtime.sendMessage(msg).catch(() => {
      });
    } catch {
    }
  }
  var SHADOW_STYLES = `
:host {
  all: initial;
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 2147483647;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  color: #0f172a;
  -webkit-font-smoothing: antialiased;
  box-sizing: border-box;
}

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* \u2500\u2500 Floating Trigger Button \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.applymate-trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #2563eb;
  color: #ffffff;
  border: none;
  border-radius: 9999px;
  padding: 10px 18px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.01em;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(37, 99, 235, 0.35), 0 2px 6px rgba(0, 0, 0, 0.08);
  transition: transform 0.18s cubic-bezier(0.16, 1, 0.3, 1),
              box-shadow 0.18s cubic-bezier(0.16, 1, 0.3, 1),
              background 0.15s ease;
  user-select: none;
  outline: none;
}

.applymate-trigger:hover {
  transform: translateY(-2px);
  background: #1d4ed8;
  box-shadow: 0 8px 24px rgba(37, 99, 235, 0.45), 0 3px 8px rgba(0, 0, 0, 0.12);
}

.applymate-trigger:active {
  transform: translateY(0) scale(0.97);
}

.trigger-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
}

.trigger-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #10b981;
  color: #ffffff;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 9999px;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.badge-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #ffffff;
}

/* \u2500\u2500 In-Page Card / Overlay \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.applymate-card {
  position: absolute;
  bottom: calc(100% + 12px);
  right: 0;
  width: 340px;
  max-width: calc(100vw - 32px);
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  box-shadow: 0 16px 40px -10px rgba(15, 23, 42, 0.18),
              0 6px 16px -4px rgba(15, 23, 42, 0.08);
  overflow: hidden;
  opacity: 0;
  transform: translateY(10px) scale(0.98);
  pointer-events: none;
  transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.applymate-card.open {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}

/* Header */
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 8px;
}

.brand-icon-box {
  width: 26px;
  height: 26px;
  border-radius: 7px;
  background: #2563eb;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-title {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #0f172a;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.icon-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 5px;
  border-radius: 6px;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s;
}

.icon-btn:hover {
  background: #e2e8f0;
  color: #0f172a;
}

/* Body */
.card-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Section cards */
.info-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px;
}

.info-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
  margin-bottom: 4px;
}

.page-title-text {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.page-url-text {
  font-size: 11px;
  color: #64748b;
  margin-top: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

/* Detection status banner */
.detection-banner {
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detection-banner.detected {
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
}

.detection-banner.not-detected {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.banner-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.banner-status-text {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
}

.detection-banner.detected .banner-status-text {
  color: #065f46;
}

.detection-banner.not-detected .banner-status-text {
  color: #475569;
}

.platform-pill {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 9999px;
  background: #2563eb;
  color: #fff;
}

.detection-desc {
  font-size: 11px;
  color: #475569;
  line-height: 1.4;
}

.fields-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 2px;
}

.field-chip {
  font-size: 10px;
  font-weight: 600;
  padding: 3px 7px;
  border-radius: 6px;
  background: #ffffff;
  border: 1px solid #d1fae5;
  color: #047857;
}

/* Card footer */
.card-footer {
  padding: 12px 16px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.btn-autofill {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 9px 14px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  border: none;
  background: #2563eb;
  color: #ffffff;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.1s ease;
}

.btn-autofill:hover {
  background: #1d4ed8;
}

.btn-autofill:active {
  transform: scale(0.97);
}

.btn-autofill.success {
  background: #059669;
}

.btn-autofill:disabled {
  background: #94a3b8;
  cursor: not-allowed;
  opacity: 0.85;
}

.autofill-feedback {
  margin-top: 10px;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 11px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  animation: fadeIn 0.2s ease-out;
}

.autofill-feedback.success {
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  color: #065f46;
}

.autofill-feedback.empty {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #475569;
}

.autofill-summary-header {
  display: flex;
  align-items: center;
  gap: 5px;
  font-weight: 700;
}

.autofill-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 2px;
}

.autofill-chip {
  font-size: 10px;
  font-weight: 600;
  background: #ffffff;
  border: 1px solid #6ee7b7;
  color: #047857;
  padding: 2px 6px;
  border-radius: 4px;
}

.btn-dashboard {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 9px 12px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  background: #ffffff;
  color: #2563eb;
  border: 1px solid #cbd5e1;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.btn-dashboard:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
}

/* Minimized Restore Pill (shown if hidden) */
.restore-pill {
  display: none;
  background: #0f172a;
  color: #ffffff;
  padding: 6px 10px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

.restore-pill:hover {
  background: #1e293b;
}

/* Responsive adjustments */
@media (max-width: 480px) {
  :host {
    bottom: 16px;
    right: 16px;
  }
  .applymate-card {
    right: -4px;
    width: calc(100vw - 24px);
  }
}
`;
  function renderUI() {
    if (!shadowRoot) return;
    const info = getPageSnapshot();
    const form = info.formDetection;
    shadowRoot.innerHTML = `
    <style>${SHADOW_STYLES}</style>

    <!-- Floating Trigger Button -->
    <div id="trigger-container" style="${isButtonHidden ? "display: none;" : "display: block;"}">
      <button class="applymate-trigger" id="btn-trigger" aria-label="Open ApplyMate">
        <span class="trigger-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="20" height="14" x="2" y="6" rx="2"/>
            <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
          </svg>
        </span>
        <span>ApplyMate</span>
        ${form.detected ? `<span class="trigger-badge"><span class="badge-dot"></span> Form</span>` : ""}
      </button>

      <!-- In-Page Card (Popover) -->
      <div class="applymate-card ${isCardOpen ? "open" : ""}" id="applymate-card" role="dialog" aria-modal="true" aria-label="ApplyMate Assistant">
        <!-- Header -->
        <div class="card-header">
          <div class="header-brand">
            <div class="brand-icon-box">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <rect width="20" height="14" x="2" y="6" rx="2"/>
                <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
              </svg>
            </div>
            <span class="brand-title">ApplyMate</span>
          </div>
          <div class="header-actions">
            <button class="icon-btn" id="btn-hide" title="Hide floating button for this session" aria-label="Hide button">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            </button>
            <button class="icon-btn" id="btn-close" title="Close" aria-label="Close card">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Body -->
        <div class="card-body">
          <!-- Page Info -->
          <div class="info-box">
            <div class="info-label">Current Page</div>
            <div class="page-title-text" title="${info.title}">${info.title}</div>
            <div class="page-url-text" title="${info.url}">${info.url}</div>
          </div>

          <!-- Form Detection Status -->
          <div class="detection-banner ${form.detected ? "detected" : "not-detected"}">
            <div class="banner-title-row">
              <div class="banner-status-text">
                ${form.detected ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                       <span>Application Form Detected</span>` : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                       <span>No Form Detected</span>`}
              </div>
              ${form.platform !== "None" ? `<span class="platform-pill">${form.platform}</span>` : ""}
            </div>

            <div class="detection-desc">
              ${form.detected ? `Identified ${form.fieldsCount} form input(s) matching candidate profile fields.` : `Navigate to an online job application or posting form to autofill.`}
            </div>

            ${form.detected && form.detectedFields.length > 0 ? `<div class="fields-chip-list">
                    ${form.detectedFields.map((f) => `<span class="field-chip">${f}</span>`).join("")}
                  </div>` : ""}
          </div>

          <!-- Autofill Feedback Slot -->
          <div id="autofill-feedback"></div>
        </div>

        <!-- Footer -->
        <div class="card-footer">
          <button class="btn-autofill" id="btn-autofill" title="Autofill form with ApplyMate profile">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
            </svg>
            <span id="btn-autofill-text">Autofill Form</span>
          </button>
          <a href="http://localhost:3000/profile" target="_blank" rel="noreferrer" class="btn-dashboard" title="Open ApplyMate Candidate Profile">
            <span>Profile</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </a>
        </div>
      </div>
    </div>

    <!-- Hidden Restore Pill -->
    <div id="btn-restore" class="restore-pill" style="${isButtonHidden ? "display: flex;" : "display: none;"}">
      <span>ApplyMate</span>
    </div>
  `;
    attachEventHandlers();
  }
  function displayAutofillFeedback(result) {
    if (!shadowRoot) return;
    const feedbackContainer = shadowRoot.getElementById("autofill-feedback");
    const btnAutofill = shadowRoot.getElementById("btn-autofill");
    if (btnAutofill) {
      if (result.success) {
        btnAutofill.classList.add("success");
        btnAutofill.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 6 9 17l-5-5"/>
        </svg>
        <span>Autofilled (${result.filledCount})</span>
      `;
      } else {
        btnAutofill.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span>No Fields Found</span>
      `;
      }
    }
    if (feedbackContainer) {
      if (result.success) {
        feedbackContainer.className = "autofill-feedback success";
        feedbackContainer.innerHTML = `
        <div class="autofill-summary-header">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 6 9 17l-5-5"/>
          </svg>
          <span>${result.message}</span>
        </div>
        <div class="autofill-chips">
          ${result.filledFields.map(
          (f) => `<span class="autofill-chip">${f.fieldName}: ${f.valueFilled.length > 20 ? f.valueFilled.slice(0, 18) + "\u2026" : f.valueFilled}</span>`
        ).join("")}
        </div>
      `;
      } else {
        feedbackContainer.className = "autofill-feedback empty";
        feedbackContainer.innerHTML = `
        <div class="autofill-summary-header">
          <span>${result.message}</span>
        </div>
      `;
      }
    }
  }
  async function triggerAutofill() {
    let profile = null;
    try {
      const res = await ext.runtime.sendMessage({ type: "GET_PROFILE" });
      if (res?.type === "GET_PROFILE_RES" && res.payload) {
        profile = res.payload;
      }
    } catch {
    }
    const profileToUse = profile ?? DEFAULT_PROFILE;
    const result = executeAutofill(profileToUse);
    displayAutofillFeedback(result);
    return result;
  }
  function attachEventHandlers() {
    if (!shadowRoot) return;
    const btnTrigger = shadowRoot.getElementById("btn-trigger");
    const btnClose = shadowRoot.getElementById("btn-close");
    const btnHide = shadowRoot.getElementById("btn-hide");
    const btnRestore = shadowRoot.getElementById("btn-restore");
    const btnAutofill = shadowRoot.getElementById("btn-autofill");
    const card = shadowRoot.getElementById("applymate-card");
    btnTrigger?.addEventListener("click", (e) => {
      e.stopPropagation();
      isCardOpen = !isCardOpen;
      if (isCardOpen) {
        card?.classList.add("open");
        reportToBackground();
      } else {
        card?.classList.remove("open");
      }
    });
    btnAutofill?.addEventListener("click", async (e) => {
      e.stopPropagation();
      const btnText = shadowRoot?.getElementById("btn-autofill-text");
      if (btnText) btnText.textContent = "Autofilling\u2026";
      await triggerAutofill();
    });
    btnClose?.addEventListener("click", (e) => {
      e.stopPropagation();
      isCardOpen = false;
      card?.classList.remove("open");
    });
    btnHide?.addEventListener("click", (e) => {
      e.stopPropagation();
      isButtonHidden = true;
      isCardOpen = false;
      try {
        sessionStorage.setItem(SESSION_HIDE_KEY, "true");
      } catch {
      }
      renderUI();
    });
    btnRestore?.addEventListener("click", (e) => {
      e.stopPropagation();
      isButtonHidden = false;
      try {
        sessionStorage.removeItem(SESSION_HIDE_KEY);
      } catch {
      }
      renderUI();
    });
    window.addEventListener(
      "click",
      (e) => {
        if (!isCardOpen) return;
        const path = e.composedPath();
        const host = document.getElementById(HOST_ID);
        if (host && !path.includes(host)) {
          isCardOpen = false;
          card?.classList.remove("open");
        }
      },
      { capture: true }
    );
  }
  function initApplyMate() {
    const isSupported = isSupportedJobSite();
    if (!isSupported) {
      return;
    }
    try {
      isButtonHidden = sessionStorage.getItem(SESSION_HIDE_KEY) === "true";
    } catch {
      isButtonHidden = false;
    }
    let host = document.getElementById(HOST_ID);
    if (!host) {
      host = document.createElement("div");
      host.id = HOST_ID;
      shadowRoot = host.attachShadow({ mode: "open" });
      document.documentElement.appendChild(host);
    } else if (!shadowRoot && host.shadowRoot) {
      shadowRoot = host.shadowRoot;
    }
    renderUI();
    reportToBackground();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApplyMate);
  } else {
    initApplyMate();
  }
  var debounceTimer = null;
  function handleDomChange() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const prev = currentFormDetection.detected;
      currentFormDetection = detectApplicationForm();
      if (prev !== currentFormDetection.detected || !document.getElementById(HOST_ID)) {
        initApplyMate();
      }
    }, 350);
  }
  window.addEventListener("popstate", handleDomChange);
  window.addEventListener("hashchange", handleDomChange);
  var observer = new MutationObserver(handleDomChange);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
  ext.runtime.onMessage.addListener(
    (message, _sender, sendResponse) => {
      if (message.type === "PAGE_INFO_REQ") {
        sendResponse({ type: "PAGE_INFO_RES", payload: getPageSnapshot() });
        return false;
      }
      if (message.type === "TRIGGER_AUTOFILL") {
        triggerAutofill().then((res) => {
          const response = {
            type: "AUTOFILL_RES",
            payload: res
          };
          sendResponse(response);
        });
        return true;
      }
      return false;
    }
  );
})();
