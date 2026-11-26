"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileUp,
  PenTool,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PersonalInfoForm } from "@/components/profile/PersonalInfoForm";
import { ExperienceManager } from "@/components/profile/ExperienceManager";
import { EducationManager } from "@/components/profile/EducationManager";
import { SkillsManager } from "@/components/profile/SkillsManager";
import { ApplicationPreferencesForm } from "@/components/profile/ApplicationPreferencesForm";
import { EMPTY_PROFILE } from "@/lib/profile/defaultProfile";
import { saveProfile, setSetupCompleted } from "@/lib/storage/profileStorage";
import {
  resumeStorage,
  validatePdfFile,
  formatFileSize,
} from "@/lib/storage/resumeStorage";
import {
  extractTextFromPdfBuffer,
  parseResumeTextToProfile,
} from "@/lib/resume/resumeParser";
import type { CandidateProfile, PersonalInfo, SocialLinks } from "@/types/profile";

type SetupMode = "choose" | "manual" | "resume_upload" | "resume_review";

interface InitialSetupWizardProps {
  initialMode?: "choose" | "manual" | "resume";
  onCompleted?: () => void;
}

const MANUAL_STEPS = [
  "Personal & Links",
  "Experience",
  "Education",
  "Skills",
  "Preferences",
] as const;

export function InitialSetupWizard({
  initialMode = "choose",
  onCompleted,
}: InitialSetupWizardProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [mode, setMode] = useState<SetupMode>(
    initialMode === "manual"
      ? "manual"
      : initialMode === "resume"
        ? "resume_upload"
        : "choose"
  );
  const [manualStep, setManualStep] = useState(0);
  const [draft, setDraft] = useState<CandidateProfile>(() =>
    structuredClone(EMPTY_PROFILE)
  );
  const [selectedPdf, setSelectedPdf] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finishSetup = async (
    finalProfile: CandidateProfile,
    pdfFile: File | null
  ) => {
    setIsSaving(true);
    setError(null);
    try {
      if (pdfFile) {
        await resumeStorage.saveResume(pdfFile, { makeDefault: true });
      }
      saveProfile(finalProfile);
      setSetupCompleted(true);
      if (onCompleted) {
        onCompleted();
      } else {
        router.push("/");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not complete initial setup."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleResumeFilePicked = async (file: File | undefined) => {
    if (!file) return;
    const validation = validatePdfFile(file);
    if (!validation.valid) {
      setError(validation.error ?? "Invalid PDF file.");
      return;
    }

    setError(null);
    setIsParsing(true);
    setSelectedPdf(file);

    try {
      const buffer = await file.arrayBuffer();
      const rawText = await extractTextFromPdfBuffer(buffer);

      let parsed = parseResumeTextToProfile(rawText);

      // Try optional server-side refinement if text was extracted cleanly
      if (rawText.trim().length > 40) {
        try {
          const res = await fetch("/api/ai/parse-resume", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: rawText }),
          });
          if (res.ok) {
            const data = (await res.json()) as { profile?: CandidateProfile };
            if (data.profile) parsed = data.profile;
          }
        } catch {
          // Local deterministic parser already populated `parsed`
        }
      }

      setDraft(parsed);
      setMode("resume_review");
    } catch {
      setError("Could not read PDF file. You can edit all details manually below.");
      setDraft(structuredClone(EMPTY_PROFILE));
      setMode("resume_review");
    } finally {
      setIsParsing(false);
    }
  };

  // ── Screen 1: Choose Setup Method ───────────────────────────────────────────
  if (mode === "choose") {
    return (
      <div className="max-w-3xl mx-auto py-8 space-y-6 animate-in fade-in-50 duration-200">
        <div className="text-center space-y-2">
          <Badge variant="info">First-Time Initial Setup</Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
            Welcome to ApplyMate
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-lg mx-auto">
            Start from a clean slate. Choose how you want to set up your autofill profile for the first time:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Option A: Manual Setup */}
          <Card className="p-6 flex flex-col justify-between border-zinc-200 dark:border-zinc-800 hover:border-blue-500/60 transition-colors">
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <PenTool className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Setup Manually from Scratch
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Step-by-step guided setup for your personal info, experience, education, technical skills, and job preferences.
              </p>
            </div>
            <Button
              className="w-full mt-6 gap-2"
              onClick={() => {
                setDraft(structuredClone(EMPTY_PROFILE));
                setManualStep(0);
                setError(null);
                setMode("manual");
              }}
            >
              <span>Start Manual Setup</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Card>

          {/* Option B: Setup from Resume (PDF) */}
          <Card className="p-6 flex flex-col justify-between border-zinc-200 dark:border-zinc-800 hover:border-emerald-500/60 transition-colors">
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <FileUp className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Setup from PDF Resume
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Upload your PDF resume to extract contact details, links, skills, education, and experience. You review and confirm before saving.
              </p>
            </div>
            <Button
              variant="secondary"
              className="w-full mt-6 gap-2"
              onClick={() => {
                setError(null);
                setMode("resume_upload");
              }}
            >
              <span>Upload PDF Resume</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  // ── Screen 2A: Manual Guided Setup ──────────────────────────────────────────
  if (mode === "manual") {
    const canFinish =
      draft.personal.firstName.trim().length > 0 &&
      draft.personal.email.trim().length > 0;

    return (
      <div className="max-w-3xl mx-auto py-4 space-y-6 animate-in fade-in-50 duration-200">
        <div className="flex items-center justify-between gap-4 pb-3 border-b border-zinc-200/80 dark:border-zinc-800">
          <div>
            <button
              type="button"
              onClick={() => setMode("choose")}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to setup options
            </button>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              Manual Profile Setup ({manualStep + 1} of {MANUAL_STEPS.length})
            </h1>
          </div>
          <div className="flex gap-1.5">
            {MANUAL_STEPS.map((label, idx) => (
              <button
                key={label}
                type="button"
                onClick={() => setManualStep(idx)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                  idx === manualStep
                    ? "bg-blue-600 text-white"
                    : idx < manualStep
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {manualStep === 0 && (
          <PersonalInfoForm
            personal={draft.personal}
            social={draft.social}
            onSave={(personal: PersonalInfo, social: SocialLinks) => {
              setDraft((prev) => ({ ...prev, personal, social }));
              setManualStep(1);
            }}
          />
        )}

        {manualStep === 1 && (
          <div className="space-y-4">
            <ExperienceManager
              experiences={draft.experience}
              onChange={(experience) =>
                setDraft((prev) => ({ ...prev, experience }))
              }
            />
            <div className="flex justify-between">
              <Button variant="outline" size="sm" onClick={() => setManualStep(0)}>
                Back
              </Button>
              <Button size="sm" onClick={() => setManualStep(2)}>
                Next: Education
              </Button>
            </div>
          </div>
        )}

        {manualStep === 2 && (
          <div className="space-y-4">
            <EducationManager
              education={draft.education}
              onChange={(education) =>
                setDraft((prev) => ({ ...prev, education }))
              }
            />
            <div className="flex justify-between">
              <Button variant="outline" size="sm" onClick={() => setManualStep(1)}>
                Back
              </Button>
              <Button size="sm" onClick={() => setManualStep(3)}>
                Next: Skills
              </Button>
            </div>
          </div>
        )}

        {manualStep === 3 && (
          <div className="space-y-4">
            <SkillsManager
              skills={draft.skills}
              onChange={(skills) => setDraft((prev) => ({ ...prev, skills }))}
            />
            <div className="flex justify-between">
              <Button variant="outline" size="sm" onClick={() => setManualStep(2)}>
                Back
              </Button>
              <Button size="sm" onClick={() => setManualStep(4)}>
                Next: Preferences
              </Button>
            </div>
          </div>
        )}

        {manualStep === 4 && (
          <div className="space-y-4">
            <ApplicationPreferencesForm
              preferences={draft.preferences}
              onSave={(preferences) => {
                const updated = { ...draft, preferences };
                setDraft(updated);
                if (!canFinish) {
                  setError("Please enter at least your First Name and Email in Step 1 before finishing.");
                  return;
                }
                finishSetup(updated, null);
              }}
            />
            <div className="flex justify-between items-center">
              <Button variant="outline" size="sm" onClick={() => setManualStep(3)}>
                Back
              </Button>
              <Button
                size="sm"
                disabled={isSaving}
                onClick={() => {
                  if (!canFinish) {
                    setError("Please fill First Name and Email in Step 1 first.");
                    return;
                  }
                  finishSetup(draft, null);
                }}
                className="gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSaving ? "Saving…" : "Finish Manual Setup"}</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Screen 2B: Resume Upload Picker ─────────────────────────────────────────
  if (mode === "resume_upload") {
    return (
      <div className="max-w-xl mx-auto py-8 space-y-6 animate-in fade-in-50 duration-200">
        <button
          type="button"
          onClick={() => setMode("choose")}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to setup options
        </button>

        <Card className="border-dashed border-2">
          <CardContent className="p-8 text-center space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                handleResumeFilePicked(f);
              }}
            />
            <div className="h-14 w-14 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              {isParsing ? (
                <Loader2 className="w-7 h-7 animate-spin" />
              ) : (
                <FileUp className="w-7 h-7" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {isParsing ? "Extracting Profile Details…" : "Select Your PDF Resume"}
              </h2>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                ApplyMate extracts your details locally and shows an editable review screen before saving anything.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-xs text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            <Button
              type="button"
              disabled={isParsing}
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              <FileText className="w-4 h-4" />
              <span>Choose PDF File</span>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Screen 3: Editable Review Before Confirming Resume Import ───────────────
  return (
    <div className="max-w-3xl mx-auto py-4 space-y-6 animate-in fade-in-50 duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-zinc-200/80 dark:border-zinc-800">
        <div>
          <button
            type="button"
            onClick={() => setMode("resume_upload")}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Pick a different PDF
          </button>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            Review Extracted Details Before Saving
          </h1>
          {selectedPdf && (
            <p className="text-xs text-zinc-500 mt-0.5">
              Source PDF: <span className="font-mono">{selectedPdf.name}</span> ({formatFileSize(selectedPdf.size)}) — will be stored locally in IndexedDB.
            </p>
          )}
        </div>

        <Button
          disabled={isSaving}
          onClick={() => {
            if (!draft.personal.firstName.trim() || !draft.personal.email.trim()) {
              setError("Please verify First Name and Email before confirming.");
              return;
            }
            finishSetup(draft, selectedPdf);
          }}
          className="gap-2 shrink-0"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{isSaving ? "Saving…" : "Confirm & Save Setup"}</span>
        </Button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-xs text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <PersonalInfoForm
        personal={draft.personal}
        social={draft.social}
        onSave={(personal, social) =>
          setDraft((prev) => ({ ...prev, personal, social }))
        }
      />

      <ExperienceManager
        experiences={draft.experience}
        onChange={(experience) =>
          setDraft((prev) => ({ ...prev, experience }))
        }
      />

      <EducationManager
        education={draft.education}
        onChange={(education) =>
          setDraft((prev) => ({ ...prev, education }))
        }
      />

      <SkillsManager
        skills={draft.skills}
        onChange={(skills) => setDraft((prev) => ({ ...prev, skills }))}
      />

      <ApplicationPreferencesForm
        preferences={draft.preferences}
        onSave={(preferences) =>
          setDraft((prev) => ({ ...prev, preferences }))
        }
      />
    </div>
  );
}
