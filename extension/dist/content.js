"use strict";
(() => {
  // extension/autofill/fieldClassifier.ts
  var PATTERN_RULES = [
    // 1. Resume / CV Links (e.g. Credit Samadhaan "Link to your CV (Google Drive, LinkedIn")
    {
      type: "resumeLink",
      label: "CV / Resume Link",
      regex: /\b(link\s*to\s*(your\s*)?(cv|resume)|cv\s*link|resume\s*link|drive\s*link|google\s*drive.*cv|resume\s*url|cv\s*url|upload\s*cv\s*link)\b/i,
      priority: 10
    },
    // 2. LinkedIn URL
    {
      type: "linkedin",
      label: "LinkedIn Profile",
      regex: /\b(linkedin(\.com)?|linked_in|linkedin\s*url|linkedin\s*profile)\b/i,
      priority: 9
    },
    // 3. GitHub URL
    {
      type: "github",
      label: "GitHub Profile",
      regex: /\b(github(\.com)?|git_hub|github\s*url|github\s*profile)\b/i,
      priority: 9
    },
    // 4. Portfolio / Personal Website
    {
      type: "portfolio",
      label: "Portfolio / Website",
      regex: /\b(portfolio(\s*url|\s*link|\s*website)?|personal\s*(site|website|url)|your\s*website|website\s*url|blog\s*url)\b/i,
      priority: 8
    },
    // 5. Email Address
    {
      type: "email",
      label: "Email Address",
      regex: /\b(email|e-mail|email\s*address|work\s*email|candidate\s*email)\b/i,
      priority: 10
    },
    // 6. Mobile / Phone Number
    {
      type: "phone",
      label: "Mobile / Phone Number",
      regex: /\b(mobile(\s*number)?|phone(\s*number)?|contact(\s*number)?|cell(\s*phone)?|telephone|whatsapp(\s*number)?)\b/i,
      priority: 10
    },
    // 7. Full Name
    {
      type: "fullName",
      label: "Full Name",
      regex: /\b(full\s*name|your\s*name|candidate\s*name|applicant\s*name|complete\s*name|legal\s*name)\b/i,
      priority: 9
    },
    // 8. First Name
    {
      type: "firstName",
      label: "First Name",
      regex: /\b(first\s*name|given\s*name|fname|forename)\b/i,
      priority: 9
    },
    // 9. Last Name
    {
      type: "lastName",
      label: "Last Name",
      regex: /\b(last\s*name|family\s*name|surname|lname)\b/i,
      priority: 9
    },
    // 10. Current City / Location
    {
      type: "city",
      label: "Current City",
      regex: /\b(current\s*city|city|current\s*location|town|metro\s*area)\b/i,
      priority: 8
    },
    // 11. State / Region
    {
      type: "state",
      label: "State / Region",
      regex: /\b(state|province|region)\b/i,
      priority: 7
    },
    // 12. Country
    {
      type: "country",
      label: "Country",
      regex: /\b(country|nationality|nation)\b/i,
      priority: 7
    },
    // 13. Postal Code / Zip / Pin code
    {
      type: "postalCode",
      label: "Postal / Pin Code",
      regex: /\b(pin\s*code|pincode|postal\s*code|zip(\s*code)?)\b/i,
      priority: 8
    },
    // 14. Experience (Years / Level)
    {
      type: "experience",
      label: "Work Experience",
      regex: /\b(experience(\s*in\s*years|\s*level)?|years\s*of\s*experience|total\s*experience|work\s*experience)\b/i,
      priority: 9
    },
    // 15. Bio / About Yourself / Cover Letter (e.g. Credit Samadhaan "Tell us a little about yourself...")
    {
      type: "bio",
      label: "About Yourself / Summary",
      regex: /\b(tell\s*us\s*(a\s*little\s*)?about\s*yourself|about\s*you(rself)?|why\s*(you'?d|do\s*you)\s*like\s*to\s*join|cover\s*letter|professional\s*summary|bio|candidate\s*note|statement)\b/i,
      priority: 8
    },
    // 16. Current Job Title / Position
    {
      type: "currentTitle",
      label: "Position / Job Title",
      regex: /\b(position(\s*applied|\s*for)?|current\s*role|current\s*title|designation|current\s*job\s*title|headline)\b/i,
      priority: 7
    },
    // 17. Skills
    {
      type: "skills",
      label: "Skills / Technologies",
      regex: /\b(skills|key\s*skills|technical\s*skills|technologies|tools|competencies)\b/i,
      priority: 8
    },
    // 18. Degree / Qualification
    {
      type: "educationDegree",
      label: "Degree / Qualification",
      regex: /\b(degree|highest\s*(education|qualification)|education\s*level|major|field\s*of\s*study)\b/i,
      priority: 7
    },
    // 19. University / College
    {
      type: "educationSchool",
      label: "University / Institution",
      regex: /\b(university|college|institution|school(\s*name)?)\b/i,
      priority: 7
    },
    // 20. Graduation Year
    {
      type: "educationGradYear",
      label: "Graduation Year",
      regex: /\b(graduation\s*year|grad\s*year|year\s*of\s*passing|batch)\b/i,
      priority: 7
    },
    // 21. Work Authorization
    {
      type: "workAuth",
      label: "Work Authorization",
      regex: /\b(work\s*authorization|legally\s*authorized|visa\s*sponsorship|sponsorship\s*required|right\s*to\s*work)\b/i,
      priority: 8
    },
    // 22. Notice Period / Availability
    {
      type: "noticePeriod",
      label: "Notice Period",
      regex: /\b(notice\s*period|how\s*soon\s*can\s*you\s*join|availability(\s*to\s*join)?|start\s*date)\b/i,
      priority: 8
    },
    // 23. Expected Salary / CTC
    {
      type: "expectedSalary",
      label: "Expected Salary",
      regex: /\b(expected\s*salary|desired\s*salary|expected\s*ctc|desired\s*ctc|salary\s*expectation|compensation)\b/i,
      priority: 8
    }
  ];
  function extractCueText(el) {
    let labelText = "";
    let placeholderText = "";
    const nameText = (el.getAttribute("name") ?? "").toLowerCase();
    const idText = (el.id ?? "").toLowerCase();
    const ariaText = [
      el.getAttribute("aria-label") ?? "",
      el.getAttribute("aria-description") ?? ""
    ].join(" ").toLowerCase();
    const autocompleteText = (el.getAttribute("autocomplete") ?? "").toLowerCase();
    if ("placeholder" in el && typeof el.placeholder === "string") {
      placeholderText = (el.placeholder ?? "").toLowerCase();
    }
    if (el.id && typeof document !== "undefined") {
      try {
        const escapedId = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(el.id) : el.id;
        const explicitLabel = document.querySelector(`label[for="${escapedId}"]`);
        if (explicitLabel?.textContent) {
          labelText += " " + explicitLabel.textContent.trim();
        }
      } catch {
      }
    }
    if (typeof el.closest === "function") {
      const parentLabel = el.closest("label");
      if (parentLabel?.textContent) {
        labelText += " " + parentLabel.textContent.trim();
      }
    }
    if (typeof document !== "undefined") {
      const labelledBy = el.getAttribute("aria-labelledby");
      if (labelledBy) {
        try {
          const refEl = document.getElementById(labelledBy);
          if (refEl?.textContent) {
            labelText += " " + refEl.textContent.trim();
          }
        } catch {
        }
      }
    }
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
      autocompleteText
    ].join(" ").toLowerCase().replace(/\s+/g, " ");
    return {
      labelText,
      placeholderText,
      nameText,
      idText,
      ariaText,
      autocompleteText,
      combined
    };
  }
  function classifyFormField(el) {
    const inputType = ("type" in el ? String(el.type) : "").toLowerCase();
    if (inputType === "hidden" || inputType === "submit" || inputType === "button" || inputType === "reset" || inputType === "file") {
      return null;
    }
    const cues = extractCueText(el);
    if (inputType === "email") {
      return { type: "email", label: "Email Address", confidence: 0.98 };
    }
    if (inputType === "tel") {
      return { type: "phone", label: "Mobile / Phone Number", confidence: 0.95 };
    }
    const sortedRules = [...PATTERN_RULES].sort((a, b) => b.priority - a.priority);
    for (const rule of sortedRules) {
      if (cues.placeholderText && rule.regex.test(cues.placeholderText)) {
        return {
          type: rule.type,
          label: rule.label,
          confidence: 0.95
        };
      }
      if (cues.labelText && rule.regex.test(cues.labelText)) {
        return {
          type: rule.type,
          label: rule.label,
          confidence: 0.94
        };
      }
      if (rule.regex.test(cues.combined)) {
        return {
          type: rule.type,
          label: rule.label,
          confidence: 0.88
        };
      }
    }
    if (cues.combined.includes("name") && !cues.combined.includes("username") && !cues.combined.includes("company")) {
      return {
        type: "fullName",
        label: "Full Name",
        confidence: 0.75
      };
    }
    return null;
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

  // extension/autofill/autofillEngine.ts
  function setNativeValue(element, value) {
    const valueSetter = Object.getOwnPropertyDescriptor(element, "value")?.set;
    const prototype = Object.getPrototypeOf(element);
    const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
      prototypeValueSetter.call(element, value);
    } else if (valueSetter) {
      valueSetter.call(element, value);
    } else {
      element.value = value;
    }
  }
  function selectBestOption(selectEl, targetValue) {
    const lowerTarget = targetValue.toLowerCase().trim();
    const options = Array.from(selectEl.options);
    for (let i = 0; i < options.length; i++) {
      const opt = options[i];
      const text = opt.text.toLowerCase().trim();
      const val = opt.value.toLowerCase().trim();
      if (text === lowerTarget || val === lowerTarget) {
        selectEl.selectedIndex = i;
        return true;
      }
    }
    for (let i = 0; i < options.length; i++) {
      const opt = options[i];
      const text = opt.text.toLowerCase().trim();
      const val = opt.value.toLowerCase().trim();
      if (lowerTarget && (text.includes(lowerTarget) || lowerTarget.includes(text)) || val && (val.includes(lowerTarget) || lowerTarget.includes(val))) {
        selectEl.selectedIndex = i;
        return true;
      }
    }
    return false;
  }
  function dispatchInputEvents(el) {
    el.dispatchEvent(new Event("focus", { bubbles: true }));
    el.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
    el.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
    el.dispatchEvent(new Event("blur", { bubbles: true }));
  }
  function highlightFilledField(el) {
    const originalOutline = el.style.outline;
    const originalBoxShadow = el.style.boxShadow;
    const originalTransition = el.style.transition;
    el.style.transition = "outline 0.2s ease, box-shadow 0.2s ease";
    el.style.outline = "2px solid #10b981";
    el.style.boxShadow = "0 0 0 3px rgba(16, 185, 129, 0.25)";
    setTimeout(() => {
      el.style.outline = originalOutline;
      el.style.boxShadow = originalBoxShadow;
      el.style.transition = originalTransition;
    }, 3500);
  }
  function resolveValueForField(type, profile) {
    const { personal, social, experience, education, preferences, skills } = profile;
    switch (type) {
      case "fullName":
        return `${personal.firstName} ${personal.lastName}`.trim();
      case "firstName":
        return personal.firstName;
      case "lastName":
        return personal.lastName;
      case "email":
        return personal.email;
      case "phone":
        return personal.phone;
      case "city": {
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
      case "currentTitle":
        return personal.professionalTitle;
      case "experience": {
        if (experience.length > 0) {
          return `${experience.length} Year${experience.length > 1 ? "s" : ""}`;
        }
        return "1 Year";
      }
      case "resumeLink":
        return social.linkedin || social.portfolio || "https://linkedin.com/in/naitik";
      case "linkedin":
        return social.linkedin;
      case "github":
        return social.github;
      case "portfolio":
        return social.portfolio;
      case "bio":
        return personal.bio;
      case "skills":
        return skills.join(", ");
      case "educationDegree":
        return education[0]?.degree ?? "B.Tech";
      case "educationSchool":
        return education[0]?.institution ?? "Bikaner Technical University";
      case "educationGradYear":
        return education[0]?.endDate ? education[0].endDate.slice(0, 4) : "2025";
      case "workAuth":
        return preferences.workAuthorization;
      case "noticePeriod":
        return preferences.noticePeriod;
      case "expectedSalary":
        return preferences.desiredSalary;
      default:
        return null;
    }
  }
  function executeAutofill(profile) {
    const elements = Array.from(
      document.querySelectorAll(
        "input, textarea, select"
      )
    );
    const filledFields = [];
    let totalCandidates = 0;
    for (const el of elements) {
      if (el.type === "hidden" || el.type === "submit" || el.type === "button" || el.type === "reset" || el.type === "file" || el.disabled || el.closest("#applymate-extension-root")) {
        continue;
      }
      const classification = classifyFormField(el);
      if (!classification) continue;
      totalCandidates++;
      const value = resolveValueForField(classification.type, profile);
      if (!value) continue;
      let wasFilled = false;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        setNativeValue(el, value);
        dispatchInputEvents(el);
        highlightFilledField(el);
        wasFilled = true;
      } else if (el instanceof HTMLSelectElement) {
        const selected = selectBestOption(el, value);
        if (selected) {
          dispatchInputEvents(el);
          highlightFilledField(el);
          wasFilled = true;
        }
      }
      if (wasFilled) {
        filledFields.push({
          fieldType: classification.type,
          fieldName: classification.label,
          valueFilled: value,
          success: true
        });
      }
    }
    const checkboxes = Array.from(document.querySelectorAll("input[type='checkbox']"));
    for (const cb of checkboxes) {
      if (cb.disabled || cb.checked || cb.closest("#applymate-extension-root")) continue;
      const parentText = (cb.closest("label")?.textContent || cb.parentElement?.textContent || "").toLowerCase();
      if (parentText.includes("agree") || parentText.includes("consent") || parentText.includes("contact") || parentText.includes("terms") || parentText.includes("privacy")) {
        cb.checked = true;
        cb.dispatchEvent(new Event("change", { bubbles: true }));
        highlightFilledField(cb);
      }
    }
    const success = filledFields.length > 0;
    const message = success ? `Successfully autofilled ${filledFields.length} field${filledFields.length > 1 ? "s" : ""}!` : "No matching fields could be filled on this page.";
    return {
      success,
      filledCount: filledFields.length,
      totalFieldsFound: totalCandidates,
      filledFields,
      message
    };
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
