/**
 * ApplyMate — Deterministic Cover Letter & Application Email Generator
 *
 * Browser-safe (zero server secrets or Node globals).
 * Generates natural, concise, recruiter-friendly cover letters and application
 * emails grounded strictly in verified candidate profile details.
 */

import type { CandidateProfile } from "@/types/profile";

export type CoverLetterFormat = "cover_letter" | "application_email";

export interface CoverLetterJobContext {
  companyName?: string;
  jobTitle?: string;
  jobDescription?: string;
  requiredSkills?: string[];
  preferredSkills?: string[];
}

export interface CoverLetterRequest {
  format: CoverLetterFormat;
  profile: CandidateProfile;
  jobContext?: CoverLetterJobContext;
  variant?: number;
  useAI?: boolean;
}

export interface CoverLetterResult {
  content: string;
  subject?: string;
  format: CoverLetterFormat;
  mode: "local" | "ai";
}

export function buildSignature(profile: CandidateProfile): string {
  const { personal, social } = profile;
  const fullName = `${personal.firstName} ${personal.lastName}`.trim();
  const lines = [
    fullName,
    personal.professionalTitle,
    `Email: ${personal.email}`,
    `Phone: ${personal.phone}`,
    `Location: ${personal.location}`,
  ];

  const links = [social.linkedin, social.github, social.portfolio].filter(Boolean);
  if (links.length > 0) {
    lines.push(links.join(" | "));
  }

  return lines.filter(Boolean).join("\n");
}

function pickMatchingSkills(
  profileSkills: string[],
  jobContext?: CoverLetterJobContext
): string[] {
  const targetPool = [
    ...(jobContext?.requiredSkills ?? []),
    ...(jobContext?.preferredSkills ?? []),
  ].map((s) => s.toLowerCase());

  const descLower = (jobContext?.jobDescription ?? "").toLowerCase();

  const matched = profileSkills.filter((skill) => {
    const lower = skill.toLowerCase();
    return targetPool.includes(lower) || (descLower && descLower.includes(lower));
  });

  if (matched.length >= 3) return matched.slice(0, 5);

  const combined = [...matched];
  for (const s of profileSkills) {
    if (!combined.includes(s)) combined.push(s);
    if (combined.length >= 5) break;
  }
  return combined;
}

export function generateLocalCoverLetter(
  input: CoverLetterRequest
): CoverLetterResult {
  const { format, profile, jobContext, variant = 0 } = input;
  const { personal, experience, education, skills } = profile;

  const fullName = `${personal.firstName} ${personal.lastName}`.trim();
  const roleTitle =
    jobContext?.jobTitle?.trim() || personal.professionalTitle.split("|")[0].trim();
  const company = jobContext?.companyName?.trim() || "your team";
  const hasSpecificCompany = Boolean(jobContext?.companyName?.trim());

  const topSkills = pickMatchingSkills(skills, jobContext);
  const skillsPhrase =
    topSkills.length > 1
      ? `${topSkills.slice(0, -1).join(", ")}, and ${topSkills[topSkills.length - 1]}`
      : topSkills[0] ?? "";

  const latestExp = experience[0];
  const latestEdu = education[0];

  const openings = [
    hasSpecificCompany
      ? `I am writing to express my interest in the ${roleTitle} position at ${company}.`
      : `I am writing to apply for the ${roleTitle} position.`,
    hasSpecificCompany
      ? `I would like to submit my application for the ${roleTitle} role at ${company}.`
      : `I am excited to apply for the ${roleTitle} opportunity.`,
    hasSpecificCompany
      ? `With a background in ${personal.professionalTitle}, I am eager to be considered for the ${roleTitle} role at ${company}.`
      : `With my background as a ${personal.professionalTitle}, I am eager to apply for the ${roleTitle} role.`,
  ];

  const closings = [
    hasSpecificCompany
      ? `I would welcome the opportunity to discuss how my background aligns with ${company}'s engineering goals. Thank you for your time and consideration.`
      : `I would welcome the chance to discuss how my skills and experience can contribute to your team. Thank you for your time and consideration.`,
    hasSpecificCompany
      ? `Thank you for reviewing my application. I look forward to the possibility of speaking with the ${company} hiring team.`
      : `Thank you for your consideration. I would be glad to share more about my work in an interview.`,
    `Thank you for your time. I am available at your convenience to discuss this role further.`,
  ];

  const idx = Math.abs(variant) % openings.length;
  const opening = openings[idx];
  const closing = closings[idx];

  const expSentence = latestExp
    ? `Most recently, as a ${latestExp.role} at ${latestExp.company}, I worked on ${latestExp.description.charAt(0).toLowerCase() + latestExp.description.slice(1)}`
    : `As a ${personal.professionalTitle}, I bring hands-on experience building and testing reliable web applications.`;

  const eduAndSkillsSentence = [
    latestEdu
      ? `I hold a ${latestEdu.degree} in ${latestEdu.fieldOfStudy} from ${latestEdu.institution}`
      : "",
    skillsPhrase ? `and work regularly with ${skillsPhrase}.` : ".",
  ]
    .filter(Boolean)
    .join(" ");

  const signature = buildSignature(profile);
  const subject = hasSpecificCompany
    ? `Application for ${roleTitle} — ${fullName}`
    : `Job Application: ${roleTitle} — ${fullName}`;

  const bodyLines = [
    "Dear Hiring Team,",
    "",
    opening,
    "",
    `${expSentence} ${eduAndSkillsSentence}`.trim(),
    "",
    closing,
    "",
    "Sincerely,",
    signature,
  ];

  const content =
    format === "application_email"
      ? `Subject: ${subject}\n\n${bodyLines.join("\n")}`
      : bodyLines.join("\n");

  return {
    content,
    subject: format === "application_email" ? subject : undefined,
    format,
    mode: "local",
  };
}

