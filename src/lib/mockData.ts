export interface ActivityItem {
  id: string;
  type: "autofill" | "application" | "profile" | "resume";
  title: string;
  description: string;
  timestamp: string;
  badge?: string;
  badgeVariant?: "success" | "info" | "warning" | "default";
}

export interface TrackedApplication {
  id: string;
  company: string;
  logoUrl?: string;
  position: string;
  location: string;
  appliedDate: string;
  platform: "Greenhouse" | "Lever" | "Workday" | "Ashby" | "LinkedIn";
  status: "Interviewing" | "Applied" | "In Review" | "Offer" | "Rejected";
  autofillTimeSeconds?: number;
  salaryRange?: string;
  notes?: string;
}

export interface UserProfileData {
  firstName: string;
  lastName: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  portfolio: string;
  linkedin: string;
  github: string;
  summary: string;
  workAuthorization: string;
  noticePeriod: string;
  desiredSalary: string;
  completionRate: number;
}

export interface ResumeItem {
  id: string;
  title: string;
  fileName: string;
  uploadedAt: string;
  fileSize: string;
  isDefault: boolean;
  atsScore: number;
  extractedSkillsCount: number;
  experiencesCount: number;
}

export const initialProfile: UserProfileData = {
  firstName: "Naitik",
  lastName: "Khoriya",
  headline: "QA Automation Engineer | SDET (Frontend & API)",
  email: "ethicalkhoriya@gmail.com",
  phone: "+91 7877816484",
  location: "Delhi, India",
  portfolio: "https://naitik.dev",
  linkedin: "https://linkedin.com/in/naitik",
  github: "https://github.com/naitik",
  summary:
    "QA Automation Engineer and SDET specialising in frontend and API testing. Experienced with Jest, Playwright, Selenium, and TypeScript. Passionate about building reliable test automation frameworks and improving software quality.",
  workAuthorization: "Authorized to work in India",
  noticePeriod: "Available immediately / 2 weeks",
  desiredSalary: "Competitive / Negotiable",
  completionRate: 92,
};

export const initialExperiences = [
  {
    id: "exp-1",
    company: "Stripe",
    role: "Senior Software Engineer",
    period: "2023 - Present",
    location: "San Francisco, CA",
    description:
      "Led the core dashboard frontend team delivering real-time merchant analytics and checkout optimization with Next.js and TypeScript.",
    skills: ["React", "TypeScript", "Next.js", "GraphQL", "Tailwind CSS"],
  },
  {
    id: "exp-2",
    company: "Linear",
    role: "Frontend Engineer",
    period: "2021 - 2023",
    location: "Remote",
    description:
      "Architected keyboard-first desktop interactions, offline synchronization engine, and real-time collaboration canvas.",
    skills: ["TypeScript", "WebSockets", "IndexedDB", "React", "State Machines"],
  },
  {
    id: "exp-3",
    company: "Airbnb",
    role: "Software Engineer",
    period: "2019 - 2021",
    location: "San Francisco, CA",
    description:
      "Engineered design system primitives and search discovery performance optimizations accessed by millions of daily travelers.",
    skills: ["React", "JavaScript", "Redux", "Jest", "CSS Modules"],
  },
];

export const initialEducation = [
  {
    id: "edu-1",
    school: "University of California, Berkeley",
    degree: "B.S. in Computer Science",
    period: "2015 - 2019",
    gpa: "3.85 / 4.0",
  },
];

export const initialSkills = [
  "React",
  "Next.js",
  "TypeScript",
  "JavaScript",
  "Tailwind CSS",
  "Node.js",
  "GraphQL",
  "PostgreSQL",
  "Safari Web Extensions",
  "HTML5 / CSS3",
  "REST APIs",
  "Git",
  "Docker",
  "Jest / Playwright",
  "Performance Optimization",
];

export const initialResumes: ResumeItem[] = [
  {
    id: "res-1",
    title: "Primary Full Stack & Frontend Resume",
    fileName: "Naitik_Senior_Engineer_2026.pdf",
    uploadedAt: "Nov 21, 2026",
    fileSize: "148 KB",
    isDefault: true,
    atsScore: 94,
    extractedSkillsCount: 22,
    experiencesCount: 3,
  },
  {
    id: "res-2",
    title: "Specialized Web Platform & Tooling Resume",
    fileName: "Naitik_Platform_Engineer_2026.pdf",
    uploadedAt: "Oct 15, 2026",
    fileSize: "135 KB",
    isDefault: false,
    atsScore: 89,
    extractedSkillsCount: 19,
    experiencesCount: 3,
  },
];

export const initialApplications: TrackedApplication[] = [
  {
    id: "app-1",
    company: "Vercel",
    position: "Senior Frontend Engineer, Next.js",
    location: "Remote (US)",
    appliedDate: "Yesterday",
    platform: "Greenhouse",
    status: "Interviewing",
    autofillTimeSeconds: 14,
    salaryRange: "$175k - $200k",
  },
  {
    id: "app-2",
    company: "Figma",
    position: "Product Infrastructure Engineer",
    location: "San Francisco, CA",
    appliedDate: "3 days ago",
    platform: "Lever",
    status: "Interviewing",
    autofillTimeSeconds: 11,
    salaryRange: "$180k - $210k",
  },
  {
    id: "app-3",
    company: "Stripe",
    position: "Staff Software Engineer, Connect",
    location: "South San Francisco, CA",
    appliedDate: "Nov 18, 2026",
    platform: "Greenhouse",
    status: "In Review",
    autofillTimeSeconds: 18,
    salaryRange: "$190k - $230k",
  },
  {
    id: "app-4",
    company: "Apple",
    position: "WebKit & Safari Tools Developer",
    location: "Cupertino, CA",
    appliedDate: "Nov 15, 2026",
    platform: "Workday",
    status: "Offer",
    autofillTimeSeconds: 26,
    salaryRange: "$185k - $220k",
  },
  {
    id: "app-5",
    company: "Airbnb",
    position: "Senior UI Framework Engineer",
    location: "Remote",
    appliedDate: "Nov 10, 2026",
    platform: "Greenhouse",
    status: "Applied",
    autofillTimeSeconds: 15,
  },
  {
    id: "app-6",
    company: "Linear",
    position: "Founding Sync Engineer",
    location: "Remote",
    appliedDate: "Nov 04, 2026",
    platform: "Ashby",
    status: "In Review",
    autofillTimeSeconds: 9,
  },
];

export const initialActivities: ActivityItem[] = [
  {
    id: "act-1",
    type: "autofill",
    title: "Autofilled 18 fields on Greenhouse",
    description: "Vercel — Senior Frontend Engineer role application",
    timestamp: "2 hours ago",
    badge: "14s saved",
    badgeVariant: "success",
  },
  {
    id: "act-2",
    type: "application",
    title: "Application status updated to Interviewing",
    description: "Figma — Product Infrastructure Engineer",
    timestamp: "Yesterday",
    badge: "Stage 2",
    badgeVariant: "info",
  },
  {
    id: "act-3",
    type: "resume",
    title: "Resume parsed & ATS scored",
    description: "Naitik_Senior_Engineer_2026.pdf verified with 94% match",
    timestamp: "2 days ago",
    badge: "ATS 94",
    badgeVariant: "success",
  },
  {
    id: "act-4",
    type: "profile",
    title: "Work experience updated",
    description: "Added recent accomplishments to Stripe role entry",
    timestamp: "3 days ago",
  },
];

