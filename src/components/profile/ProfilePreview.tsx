"use client";

/**
 * ProfilePreview — Read-only card showing the full candidate profile
 * exactly as it will appear to employers / in autofill context.
 */

import React from "react";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Globe,
  Briefcase,
  GraduationCap,
  Sparkles,
  Sliders,
} from "lucide-react";
import { LinkedinIcon, GithubIcon } from "@/components/ui/Icons";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { CandidateProfile } from "@/types/profile";
import { formatMonthYear } from "@/utils";

interface ProfilePreviewProps {
  profile: CandidateProfile;
}

export function ProfilePreview({ profile }: ProfilePreviewProps) {
  const { personal, social, experience, education, skills, preferences } = profile;

  return (
    <Card className="overflow-hidden">
      {/* Header gradient */}
      <div className="h-20 bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-500" />

      <CardContent className="pt-0 -mt-10">
        {/* Avatar */}
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white dark:bg-zinc-900 border-4 border-white dark:border-zinc-900 shadow-sm text-blue-600">
          <User size={28} />
        </div>

        {/* Name + title */}
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          {personal.firstName} {personal.lastName}
        </h2>
        <p className="mt-0.5 text-sm font-medium text-blue-600 dark:text-blue-400">
          {personal.professionalTitle}
        </p>

        {/* Contact */}
        <div className="mt-4 space-y-1.5">
          {personal.email && (
            <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <Mail size={13} className="shrink-0 text-zinc-400" />
              {personal.email}
            </div>
          )}
          {personal.phone && (
            <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <Phone size={13} className="shrink-0 text-zinc-400" />
              {personal.phone}
            </div>
          )}
          {personal.location && (
            <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <MapPin size={13} className="shrink-0 text-zinc-400" />
              {personal.location}
            </div>
          )}
        </div>

        {/* Social links */}
        {(social.linkedin || social.github || social.portfolio) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {social.linkedin && (
              <a
                href={social.linkedin}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <LinkedinIcon size={12} /> LinkedIn
              </a>
            )}
            {social.github && (
              <a
                href={social.github}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <GithubIcon size={12} /> GitHub
              </a>
            )}
            {social.portfolio && (
              <a
                href={social.portfolio}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <Globe size={12} /> Portfolio
              </a>
            )}
          </div>
        )}

        {/* Bio */}
        {personal.bio && (
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed border-t border-zinc-100 dark:border-zinc-800 pt-4">
            {personal.bio}
          </p>
        )}

        {/* Experience */}
        {experience.length > 0 && (
          <div className="mt-5 border-t border-zinc-100 dark:border-zinc-800 pt-5">
            <div className="flex items-center gap-2 mb-3">
              <Briefcase size={13} className="text-zinc-400" />
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                Experience
              </p>
            </div>
            <div className="space-y-3">
              {experience.map((exp) => (
                <div key={exp.id}>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {exp.role}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {exp.company} ·{" "}
                    {formatMonthYear(exp.startDate)} —{" "}
                    {exp.current ? "Present" : formatMonthYear(exp.endDate)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Education */}
        {education.length > 0 && (
          <div className="mt-5 border-t border-zinc-100 dark:border-zinc-800 pt-5">
            <div className="flex items-center gap-2 mb-3">
              <GraduationCap size={13} className="text-zinc-400" />
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                Education
              </p>
            </div>
            <div className="space-y-3">
              {education.map((edu) => (
                <div key={edu.id}>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {edu.degree}
                    {edu.fieldOfStudy && ` · ${edu.fieldOfStudy}`}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {edu.institution} ·{" "}
                    {edu.current ? "Ongoing" : formatMonthYear(edu.endDate)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <div className="mt-5 border-t border-zinc-100 dark:border-zinc-800 pt-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={13} className="text-zinc-400" />
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                Skills
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {skills.map((s) => (
                <Badge key={s} variant="default">{s}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Preferences */}
        {preferences && (
          <div className="mt-5 border-t border-zinc-100 dark:border-zinc-800 pt-5">
            <div className="flex items-center gap-2 mb-3">
              <Sliders size={13} className="text-zinc-400" />
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                Preferences
              </p>
            </div>
            <div className="space-y-1.5 text-xs text-zinc-600 dark:text-zinc-400">
              <p>
                <strong className="text-zinc-800 dark:text-zinc-200">Auth:</strong>{" "}
                {preferences.workAuthorization}
              </p>
              <p>
                <strong className="text-zinc-800 dark:text-zinc-200">Notice:</strong>{" "}
                {preferences.noticePeriod}
              </p>
              {preferences.desiredSalary && (
                <p>
                  <strong className="text-zinc-800 dark:text-zinc-200">Desired:</strong>{" "}
                  {preferences.desiredSalary} ({preferences.currency})
                </p>
              )}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {preferences.openToRemote && <Badge variant="info">Remote</Badge>}
                {preferences.willingToRelocate && <Badge variant="default">Relocation</Badge>}
                {!preferences.requiresSponsorship && <Badge variant="success">No Visa Needed</Badge>}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

