/**
 * ApplyMate — Test Fixture Profile
 *
 * Used strictly by automated tests in `tests/`.
 * Production runtime starts from `EMPTY_PROFILE`.
 */

import type { CandidateProfile } from "../../src/types/profile.ts";

export const SAMPLE_PROFILE: CandidateProfile = {
  personal: {
    firstName: "Naitik",
    lastName: "Khoriya",
    professionalTitle: "QA Automation Engineer | SDET (Frontend & API)",
    email: "ethicalkhoriya@gmail.com",
    phone: "+91 7877816484",
    location: "Delhi, India",
    bio: "QA Automation Engineer and SDET specialising in frontend and API testing. Experienced with Jest, Playwright, Selenium, and TypeScript. Passionate about building reliable test automation frameworks and improving software quality.",
  },
  social: {
    linkedin: "https://linkedin.com/in/naitik",
    github: "https://github.com/naitik",
    portfolio: "https://naitik.dev",
  },
  experience: [
    {
      id: "exp-1",
      company: "Fibe India",
      role: "Software Engineer Intern (Testing & Automation Focus)",
      startDate: "2026-05",
      endDate: "",
      current: true,
      description:
        "Working on test automation for the Fibe consumer lending platform, covering regression testing, API testing, and CI/CD pipeline integration.",
      skills: ["Jest", "Playwright", "TypeScript", "REST APIs", "CI/CD"],
    },
    {
      id: "exp-2",
      company: "Aigetai Private Limited",
      role: "Frontend Developer (Freelance)",
      startDate: "2026-02",
      endDate: "2026-05",
      current: false,
      description:
        "Developed responsive React.js web interfaces and integrated REST APIs. Collaborated with the design team to deliver pixel-accurate UI components.",
      skills: ["React.js", "JavaScript", "TypeScript", "REST APIs", "Node.js"],
    },
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
      grade: "",
    },
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
    "Test Automation",
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
      "Frontend Developer",
    ],
    willingToRelocate: true,
  },
  updatedAt: "2026-11-26T00:00:00.000Z",
};

