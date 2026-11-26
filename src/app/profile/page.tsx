"use client";

/**
 * /profile — Profile Management Page
 *
 * Layout: two-column on desktop (editor left, preview right).
 * All sections read from / write to localStorage via profileStorage.
 * A single CandidateProfile object is the source of truth.
 */

import React, { useState, useCallback } from "react";
import { Eye, EyeOff, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { PersonalInfoForm } from "@/components/profile/PersonalInfoForm";
import { ExperienceManager } from "@/components/profile/ExperienceManager";
import { EducationManager } from "@/components/profile/EducationManager";
import { SkillsManager } from "@/components/profile/SkillsManager";
import { ApplicationPreferencesForm } from "@/components/profile/ApplicationPreferencesForm";
import { ProfilePreview } from "@/components/profile/ProfilePreview";
import {
  useProfile,
  resetProfile,
  computeCompletion,
  setSetupCompleted,
} from "@/lib/storage/profileStorage";
import type { CandidateProfile, PersonalInfo, SocialLinks } from "@/types/profile";

export default function ProfilePage() {
  const [profile, setProfile] = useProfile();
  const [showPreview, setShowPreview] = useState(true);
  const [toast, setToast] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);

  const completion = computeCompletion(profile);

  // Persist profile to localStorage and show toast
  const persist = useCallback(
    (next: CandidateProfile) => {
      setProfile(next);
      setToast(true);
      setTimeout(() => setToast(false), 2500);
    },
    [setProfile]
  );

  function handlePersonalSave(personal: PersonalInfo, social: SocialLinks) {
    persist({ ...profile, personal, social });
    if (personal.firstName.trim() && personal.email.trim()) {
      setSetupCompleted(true);
    }
  }

  function handleExperienceChange(experience: CandidateProfile["experience"]) {
    persist({ ...profile, experience });
  }

  function handleEducationChange(education: CandidateProfile["education"]) {
    persist({ ...profile, education });
  }

  function handleSkillsChange(skills: string[]) {
    persist({ ...profile, skills });
  }

  function handlePreferencesSave(preferences: CandidateProfile["preferences"]) {
    persist({ ...profile, preferences });
  }

  function handleReset() {
    if (!resetConfirm) {
      setResetConfirm(true);
      setTimeout(() => setResetConfirm(false), 3000);
      return;
    }
    resetProfile();
    setResetConfirm(false);
    setToast(true);
    setTimeout(() => setToast(false), 2500);
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200/80 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            My Profile
          </h1>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            Manage your candidate profile — changes are saved automatically to your browser.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Completion indicator */}
          <div className="flex items-center gap-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5">
            <div className="w-20">
              <ProgressBar value={completion} />
            </div>
            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              {completion}% complete
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview((v) => !v)}
            title={showPreview ? "Hide preview" : "Show preview"}
          >
            {showPreview ? <EyeOff size={15} /> : <Eye size={15} />}
            {showPreview ? "Hide preview" : "Preview"}
          </Button>

          <Button
            variant={resetConfirm ? "danger" : "ghost"}
            size="sm"
            onClick={handleReset}
            title="Reset to defaults"
          >
            <RotateCcw size={14} />
            {resetConfirm ? "Confirm reset?" : "Reset"}
          </Button>
        </div>
      </div>

      {/* Main layout: editor + optional preview */}
      <div
        className={`grid gap-6 ${
          showPreview ? "grid-cols-1 xl:grid-cols-[1fr_320px]" : "grid-cols-1"
        }`}
      >
        {/* Editor column */}
        <div className="space-y-5">
          <PersonalInfoForm
            personal={profile.personal}
            social={profile.social}
            onSave={handlePersonalSave}
          />

          <ExperienceManager
            experiences={profile.experience}
            onChange={handleExperienceChange}
          />

          <EducationManager
            education={profile.education}
            onChange={handleEducationChange}
          />

          <SkillsManager
            skills={profile.skills}
            onChange={handleSkillsChange}
          />

          <ApplicationPreferencesForm
            preferences={profile.preferences}
            onSave={handlePreferencesSave}
          />
        </div>

        {/* Preview column */}
        {showPreview && (
          <div className="hidden xl:block">
            <div className="sticky top-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 flex items-center gap-2">
                <Eye size={12} /> Live Preview
              </p>
              <ProfilePreview profile={profile} />
            </div>
          </div>
        )}
      </div>

      {/* Mobile preview (full-width below editor) */}
      {showPreview && (
        <div className="xl:hidden">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 flex items-center gap-2">
            <Eye size={12} /> Live Preview
          </p>
          <ProfilePreview profile={profile} />
        </div>
      )}

      {/* Save toast */}
      <Toast show={toast} message="Profile saved to browser storage ✓" />
    </div>
  );
}
